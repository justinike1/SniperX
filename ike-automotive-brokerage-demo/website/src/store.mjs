import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { nowIso, makeReference } from "./domain.mjs";

const DEFAULT_SERVICE_CONFIG = {
  services: [
    {
      id: "offer-review",
      name: "Offer Review",
      proposedPriceCents: 14900,
      approvedForPublicPricing: false,
      scopeLimits: "Written review of an existing dealership offer.",
    },
    {
      id: "vehicle-brokerage",
      name: "Vehicle Brokerage",
      proposedPriceCents: 99900,
      approvedForPublicPricing: false,
      scopeLimits: "Vehicle brief, sourcing, dealer coordination, and offer comparison.",
    },
    {
      id: "concierge-coordination",
      name: "Concierge Coordination",
      proposedPriceCents: 149900,
      approvedForPublicPricing: false,
      scopeLimits: "Brokerage support plus expanded handover and delivery coordination.",
    },
  ],
  terms: {
    cancellationRefundPolicyStatus: "Unresolved",
    compensationDisclosureStatus: "Unresolved",
    brokerCompensationRulesStatus: "Unresolved",
  },
};

const DEFAULT_BUSINESS_CONFIG = {
  businessName: "IKE Automotive Group",
  tagline: "Your next car starts here",
  operatingPromise: "The IKE Standard: every deal explained, every client informed.",
  publicContact: {
    phone: "",
    email: "",
    hours: "",
    serviceArea: "",
    domain: "",
  },
  launchChecklist: [
    {
      id: "LAUNCH-001",
      item: "Operating-authority determination",
      status: "Unverified",
      note: "Must be resolved before live brokerage activity or fee collection.",
    },
    {
      id: "LAUNCH-002",
      item: "Transaction responsibility split",
      status: "Unverified",
      note: "Clarify dealer vs IKE responsibilities in signed agreements.",
    },
  ],
};

const DEFAULT_TEAM_PROFILES = [
  {
    id: "TEAM-001",
    name: "Justin Ike",
    role: "Founder",
    bio: "Founder of IKE Automotive Group, focused on clear, accountable deal support.",
    imagePath: "/shared-assets/founder-justin-ike.jpg",
    active: true,
  },
];

function passwordHash(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function defaultUsers() {
  return [
    {
      id: "USR-OWNER-001",
      role: "owner",
      displayName: "IKE Owner",
      email: process.env.IKE_OWNER_EMAIL || "owner@ike.demo",
      passwordHash: passwordHash(process.env.IKE_OWNER_PASSWORD || "owner-demo-pass"),
    },
    {
      id: "USR-MANAGER-001",
      role: "manager",
      displayName: "IKE Manager",
      email: process.env.IKE_MANAGER_EMAIL || "manager@ike.demo",
      passwordHash: passwordHash(process.env.IKE_MANAGER_PASSWORD || "manager-demo-pass"),
    },
    {
      id: "USR-BROKER-001",
      role: "broker",
      displayName: "IKE Broker",
      email: process.env.IKE_BROKER_EMAIL || "broker@ike.demo",
      passwordHash: passwordHash(process.env.IKE_BROKER_PASSWORD || "broker-demo-pass"),
    },
  ];
}

function defaultData() {
  const createdAt = nowIso();
  return {
    schemaVersion: 1,
    createdAt,
    updatedAt: createdAt,
    sequences: {
      inquiry: 1,
      customer: 1,
      case: 1,
      offerFamily: 1,
      task: 1,
      progressLink: 1,
      ledgerEvent: 1,
      activity: 1,
    },
    users: defaultUsers(),
    sessions: [],
    inquiries: [],
    customers: [],
    dealers: [],
    cases: [],
    idempotencyRecords: [],
    serviceConfig: DEFAULT_SERVICE_CONFIG,
    businessConfig: DEFAULT_BUSINESS_CONFIG,
    teamProfiles: DEFAULT_TEAM_PROFILES,
  };
}

export class IKEStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = defaultData();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.save();
      return this.data;
    }

    const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    this.data = {
      ...defaultData(),
      ...parsed,
      sequences: { ...defaultData().sequences, ...(parsed.sequences || {}) },
      serviceConfig: { ...DEFAULT_SERVICE_CONFIG, ...(parsed.serviceConfig || {}) },
      businessConfig: { ...DEFAULT_BUSINESS_CONFIG, ...(parsed.businessConfig || {}) },
      teamProfiles: Array.isArray(parsed.teamProfiles) ? parsed.teamProfiles : DEFAULT_TEAM_PROFILES,
    };
    return this.data;
  }

  save() {
    this.data.updatedAt = nowIso();
    const payload = JSON.stringify(this.data, null, 2);
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, payload);
    fs.renameSync(tmpPath, this.filePath);
  }

  nextSequence(key) {
    const current = Number(this.data.sequences[key] || 1);
    this.data.sequences[key] = current + 1;
    return current;
  }

  makeId(prefix, sequenceKey) {
    return makeReference(prefix, this.nextSequence(sequenceKey));
  }

  findUserByEmail(email) {
    return this.data.users.find((user) => user.email.toLowerCase() === String(email || "").toLowerCase());
  }

  verifyPassword(user, rawPassword) {
    return user?.passwordHash === passwordHash(rawPassword);
  }

  createSession(userId, ttlMinutes = 480) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const session = {
      id: this.makeId("SES", "activity"),
      userId,
      tokenHash,
      createdAt: nowIso(),
      expiresAt,
      revokedAt: "",
    };
    this.data.sessions.push(session);
    this.save();
    return { rawToken, session };
  }

  sessionFromRawToken(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(String(rawToken || "")).digest("hex");
    const session = this.data.sessions.find((item) => item.tokenHash === tokenHash && !item.revokedAt);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) return null;
    const user = this.data.users.find((item) => item.id === session.userId);
    return user ? { session, user } : null;
  }

  appendActivity(caseRecord, actor, action, recordType, recordId, detail = "") {
    const entry = {
      id: this.makeId("ACT", "activity"),
      at: nowIso(),
      actorId: actor?.id || "system",
      actorRole: actor?.role || "system",
      action,
      recordType,
      recordId,
      detail,
    };
    caseRecord.activity.push(entry);
    return entry;
  }

  idempotent(scope, key, producer) {
    if (!key) {
      return { duplicate: false, value: producer() };
    }
    const lookup = this.data.idempotencyRecords.find((item) => item.scope === scope && item.key === key);
    if (lookup) {
      return { duplicate: true, value: lookup.value };
    }
    const value = producer();
    this.data.idempotencyRecords.push({
      id: this.makeId("IDEMP", "activity"),
      scope,
      key,
      createdAt: nowIso(),
      value,
    });
    return { duplicate: false, value };
  }
}

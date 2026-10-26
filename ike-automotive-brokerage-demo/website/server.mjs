import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  CASE_STAGES,
  OFFER_STATES,
  PERMISSION_TYPES,
  ROLES,
  SERVICE_TYPES,
  assertEnum,
  assertOfferState,
  assertStage,
  calculateLeaseScheduledCost,
  compareLeaseOffers,
  fictionalLeaseComparisonExample,
  hashToken,
  nowIso,
  publicCaseView,
  randomToken,
  sanitizeBoolean,
  sanitizeDate,
  sanitizeText,
  toCents,
  todayInTimeZone,
  canAccessCaseByRole,
} from "./src/domain.mjs";
import { IKEStore } from "./src/store.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_PATH = path.join(__dirname, "data", "store.json");
const PORT = Number(process.env.IKE_WEBSITE_PORT || 4290);

const VALID_LEDGER_TYPES = [
  "expected_client_fee",
  "expected_dealer_comp",
  "amount_due",
  "receipt",
  "refund",
  "pass_through_cost",
  "operating_cost",
  "broker_comp_earned",
  "payout_approved",
  "payout_recorded",
];

function moneyField(raw, key, fallback = 0) {
  const value = raw?.[key];
  return Number.isFinite(Number(value)) ? toCents(value) : fallback;
}

function nonEmpty(value, fieldName) {
  const text = sanitizeText(value);
  if (!text) throw new Error(`${fieldName} is required.`);
  return text;
}

function buildStaffCaseView(caseRecord) {
  return {
    ...caseRecord,
    approvedPublishedOffers: (caseRecord.offerFamilies || []).flatMap((family) =>
      family.versions.filter((version) => version.state === "published").map((version) => ({
        familyId: family.id,
        versionNumber: version.versionNumber,
        label: version.label,
      }))
    ),
  };
}

function sanitizeOfferPayload(input) {
  const terms = input?.terms || {};
  const requiredStrings = ["year", "make", "model", "trim"];
  for (const key of requiredStrings) {
    if (!sanitizeText(input?.vehicle?.[key])) throw new Error(`Vehicle ${key} is required.`);
  }

  const sanitized = {
    label: nonEmpty(input?.label, "Offer label"),
    vehicle: {
      year: sanitizeText(input.vehicle.year),
      make: sanitizeText(input.vehicle.make),
      model: sanitizeText(input.vehicle.model),
      trim: sanitizeText(input.vehicle.trim),
      vinOrStock: sanitizeText(input.vehicle.vinOrStock),
    },
    dealerSource: nonEmpty(input?.dealerSource, "Dealer/source"),
    offerDate: sanitizeDate(input?.offerDate) || nowIso(),
    validThrough: sanitizeDate(input?.validThrough),
    availabilityStatus: sanitizeText(input?.availabilityStatus || "Unknown"),
    assumptions: sanitizeText(input?.assumptions),
    eligibilityNotes: sanitizeText(input?.eligibilityNotes),
    taxTreatment: sanitizeText(terms.taxTreatment || "Unknown"),
    incentiveEligibility: sanitizeText(terms.incentiveEligibility || "Unknown"),
    terms: {
      termMonths: Math.max(1, Number(terms.termMonths || 0)),
      annualMileage: Math.max(1, Number(terms.annualMileage || 0)),
      monthlyPaymentCents: moneyField(terms, "monthlyPaymentCents"),
      taxesCents: moneyField(terms, "taxesCents"),
      cashDueAtSigningCents: moneyField(terms, "cashDueAtSigningCents"),
      firstPaymentIncludedAtSigning: sanitizeBoolean(terms.firstPaymentIncludedAtSigning),
      refundableDepositCents: moneyField(terms, "refundableDepositCents"),
      brokerageFeeCents: moneyField(terms, "brokerageFeeCents"),
      dispositionFeeCents: moneyField(terms, "dispositionFeeCents"),
      unknownOrContingentCosts: Array.isArray(terms.unknownOrContingentCosts)
        ? terms.unknownOrContingentCosts.map((item) => sanitizeText(item)).filter(Boolean)
        : [],
      unsupportedStructure: sanitizeText(terms.unsupportedStructure),
    },
  };

  const unsupported = [
    "financing",
    "negative equity",
    "balloon",
    "one-pay",
    "one pay",
    "loan",
  ].find((needle) => sanitized.terms.unsupportedStructure.toLowerCase().includes(needle));
  if (unsupported) {
    throw new Error("Unsupported structure: lease comparison can only be used for supported lease terms.");
  }
  return sanitized;
}

function createApp({ dataPath = DEFAULT_DATA_PATH } = {}) {
  const store = new IKEStore(dataPath);
  store.load();

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use("/shared-assets", express.static(path.join(__dirname, "..", "assets")));
  app.use("/public", express.static(path.join(__dirname, "public")));

  function auth(requiredRoles = []) {
    return (req, res, next) => {
      const header = String(req.headers.authorization || "");
      const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
      const session = store.sessionFromRawToken(token);
      if (!session) {
        return res.status(401).json({ error: "Authentication required." });
      }
      req.auth = session.user;
      if (requiredRoles.length && !requiredRoles.includes(session.user.role)) {
        return res.status(403).json({ error: "Insufficient role." });
      }
      return next();
    };
  }

  function caseByReference(reference) {
    return store.data.cases.find((item) => item.reference === reference);
  }

  function requireCaseAccess(permission = "read") {
    return (req, res, next) => {
      const caseRecord = caseByReference(req.params.caseRef);
      if (!caseRecord) {
        return res.status(404).json({ error: "Case not found." });
      }
      if (!canAccessCaseByRole(req.auth, caseRecord, permission)) {
        return res.status(403).json({ error: "Case access denied." });
      }
      req.caseRecord = caseRecord;
      return next();
    };
  }

  function responseError(res, error) {
    return res.status(400).json({ error: error.message || String(error) });
  }

  function touchCase(caseRecord) {
    caseRecord.updatedAt = nowIso();
    caseRecord.version = Number(caseRecord.version || 0) + 1;
  }

  app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.get("/client-progress/:caseRef", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "progress.html"));
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ike-website",
      dataPath,
      schemaVersion: store.data.schemaVersion,
      cases: store.data.cases.length,
    });
  });

  app.get("/api/public/metadata", (_req, res) => {
    res.json({
      company: store.data.businessConfig,
      services: store.data.serviceConfig.services.map((service) => ({
        id: service.id,
        name: service.name,
        scopeLimits: service.scopeLimits,
      })),
      standards: [
        "Written comparisons",
        "Clear compensation",
        "Accountable broker assignments",
        "Visible next steps",
        "Management review",
        "Dependable follow-up",
      ],
      stageFlow: CASE_STAGES,
      fictionalExample: fictionalLeaseComparisonExample(),
    });
  });

  app.get("/api/public/team", (_req, res) => {
    res.json({
      teamProfiles: (store.data.teamProfiles || []).filter((profile) => profile.active),
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    const user = store.findUserByEmail(email);
    if (!user || !store.verifyPassword(user, password)) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const ttl = Number(process.env.IKE_WEBSITE_SESSION_TTL_MINUTES || 8 * 60);
    const { rawToken, session } = store.createSession(user.id, ttl);
    return res.json({
      token: rawToken,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        role: user.role,
        displayName: user.displayName,
        email: user.email,
      },
    });
  });

  app.post("/api/inquiries/start", (req, res) => {
    try {
      const body = req.body || {};
      const idempotencyKey = String(req.headers["idempotency-key"] || body.idempotencyKey || "");
      const scope = "inquiry_start";
      const outcome = store.idempotent(scope, idempotencyKey, () => {
        const inquiry = {
          id: store.makeId("INQ", "inquiry"),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          status: "started",
          contact: {
            name: nonEmpty(body.name, "Name"),
            email: nonEmpty(body.email, "Email"),
            phone: nonEmpty(body.phone, "Phone"),
          },
          summary: {
            vehicleInterest: nonEmpty(body.vehicleInterest, "Vehicle interest"),
            budgetCents: moneyField(body, "budgetCents"),
            timing: "",
            location: "",
            servicePreference: "Vehicle Brokerage",
          },
          consent: {
            inquiry_contact: false,
            ongoing_service: false,
            promotional_marketing: false,
          },
          stage: "step1",
        };
        store.data.inquiries.push(inquiry);
        store.save();
        return {
          inquiryId: inquiry.id,
          status: inquiry.status,
        };
      });
      return res.status(outcome.duplicate ? 200 : 201).json({
        duplicate: outcome.duplicate,
        ...outcome.value,
      });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.post("/api/inquiries/:inquiryId/complete", (req, res) => {
    try {
      const inquiry = store.data.inquiries.find((item) => item.id === req.params.inquiryId);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found." });
      if (inquiry.status === "completed") {
        return res.status(409).json({ error: "Inquiry already completed." });
      }

      const body = req.body || {};
      assertEnum(body.servicePreference || "Vehicle Brokerage", SERVICE_TYPES, "Service preference");
      for (const permissionType of PERMISSION_TYPES) {
        inquiry.consent[permissionType] = sanitizeBoolean(body?.consent?.[permissionType]);
      }
      inquiry.summary = {
        ...inquiry.summary,
        timing: nonEmpty(body.timing, "Timing"),
        location: nonEmpty(body.location, "Location"),
        servicePreference: body.servicePreference || "Vehicle Brokerage",
      };
      inquiry.updatedAt = nowIso();
      inquiry.status = "completed";
      inquiry.stage = "step2";

      const existingCustomer = store.data.customers.find(
        (customer) =>
          customer.email.toLowerCase() === inquiry.contact.email.toLowerCase() ||
          customer.phone === inquiry.contact.phone
      );
      const customer =
        existingCustomer ||
        {
          id: store.makeId("CUS", "customer"),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          name: inquiry.contact.name,
          email: inquiry.contact.email,
          phone: inquiry.contact.phone,
          contactHistory: [],
          inquiries: [],
          permissionHistory: [],
        };

      customer.updatedAt = nowIso();
      customer.inquiries.push(inquiry.id);
      customer.permissionHistory.push({
        id: store.makeId("PRM", "activity"),
        at: nowIso(),
        permissions: { ...inquiry.consent },
        source: "inquiry",
      });
      if (!existingCustomer) {
        store.data.customers.push(customer);
      }

      const caseRecord = {
        id: store.makeId("CASE", "case"),
        reference: store.makeId("IKE", "case"),
        customerId: customer.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: 1,
        stage: "Inquiry",
        assignedBrokerId: "",
        assignedBrokerName: "",
        managerCoverageId: "",
        servicePreference: inquiry.summary.servicePreference,
        nextAction: "Assign broker and schedule first update.",
        nextClientUpdateAt: "",
        clientUpdateCadence: "Not set",
        internalNotes: [],
        clientUpdates: [
          {
            id: store.makeId("UPD", "activity"),
            at: nowIso(),
            message: "Inquiry received. Broker assignment pending.",
          },
        ],
        vehicleBrief: {
          requiredFeatures: [],
          flexibleFeatures: [],
          initialCashLimitCents: 0,
          leaseTermMonths: null,
          annualMileage: null,
          tradeIn: "",
          existingLeaseEndDate: "",
          priorities: [],
        },
        scopeVersions: [],
        sourcingRecords: [],
        offerFamilies: [],
        decisions: [],
        deliveryChecklist: [],
        financialEvents: [],
        tasks: [],
        followUpPreferences: [],
        consentPreferences: { ...inquiry.consent },
        activity: [],
      };
      store.appendActivity(
        caseRecord,
        { id: "public", role: "public" },
        "inquiry_completed",
        "case",
        caseRecord.reference,
        "Inquiry converted to managed case."
      );
      store.data.cases.push(caseRecord);
      store.save();
      return res.status(201).json({
        inquiryId: inquiry.id,
        caseReference: caseRecord.reference,
        message: "Inquiry saved and case created.",
      });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.get("/api/cases", auth(ROLES), (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const search = String(req.query.search || "").toLowerCase();
    const stage = String(req.query.stage || "");

    let rows = store.data.cases.filter((caseRecord) => canAccessCaseByRole(req.auth, caseRecord, "read"));
    if (stage) rows = rows.filter((caseRecord) => caseRecord.stage === stage);
    if (search) {
      rows = rows.filter((caseRecord) => {
        const customer = store.data.customers.find((item) => item.id === caseRecord.customerId);
        const text = [
          caseRecord.reference,
          customer?.name || "",
          customer?.email || "",
          caseRecord.nextAction,
          caseRecord.assignedBrokerName,
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(search);
      });
    }

    const total = rows.length;
    const offset = (page - 1) * pageSize;
    const paged = rows.slice(offset, offset + pageSize).map((caseRecord) => {
      const customer = store.data.customers.find((item) => item.id === caseRecord.customerId);
      return {
        reference: caseRecord.reference,
        stage: caseRecord.stage,
        assignedBrokerName: caseRecord.assignedBrokerName || "",
        nextAction: caseRecord.nextAction,
        nextClientUpdateAt: caseRecord.nextClientUpdateAt,
        customer: customer
          ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
          : null,
        version: caseRecord.version,
        updatedAt: caseRecord.updatedAt,
      };
    });

    return res.json({
      total,
      page,
      pageSize,
      items: paged,
    });
  });

  app.get("/api/cases/:caseRef", auth(ROLES), requireCaseAccess("read"), (req, res) => {
    const customer = store.data.customers.find((item) => item.id === req.caseRecord.customerId);
    return res.json({
      case: buildStaffCaseView(req.caseRecord),
      customer,
    });
  });

  app.post("/api/cases/:caseRef/assign", auth(["owner", "manager"]), requireCaseAccess("assignment"), (req, res) => {
    try {
      const { expectedVersion, brokerUserId, managerCoverageId } = req.body || {};
      if (Number(expectedVersion) !== Number(req.caseRecord.version)) {
        return res.status(409).json({ error: "Version conflict. Refresh case before assignment." });
      }
      const broker = store.data.users.find((user) => user.id === brokerUserId && user.role === "broker");
      if (!broker) return res.status(400).json({ error: "Broker user is required." });
      const manager = store.data.users.find((user) => user.id === managerCoverageId && user.role === "manager");
      if (!manager && managerCoverageId) {
        return res.status(400).json({ error: "Manager coverage must be a valid manager user." });
      }
      req.caseRecord.assignedBrokerId = broker.id;
      req.caseRecord.assignedBrokerName = broker.displayName;
      req.caseRecord.managerCoverageId = manager?.id || req.auth.id;
      req.caseRecord.stage = "Assignment";
      req.caseRecord.nextAction = "Create written vehicle brief and confirm scope.";
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "case_assignment",
        "case",
        req.caseRecord.reference,
        `Assigned broker ${broker.displayName}.`
      );
      store.save();
      return res.json({ case: req.caseRecord });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.patch("/api/cases/:caseRef/core", auth(ROLES), requireCaseAccess("case_update"), (req, res) => {
    try {
      const body = req.body || {};
      if (Number(body.expectedVersion) !== Number(req.caseRecord.version)) {
        return res.status(409).json({ error: "Version conflict. Refresh case before updating." });
      }
      if (body.stage) {
        assertStage(body.stage);
        req.caseRecord.stage = body.stage;
      }
      if (body.nextAction) req.caseRecord.nextAction = sanitizeText(body.nextAction);
      if ("nextClientUpdateAt" in body) req.caseRecord.nextClientUpdateAt = sanitizeDate(body.nextClientUpdateAt);
      if ("clientUpdateCadence" in body) req.caseRecord.clientUpdateCadence = sanitizeText(body.clientUpdateCadence);
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "case_core_update",
        "case",
        req.caseRecord.reference,
        "Core case fields updated."
      );
      store.save();
      return res.json({ case: req.caseRecord });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.post("/api/cases/:caseRef/internal-notes", auth(ROLES), requireCaseAccess("add_internal_note"), (req, res) => {
    const note = nonEmpty(req.body?.note, "Internal note");
    const entry = {
      id: store.makeId("NOTE", "activity"),
      at: nowIso(),
      authorId: req.auth.id,
      text: note,
    };
    req.caseRecord.internalNotes.unshift(entry);
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "internal_note_added", "note", entry.id, "");
    store.save();
    return res.status(201).json({ note: entry, caseVersion: req.caseRecord.version });
  });

  app.post("/api/cases/:caseRef/client-updates", auth(ROLES), requireCaseAccess("add_client_update"), (req, res) => {
    const message = nonEmpty(req.body?.message, "Client update message");
    const entry = {
      id: store.makeId("UPD", "activity"),
      at: nowIso(),
      authorId: req.auth.id,
      message,
    };
    req.caseRecord.clientUpdates.unshift(entry);
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "client_update_added", "client_update", entry.id, "");
    store.save();
    return res.status(201).json({ clientUpdate: entry, caseVersion: req.caseRecord.version });
  });

  app.post("/api/cases/:caseRef/vehicle-brief", auth(ROLES), requireCaseAccess("vehicle_brief"), (req, res) => {
    const body = req.body || {};
    req.caseRecord.vehicleBrief = {
      requiredFeatures: Array.isArray(body.requiredFeatures) ? body.requiredFeatures.map(sanitizeText).filter(Boolean) : [],
      flexibleFeatures: Array.isArray(body.flexibleFeatures) ? body.flexibleFeatures.map(sanitizeText).filter(Boolean) : [],
      initialCashLimitCents: moneyField(body, "initialCashLimitCents"),
      leaseTermMonths: body.leaseTermMonths ? Number(body.leaseTermMonths) : null,
      annualMileage: body.annualMileage ? Number(body.annualMileage) : null,
      tradeIn: sanitizeText(body.tradeIn),
      existingLeaseEndDate: sanitizeDate(body.existingLeaseEndDate),
      priorities: Array.isArray(body.priorities) ? body.priorities.map(sanitizeText).filter(Boolean) : [],
    };
    req.caseRecord.stage = "Vehicle Brief";
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "vehicle_brief_recorded", "case", req.caseRecord.reference, "");
    store.save();
    return res.json({ vehicleBrief: req.caseRecord.vehicleBrief });
  });

  app.post("/api/cases/:caseRef/scope-versions", auth(ROLES), requireCaseAccess("scope"), (req, res) => {
    try {
      const body = req.body || {};
      const serviceType = nonEmpty(body.serviceType, "Service type");
      assertEnum(serviceType, SERVICE_TYPES, "Service type");
      const version = {
        id: store.makeId("SCOP", "activity"),
        versionNumber: (req.caseRecord.scopeVersions?.length || 0) + 1,
        createdAt: nowIso(),
        createdBy: req.auth.id,
        serviceType,
        agreedFeeCents: moneyField(body, "agreedFeeCents"),
        paymentTiming: sanitizeText(body.paymentTiming),
        compensationDisclosure: sanitizeText(body.compensationDisclosure),
        exclusions: Array.isArray(body.exclusions) ? body.exclusions.map(sanitizeText).filter(Boolean) : [],
        engagementStatus: sanitizeText(body.engagementStatus || "draft"),
      };
      req.caseRecord.scopeVersions.push(version);
      req.caseRecord.stage = "Scope";
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "scope_version_added",
        "scope",
        version.id,
        `Scope version ${version.versionNumber} created.`
      );
      store.save();
      return res.status(201).json({ scopeVersion: version });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.post("/api/cases/:caseRef/sourcing-records", auth(ROLES), requireCaseAccess("sourcing"), (req, res) => {
    const body = req.body || {};
    const entry = {
      id: store.makeId("SRC", "activity"),
      createdAt: nowIso(),
      sourceType: nonEmpty(body.sourceType, "Source type"),
      dealerId: sanitizeText(body.dealerId),
      vehicleLabel: nonEmpty(body.vehicleLabel, "Vehicle label"),
      availabilityCheckedAt: sanitizeDate(body.availabilityCheckedAt) || nowIso(),
      conditions: sanitizeText(body.conditions),
      expiresAt: sanitizeDate(body.expiresAt),
      imageRightsStatus: sanitizeText(body.imageRightsStatus || "unverified"),
      status: sanitizeText(body.status || "active"),
    };
    req.caseRecord.sourcingRecords.push(entry);
    req.caseRecord.stage = "Sourcing";
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "sourcing_record_added", "sourcing", entry.id, "");
    store.save();
    return res.status(201).json({ sourcingRecord: entry });
  });

  app.post("/api/cases/:caseRef/offers", auth(ROLES), requireCaseAccess("offer_draft"), (req, res) => {
    try {
      const payload = sanitizeOfferPayload(req.body || {});
      const family = {
        id: store.makeId("OFF", "offerFamily"),
        createdAt: nowIso(),
        createdBy: req.auth.id,
        versions: [
          {
            id: store.makeId("OFV", "activity"),
            versionNumber: 1,
            state: "draft",
            label: payload.label,
            vehicle: payload.vehicle,
            dealerSource: payload.dealerSource,
            offerDate: payload.offerDate,
            validThrough: payload.validThrough,
            availabilityStatus: payload.availabilityStatus,
            assumptions: payload.assumptions,
            eligibilityNotes: payload.eligibilityNotes,
            terms: payload.terms,
            comparison: calculateLeaseScheduledCost(payload.terms),
            approvedBy: "",
            approvedAt: "",
            approvalNote: "",
            publishedAt: "",
            withdrawnAt: "",
            actorHistory: [
              {
                at: nowIso(),
                actorId: req.auth.id,
                action: "created",
              },
            ],
          },
        ],
      };
      req.caseRecord.offerFamilies.push(family);
      req.caseRecord.stage = "Offer Review";
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "offer_draft_created",
        "offer_family",
        family.id,
        `Offer draft ${family.id} v1 created.`
      );
      store.save();
      return res.status(201).json({ offerFamily: family });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.post(
    "/api/cases/:caseRef/offers/:offerFamilyId/revise",
    auth(ROLES),
    requireCaseAccess("offer_draft"),
    (req, res) => {
      try {
        const family = req.caseRecord.offerFamilies.find((item) => item.id === req.params.offerFamilyId);
        if (!family) return res.status(404).json({ error: "Offer family not found." });
        const latest = family.versions[family.versions.length - 1];
        const payload = sanitizeOfferPayload(req.body || {});
        const version = {
          ...latest,
          id: store.makeId("OFV", "activity"),
          versionNumber: latest.versionNumber + 1,
          state: "draft",
          label: payload.label,
          vehicle: payload.vehicle,
          dealerSource: payload.dealerSource,
          offerDate: payload.offerDate,
          validThrough: payload.validThrough,
          availabilityStatus: payload.availabilityStatus,
          assumptions: payload.assumptions,
          eligibilityNotes: payload.eligibilityNotes,
          terms: payload.terms,
          comparison: calculateLeaseScheduledCost(payload.terms),
          approvedBy: "",
          approvedAt: "",
          approvalNote: "",
          publishedAt: "",
          withdrawnAt: "",
          actorHistory: [
            ...(latest.actorHistory || []),
            { at: nowIso(), actorId: req.auth.id, action: "revised" },
          ],
        };
        family.versions.push(version);
        req.caseRecord.stage = "Offer Review";
        touchCase(req.caseRecord);
        store.appendActivity(
          req.caseRecord,
          req.auth,
          "offer_version_revised",
          "offer_version",
          version.id,
          `Created revision v${version.versionNumber}.`
        );
        store.save();
        return res.status(201).json({ offerVersion: version });
      } catch (error) {
        return responseError(res, error);
      }
    }
  );

  app.post(
    "/api/cases/:caseRef/offers/:offerFamilyId/versions/:versionNumber/approve",
    auth(["owner", "manager"]),
    requireCaseAccess("offer_approve"),
    (req, res) => {
      const family = req.caseRecord.offerFamilies.find((item) => item.id === req.params.offerFamilyId);
      if (!family) return res.status(404).json({ error: "Offer family not found." });
      const version = family.versions.find(
        (item) => Number(item.versionNumber) === Number(req.params.versionNumber)
      );
      if (!version) return res.status(404).json({ error: "Offer version not found." });
      if (version.state !== "draft") {
        return res.status(409).json({ error: "Only draft versions can be approved." });
      }
      version.state = "approved";
      version.approvedBy = req.auth.id;
      version.approvedAt = nowIso();
      version.approvalNote = sanitizeText(req.body?.approvalNote);
      req.caseRecord.stage = "Management Review";
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "offer_approved",
        "offer_version",
        version.id,
        `Approved offer version v${version.versionNumber}.`
      );
      store.save();
      return res.json({ offerVersion: version });
    }
  );

  app.post(
    "/api/cases/:caseRef/offers/:offerFamilyId/versions/:versionNumber/publish",
    auth(["owner", "manager"]),
    requireCaseAccess("offer_publish"),
    (req, res) => {
      const family = req.caseRecord.offerFamilies.find((item) => item.id === req.params.offerFamilyId);
      if (!family) return res.status(404).json({ error: "Offer family not found." });
      const version = family.versions.find(
        (item) => Number(item.versionNumber) === Number(req.params.versionNumber)
      );
      if (!version) return res.status(404).json({ error: "Offer version not found." });
      if (version.state !== "approved") {
        return res.status(409).json({ error: "Only approved versions can be published." });
      }
      version.state = "published";
      version.publishedAt = nowIso();
      req.caseRecord.stage = "Client Decision";
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "offer_published",
        "offer_version",
        version.id,
        `Published offer version v${version.versionNumber}.`
      );
      store.save();
      return res.json({ offerVersion: version });
    }
  );

  app.post(
    "/api/cases/:caseRef/offers/:offerFamilyId/versions/:versionNumber/state",
    auth(["owner", "manager"]),
    requireCaseAccess("offer_publish"),
    (req, res) => {
      const family = req.caseRecord.offerFamilies.find((item) => item.id === req.params.offerFamilyId);
      if (!family) return res.status(404).json({ error: "Offer family not found." });
      const version = family.versions.find(
        (item) => Number(item.versionNumber) === Number(req.params.versionNumber)
      );
      if (!version) return res.status(404).json({ error: "Offer version not found." });
      try {
        const nextState = req.body?.state;
        assertOfferState(nextState);
        if (nextState === "draft") {
          return res.status(400).json({ error: "State endpoint cannot move version back to draft." });
        }
        version.state = nextState;
        if (nextState === "withdrawn") version.withdrawnAt = nowIso();
        if (nextState === "expired") version.expiredAt = nowIso();
        touchCase(req.caseRecord);
        store.appendActivity(
          req.caseRecord,
          req.auth,
          "offer_state_changed",
          "offer_version",
          version.id,
          `Offer set to ${nextState}.`
        );
        store.save();
        return res.json({ offerVersion: version });
      } catch (error) {
        return responseError(res, error);
      }
    }
  );

  app.get("/api/cases/:caseRef/offers/compare", auth(ROLES), requireCaseAccess("read"), (req, res) => {
    const rows = (req.caseRecord.offerFamilies || []).flatMap((family) =>
      family.versions
        .filter((version) => ["draft", "approved", "published"].includes(version.state))
        .map((version) => ({
          id: `${family.id}-v${version.versionNumber}`,
          label: version.label,
          terms: {
            ...version.terms,
            taxTreatment: version.terms.taxTreatment,
            incentiveEligibility: version.terms.incentiveEligibility,
          },
          unknownCosts: version.terms.unknownOrContingentCosts,
        }))
    );
    return res.json(compareLeaseOffers(rows));
  });

  app.post("/api/cases/:caseRef/decisions", auth(ROLES), requireCaseAccess("case_update"), (req, res) => {
    const body = req.body || {};
    const family = req.caseRecord.offerFamilies.find((item) => item.id === body.offerFamilyId);
    if (!family) return res.status(404).json({ error: "Offer family not found." });
    const version = family.versions.find((item) => Number(item.versionNumber) === Number(body.versionNumber));
    if (!version) return res.status(404).json({ error: "Offer version not found." });
    const decision = {
      id: store.makeId("DEC", "activity"),
      at: nowIso(),
      actorId: req.auth.id,
      actorRole: req.auth.role,
      offerFamilyId: family.id,
      offerVersionNumber: version.versionNumber,
      response: nonEmpty(body.response, "Decision response"),
      note: sanitizeText(body.note),
      source: "staff",
    };
    req.caseRecord.decisions.unshift(decision);
    req.caseRecord.stage = "Delivery Coordination";
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "decision_recorded", "decision", decision.id, "");
    store.save();
    return res.status(201).json({ decision });
  });

  app.post(
    "/api/cases/:caseRef/progress-links",
    auth(["owner", "manager"]),
    requireCaseAccess("progress_link_issue"),
    (req, res) => {
      const ttlHours = Number(process.env.IKE_WEBSITE_PROGRESS_LINK_TTL_HOURS || 24 * 14);
      const token = randomToken(32);
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
      const link = {
        id: store.makeId("PRG", "progressLink"),
        createdAt: nowIso(),
        createdBy: req.auth.id,
        tokenHash,
        expiresAt,
        revokedAt: "",
      };
      req.caseRecord.progressLinks = req.caseRecord.progressLinks || [];
      req.caseRecord.progressLinks.push(link);
      touchCase(req.caseRecord);
      store.appendActivity(req.caseRecord, req.auth, "progress_link_created", "progress_link", link.id, "");
      store.save();

      const baseUrl =
        process.env.IKE_WEBSITE_PUBLIC_URL || `http://127.0.0.1:${process.env.IKE_WEBSITE_PORT || PORT}`;
      return res.status(201).json({
        id: link.id,
        expiresAt,
        progressUrl: `${baseUrl}/client-progress/${req.caseRecord.reference}#access_token=${token}`,
      });
    }
  );

  app.post(
    "/api/cases/:caseRef/progress-links/:linkId/revoke",
    auth(["owner", "manager"]),
    requireCaseAccess("progress_link_issue"),
    (req, res) => {
      const links = req.caseRecord.progressLinks || [];
      const link = links.find((item) => item.id === req.params.linkId);
      if (!link) return res.status(404).json({ error: "Progress link not found." });
      link.revokedAt = nowIso();
      touchCase(req.caseRecord);
      store.appendActivity(req.caseRecord, req.auth, "progress_link_revoked", "progress_link", link.id, "");
      store.save();
      return res.json({ revoked: true, linkId: link.id, revokedAt: link.revokedAt });
    }
  );

  app.post(
    "/api/cases/:caseRef/progress-links/:linkId/renew",
    auth(["owner", "manager"]),
    requireCaseAccess("progress_link_issue"),
    (req, res) => {
      const links = req.caseRecord.progressLinks || [];
      const link = links.find((item) => item.id === req.params.linkId);
      if (!link) return res.status(404).json({ error: "Progress link not found." });
      link.revokedAt = nowIso();
      const ttlHours = Number(process.env.IKE_WEBSITE_PROGRESS_LINK_TTL_HOURS || 24 * 14);
      const token = randomToken(32);
      const tokenHash = hashToken(token);
      const replacement = {
        id: store.makeId("PRG", "progressLink"),
        createdAt: nowIso(),
        createdBy: req.auth.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        revokedAt: "",
      };
      links.push(replacement);
      touchCase(req.caseRecord);
      store.appendActivity(
        req.caseRecord,
        req.auth,
        "progress_link_renewed",
        "progress_link",
        replacement.id,
        `Old link ${link.id} invalidated.`
      );
      store.save();
      const baseUrl =
        process.env.IKE_WEBSITE_PUBLIC_URL || `http://127.0.0.1:${process.env.IKE_WEBSITE_PORT || PORT}`;
      return res.json({
        oldLinkId: link.id,
        newLinkId: replacement.id,
        progressUrl: `${baseUrl}/client-progress/${req.caseRecord.reference}#access_token=${token}`,
        expiresAt: replacement.expiresAt,
      });
    }
  );

  function resolveProgressAccess(caseRef, token) {
    const caseRecord = caseByReference(caseRef);
    if (!caseRecord) return { status: 404, error: "missing_link" };
    if (!token) return { status: 401, error: "missing_token" };
    const hashed = hashToken(token);
    const link = (caseRecord.progressLinks || []).find((item) => item.tokenHash === hashed);
    if (!link) return { status: 401, error: "invalid_link" };
    if (link.revokedAt) return { status: 410, error: "revoked_link" };
    if (new Date(link.expiresAt).getTime() < Date.now()) return { status: 410, error: "expired_link" };
    return { status: 200, caseRecord, link };
  }

  app.get("/api/client-progress/:caseRef", (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.set("Pragma", "no-cache");
    res.set("Referrer-Policy", "no-referrer");
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    const result = resolveProgressAccess(req.params.caseRef, token);
    if (result.status !== 200) {
      return res.status(result.status).json({
        error: result.error,
        message:
          result.error === "expired_link"
            ? "Your private access link has expired."
            : result.error === "revoked_link"
              ? "Your private access link has been replaced."
              : result.error === "missing_link"
                ? "Case reference not found."
                : "Private access token is required.",
      });
    }
    return res.json({
      case: publicCaseView(result.caseRecord),
      leaseExample: fictionalLeaseComparisonExample(),
    });
  });

  app.post("/api/client-progress/:caseRef/decision", (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.set("Pragma", "no-cache");
    res.set("Referrer-Policy", "no-referrer");
    try {
      const token = String(req.headers.authorization || "").startsWith("Bearer ")
        ? String(req.headers.authorization).slice("Bearer ".length)
        : "";
      const access = resolveProgressAccess(req.params.caseRef, token);
      if (access.status !== 200) return res.status(access.status).json({ error: access.error });

      const body = req.body || {};
      const family = access.caseRecord.offerFamilies.find((item) => item.id === body.offerFamilyId);
      if (!family) return res.status(404).json({ error: "Offer not found." });
      const version = family.versions.find((item) => Number(item.versionNumber) === Number(body.versionNumber));
      if (!version) return res.status(404).json({ error: "Offer version not found." });
      if (version.state !== "published") {
        return res.status(409).json({ error: "Only published offers can receive client decisions." });
      }

      const response = nonEmpty(body.response, "Decision response");
      const decision = {
        id: store.makeId("DEC", "activity"),
        at: nowIso(),
        actorId: "client_progress_link",
        actorRole: "client",
        offerFamilyId: family.id,
        offerVersionNumber: version.versionNumber,
        response,
        note: sanitizeText(body.note),
        source: "client_progress",
      };
      access.caseRecord.decisions.unshift(decision);
      access.caseRecord.stage = "Delivery Coordination";
      touchCase(access.caseRecord);
      store.appendActivity(
        access.caseRecord,
        { id: "client_progress_link", role: "client" },
        "client_decision_recorded",
        "decision",
        decision.id,
        ""
      );
      store.save();
      return res.status(201).json({ decision });
    } catch (error) {
      return responseError(res, error);
    }
  });

  app.post("/api/cases/:caseRef/delivery-checklist", auth(ROLES), requireCaseAccess("case_update"), (req, res) => {
    const body = req.body || {};
    const checklistEntry = {
      id: store.makeId("DLV", "activity"),
      at: nowIso(),
      actorId: req.auth.id,
      schedulingStatus: sanitizeText(body.schedulingStatus),
      requiredDealerDocuments: Array.isArray(body.requiredDealerDocuments)
        ? body.requiredDealerDocuments.map(sanitizeText).filter(Boolean)
        : [],
      handoverStatus: sanitizeText(body.handoverStatus),
      outcome: sanitizeText(body.outcome),
    };
    req.caseRecord.deliveryChecklist.push(checklistEntry);
    req.caseRecord.stage = "Delivery Coordination";
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "delivery_checklist_updated", "delivery", checklistEntry.id, "");
    store.save();
    return res.status(201).json({ deliveryChecklistEntry: checklistEntry });
  });

  app.post(
    "/api/cases/:caseRef/financial-events",
    auth(["owner", "manager"]),
    requireCaseAccess("financial_reconcile"),
    (req, res) => {
      try {
        const body = req.body || {};
        const type = nonEmpty(body.type, "Financial event type");
        assertEnum(type, VALID_LEDGER_TYPES, "Financial event type");
        const scope = `financial_event_${req.caseRecord.reference}`;
        const idempotencyKey = String(req.headers["idempotency-key"] || body.idempotencyKey || "");
        const result = store.idempotent(scope, idempotencyKey, () => {
          const event = {
            id: store.makeId("LED", "ledgerEvent"),
            at: nowIso(),
            actorId: req.auth.id,
            type,
            amountCents: moneyField(body, "amountCents"),
            note: sanitizeText(body.note),
            relatedTaskId: sanitizeText(body.relatedTaskId),
            relatedOfferFamilyId: sanitizeText(body.relatedOfferFamilyId),
          };
          req.caseRecord.financialEvents.push(event);
          req.caseRecord.stage = "Fee Reconciliation";
          touchCase(req.caseRecord);
          store.appendActivity(
            req.caseRecord,
            req.auth,
            "financial_event_recorded",
            "financial_event",
            event.id,
            type
          );
          store.save();
          return event;
        });
        return res.status(result.duplicate ? 200 : 201).json({
          duplicate: result.duplicate,
          event: result.value,
        });
      } catch (error) {
        return responseError(res, error);
      }
    }
  );

  app.get("/api/finance/summary", auth(["owner", "manager"]), (req, res) => {
    const totals = {
      expectedClientFeesCents: 0,
      expectedDealerCompCents: 0,
      amountsDueCents: 0,
      receiptsCents: 0,
      refundsCents: 0,
      passThroughCostsCents: 0,
      operatingCostsCents: 0,
      brokerCompEarnedCents: 0,
      payoutApprovedCents: 0,
      payoutRecordedCents: 0,
    };

    for (const caseRecord of store.data.cases) {
      if (!canAccessCaseByRole(req.auth, caseRecord, "read")) continue;
      for (const event of caseRecord.financialEvents || []) {
        if (event.type === "expected_client_fee") totals.expectedClientFeesCents += event.amountCents;
        if (event.type === "expected_dealer_comp") totals.expectedDealerCompCents += event.amountCents;
        if (event.type === "amount_due") totals.amountsDueCents += event.amountCents;
        if (event.type === "receipt") totals.receiptsCents += event.amountCents;
        if (event.type === "refund") totals.refundsCents += event.amountCents;
        if (event.type === "pass_through_cost") totals.passThroughCostsCents += event.amountCents;
        if (event.type === "operating_cost") totals.operatingCostsCents += event.amountCents;
        if (event.type === "broker_comp_earned") totals.brokerCompEarnedCents += event.amountCents;
        if (event.type === "payout_approved") totals.payoutApprovedCents += event.amountCents;
        if (event.type === "payout_recorded") totals.payoutRecordedCents += event.amountCents;
      }
    }

    return res.json({ totals });
  });

  app.post("/api/cases/:caseRef/tasks", auth(ROLES), requireCaseAccess("task_create"), (req, res) => {
    const body = req.body || {};
    const task = {
      id: store.makeId("TSK", "task"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ownerId: nonEmpty(body.ownerId || req.auth.id, "Task owner"),
      priority: sanitizeText(body.priority || "normal"),
      dueAt: sanitizeDate(body.dueAt),
      title: nonEmpty(body.title, "Task title"),
      outcome: "",
      completedAt: "",
      status: "open",
    };
    req.caseRecord.tasks.push(task);
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "task_created", "task", task.id, "");
    store.save();
    return res.status(201).json({ task });
  });

  app.post("/api/cases/:caseRef/tasks/:taskId/complete", auth(ROLES), requireCaseAccess("task_create"), (req, res) => {
    const task = req.caseRecord.tasks.find((item) => item.id === req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found." });
    task.status = "completed";
    task.completedAt = nowIso();
    task.outcome = sanitizeText(req.body?.outcome);
    task.updatedAt = nowIso();
    touchCase(req.caseRecord);
    store.appendActivity(req.caseRecord, req.auth, "task_completed", "task", task.id, "");
    store.save();
    return res.json({ task });
  });

  app.get("/api/tasks/view", auth(ROLES), (req, res) => {
    const tz = "America/New_York";
    const today = todayInTimeZone(tz);
    const bucket = String(req.query.bucket || "all");
    const tasks = [];
    for (const caseRecord of store.data.cases) {
      if (!canAccessCaseByRole(req.auth, caseRecord, "read")) continue;
      for (const task of caseRecord.tasks || []) {
        const dueDate = task.dueAt ? task.dueAt.slice(0, 10) : "";
        let include = true;
        if (bucket === "overdue") include = task.status !== "completed" && dueDate && dueDate < today;
        if (bucket === "today") include = task.status !== "completed" && dueDate === today;
        if (bucket === "upcoming") include = task.status !== "completed" && dueDate && dueDate > today;
        if (bucket === "calendar") include = !!dueDate;
        if (include) tasks.push({ ...task, caseReference: caseRecord.reference });
      }
    }
    return res.json({ bucket, timezone: tz, today, tasks });
  });

  app.post("/api/dealers", auth(["owner", "manager"]), (req, res) => {
    const body = req.body || {};
    const dealer = {
      id: store.makeId("DLR", "activity"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      legalName: nonEmpty(body.legalName, "Dealer legal name"),
      makes: Array.isArray(body.makes) ? body.makes.map(sanitizeText).filter(Boolean) : [],
      coverageArea: sanitizeText(body.coverageArea),
      authorizedContacts: Array.isArray(body.authorizedContacts)
        ? body.authorizedContacts.map((item) => ({
            name: sanitizeText(item.name),
            title: sanitizeText(item.title),
            phone: sanitizeText(item.phone),
            email: sanitizeText(item.email),
            notes: sanitizeText(item.notes),
          }))
        : [],
      communicationHistory: [],
      quoteSources: [],
    };
    store.data.dealers.push(dealer);
    store.save();
    return res.status(201).json({ dealer });
  });

  app.get("/api/dealers", auth(ROLES), (_req, res) => {
    return res.json({ dealers: store.data.dealers });
  });

  app.get("/api/config/internal", auth(["owner", "manager"]), (_req, res) => {
    return res.json({
      serviceConfig: store.data.serviceConfig,
      businessConfig: store.data.businessConfig,
      roleModel: {
        owner: "Business settings, access management, and financial oversight.",
        manager: "Assignment, coverage, escalation, and proposal approval.",
        broker: "Assigned case execution and updates.",
        client: "Limited private progress access only.",
      },
      disclaimers: [
        "Live charges, payouts, credit submissions, and dealer outreach are disabled.",
        "Operating-authority questions remain tracked in launch checklist until resolved.",
      ],
    });
  });

  app.patch("/api/config/internal", auth(["owner"]), (req, res) => {
    const body = req.body || {};
    if (body.serviceConfig) {
      store.data.serviceConfig = {
        ...store.data.serviceConfig,
        ...body.serviceConfig,
      };
    }
    if (body.businessConfig) {
      store.data.businessConfig = {
        ...store.data.businessConfig,
        ...body.businessConfig,
      };
    }
    store.save();
    return res.json({ updated: true });
  });

  app.get("/api/example/lease-comparison", (_req, res) => {
    return res.json(fictionalLeaseComparisonExample());
  });

  return { app, store };
}

function startServer() {
  const dataPath = process.env.IKE_WEBSITE_DATA_PATH || DEFAULT_DATA_PATH;
  const { app } = createApp({ dataPath });
  app.listen(PORT, () => {
    console.log(`[ike-website] listening on :${PORT}`);
    console.log(`[ike-website] data file: ${dataPath}`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

export { createApp, startServer };

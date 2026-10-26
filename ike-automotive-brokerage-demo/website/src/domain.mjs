import crypto from "node:crypto";

export const CASE_STAGES = [
  "Inquiry",
  "Assignment",
  "Vehicle Brief",
  "Scope",
  "Sourcing",
  "Offer Review",
  "Management Review",
  "Client Decision",
  "Delivery Coordination",
  "Fee Reconciliation",
  "Aftercare",
];

export const OFFER_STATES = [
  "draft",
  "approved",
  "published",
  "withdrawn",
  "expired",
];

export const SERVICE_TYPES = [
  "Offer Review",
  "Vehicle Brokerage",
  "Concierge Coordination",
];

export const PERMISSION_TYPES = [
  "inquiry_contact",
  "ongoing_service",
  "promotional_marketing",
];

export const ROLES = ["owner", "manager", "broker"];

export function nowIso() {
  return new Date().toISOString();
}

export function toCents(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error("Money value must be numeric.");
  return Math.round(numeric);
}

export function centsFromDollars(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error("Dollar value must be numeric.");
  return Math.round(numeric * 100);
}

export function dollarsFromCents(value) {
  return Number((Number(value || 0) / 100).toFixed(2));
}

export function formatCurrencyFromCents(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(dollarsFromCents(value));
}

export function makeReference(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

export function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
  }
}

export function assertStage(value) {
  assertEnum(value, CASE_STAGES, "Case stage");
}

export function assertOfferState(value) {
  assertEnum(value, OFFER_STATES, "Offer state");
}

export function sanitizeText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

export function sanitizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function sanitizeDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function publicCaseView(caseRecord) {
  const publishedOffers = (caseRecord.offerFamilies || [])
    .flatMap((family) => family.versions.map((version) => ({ ...version, familyId: family.id })))
    .filter((version) => version.state === "published")
    .map((version) => ({
      familyId: version.familyId,
      versionNumber: version.versionNumber,
      label: version.label,
      assumptions: version.assumptions,
      comparison: version.comparison,
      publishedAt: version.publishedAt,
      validThrough: version.validThrough || "",
      status: version.state,
    }));

  return {
    reference: caseRecord.reference,
    stage: caseRecord.stage,
    assignedBrokerName: caseRecord.assignedBrokerName || "Pending assignment",
    nextAction: caseRecord.nextAction,
    nextClientUpdateAt: caseRecord.nextClientUpdateAt,
    clientUpdates: caseRecord.clientUpdates || [],
    publishedOffers,
    decisions: caseRecord.decisions || [],
    followUpPreferences: caseRecord.followUpPreferences || [],
  };
}

export function canAccessCaseByRole(user, caseRecord, permission) {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (user.role === "manager") return true;
  if (user.role !== "broker") return false;

  if (permission === "read") {
    return caseRecord.assignedBrokerId === user.id;
  }

  if (
    [
      "case_update",
      "add_internal_note",
      "add_client_update",
      "vehicle_brief",
      "scope",
      "sourcing",
      "offer_draft",
      "task_create",
    ].includes(permission)
  ) {
    return caseRecord.assignedBrokerId === user.id;
  }

  if (
    [
      "assignment",
      "offer_approve",
      "offer_publish",
      "financial_reconcile",
      "progress_link_issue",
      "payout_record",
    ].includes(permission)
  ) {
    return false;
  }

  return false;
}

export function calculateLeaseScheduledCost(offerTerms) {
  const monthlyPaymentCents = toCents(offerTerms.monthlyPaymentCents || 0);
  const termMonths = Math.max(1, Number(offerTerms.termMonths || 0));
  const cashDueAtSigningCents = toCents(offerTerms.cashDueAtSigningCents || 0);
  const firstPaymentIncludedAtSigning = !!offerTerms.firstPaymentIncludedAtSigning;
  const refundableDepositCents = toCents(offerTerms.refundableDepositCents || 0);
  const brokerageFeeCents = toCents(offerTerms.brokerageFeeCents || 0);
  const dispositionFeeCents = toCents(offerTerms.dispositionFeeCents || 0);

  const firstPaymentAlreadyCounted = firstPaymentIncludedAtSigning ? monthlyPaymentCents : 0;
  const nonRefundableSigningCents = Math.max(
    0,
    cashDueAtSigningCents - firstPaymentAlreadyCounted - refundableDepositCents
  );

  const scheduledCostCents =
    monthlyPaymentCents * termMonths +
    nonRefundableSigningCents +
    brokerageFeeCents +
    dispositionFeeCents;

  const requiredCashAtSigningCents = cashDueAtSigningCents + refundableDepositCents;

  return {
    monthlyPaymentCents,
    termMonths,
    scheduledCostCents,
    nonRefundableSigningCents,
    requiredCashAtSigningCents,
    refundableDepositCents,
    brokerageFeeCents,
    dispositionFeeCents,
    firstPaymentAlreadyCountedCents: firstPaymentAlreadyCounted,
  };
}

export function compareLeaseOffers(offers) {
  const mismatches = [];
  const rows = (offers || []).map((offer) => {
    const cost = calculateLeaseScheduledCost(offer.terms);
    return {
      ...offer,
      computed: cost,
      unknownCosts: offer.unknownCosts || [],
    };
  });

  if (rows.length >= 2) {
    const baseline = rows[0];
    for (const field of ["termMonths", "annualMileage", "taxTreatment", "incentiveEligibility"]) {
      for (const row of rows.slice(1)) {
        if (JSON.stringify(row.terms?.[field]) !== JSON.stringify(baseline.terms?.[field])) {
          mismatches.push(field);
          break;
        }
      }
    }
  }

  return {
    rows,
    mismatches: [...new Set(mismatches)],
  };
}

export function fictionalLeaseComparisonExample() {
  const offers = [
    {
      id: "EXAMPLE-A",
      label: "Offer A",
      terms: {
        termMonths: 36,
        annualMileage: 12000,
        monthlyPaymentCents: 59900,
        cashDueAtSigningCents: 299900,
        firstPaymentIncludedAtSigning: true,
        refundableDepositCents: 0,
        brokerageFeeCents: 50000,
        dispositionFeeCents: 39500,
        taxTreatment: "tax on payment",
        incentiveEligibility: "standard lease incentives",
      },
      unknownCosts: [],
    },
    {
      id: "EXAMPLE-B",
      label: "Offer B",
      terms: {
        termMonths: 36,
        annualMileage: 12000,
        monthlyPaymentCents: 64900,
        cashDueAtSigningCents: 64900,
        firstPaymentIncludedAtSigning: true,
        refundableDepositCents: 0,
        brokerageFeeCents: 50000,
        dispositionFeeCents: 39500,
        taxTreatment: "tax on payment",
        incentiveEligibility: "standard lease incentives",
      },
      unknownCosts: [],
    },
  ];

  const comparison = compareLeaseOffers(offers);
  return {
    exampleLabel:
      "Fictional example only: includes a $500 brokerage fee assumption for illustration and not approved IKE pricing.",
    comparison,
    explanation:
      "Offer B is $600 lower in scheduled cost because its due-at-signing amount is $2,350 lower while both examples keep the same brokerage/disposition assumptions.",
  };
}

export function todayInTimeZone(timeZone, isoNow = nowIso()) {
  const now = new Date(isoNow);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

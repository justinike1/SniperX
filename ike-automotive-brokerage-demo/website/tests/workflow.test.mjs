import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server.mjs";

function parseToken(progressUrl) {
  const [, fragment = ""] = String(progressUrl).split("#");
  const params = new URLSearchParams(fragment);
  return params.get("access_token") || "";
}

async function startHarness() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ike-website-test-"));
  const dataPath = path.join(dataDir, "store.json");
  const { app } = createApp({ dataPath });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  async function request(url, options = {}) {
    const response = await fetch(`${base}${url}`, options);
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload };
  }

  async function login(email, password) {
    const result = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(result.status, 200);
    return result.payload.token;
  }

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  return { request, login, close };
}

test("full fictional workflow with role controls, private progress, offers, and reconciliation", async () => {
  const harness = await startHarness();
  const { request, login, close } = harness;
  try {
    const step1 = await request("/api/inquiries/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "inq-1-step1",
      },
      body: JSON.stringify({
        name: "Client Alpha",
        email: "alpha@example.test",
        phone: "555-1000",
        vehicleInterest: "Lease midsize SUV",
        budgetCents: 4200000,
      }),
    });
    assert.equal(step1.status, 201);
    const inquiryId = step1.payload.inquiryId;

    const completed = await request(`/api/inquiries/${inquiryId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timing: "Within 30 days",
        location: "New Jersey",
        servicePreference: "Vehicle Brokerage",
        consent: {
          inquiry_contact: true,
          ongoing_service: true,
          promotional_marketing: false,
        },
      }),
    });
    assert.equal(completed.status, 201);
    const caseRef = completed.payload.caseReference;

    const ownerToken = await login("owner@ike.demo", "owner-demo-pass");
    const managerToken = await login("manager@ike.demo", "manager-demo-pass");
    const brokerToken = await login("broker@ike.demo", "broker-demo-pass");

    const casesView = await request("/api/cases", {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(casesView.status, 200);
    assert.equal(casesView.payload.items.length, 1);
    const expectedVersion = casesView.payload.items[0].version;

    const assignment = await request(`/api/cases/${caseRef}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedVersion,
        brokerUserId: "USR-BROKER-001",
        managerCoverageId: "USR-MANAGER-001",
      }),
    });
    assert.equal(assignment.status, 200);

    const versionConflict = await request(`/api/cases/${caseRef}/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedVersion,
        brokerUserId: "USR-BROKER-001",
      }),
    });
    assert.equal(versionConflict.status, 409);

    const briefSaved = await request(`/api/cases/${caseRef}/vehicle-brief`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${brokerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requiredFeatures: ["AWD", "Safety package"],
        flexibleFeatures: ["Panoramic roof"],
        initialCashLimitCents: 300000,
        leaseTermMonths: 36,
        annualMileage: 12000,
        priorities: ["Total scheduled cost", "Cargo space"],
      }),
    });
    assert.equal(briefSaved.status, 200);

    const offerDraft = await request(`/api/cases/${caseRef}/offers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${brokerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: "Primary dealer option",
        vehicle: {
          year: "2026",
          make: "Example",
          model: "Atlas",
          trim: "Premium",
          vinOrStock: "EXM123",
        },
        dealerSource: "Sample Dealer A",
        offerDate: "2026-10-20T00:00:00.000Z",
        validThrough: "2026-10-31T00:00:00.000Z",
        availabilityStatus: "In stock",
        assumptions: "Tax on payment, 12k/yr.",
        eligibilityNotes: "Tier 1 credit assumed.",
        terms: {
          termMonths: 36,
          annualMileage: 12000,
          monthlyPaymentCents: 59900,
          taxesCents: 0,
          cashDueAtSigningCents: 299900,
          firstPaymentIncludedAtSigning: true,
          refundableDepositCents: 0,
          brokerageFeeCents: 50000,
          dispositionFeeCents: 39500,
          taxTreatment: "tax on payment",
          incentiveEligibility: "all customers",
          unknownOrContingentCosts: ["registration estimate pending"],
        },
      }),
    });
    assert.equal(offerDraft.status, 201);
    const familyId = offerDraft.payload.offerFamily.id;

    const approve = await request(`/api/cases/${caseRef}/offers/${familyId}/versions/1/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approvalNote: "Ready for client review." }),
    });
    assert.equal(approve.status, 200);

    const publish = await request(`/api/cases/${caseRef}/offers/${familyId}/versions/1/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(publish.status, 200);

    const revised = await request(`/api/cases/${caseRef}/offers/${familyId}/revise`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${brokerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: "Primary dealer option revised",
        vehicle: {
          year: "2026",
          make: "Example",
          model: "Atlas",
          trim: "Premium",
          vinOrStock: "EXM123",
        },
        dealerSource: "Sample Dealer A",
        offerDate: "2026-10-21T00:00:00.000Z",
        validThrough: "2026-10-31T00:00:00.000Z",
        availabilityStatus: "In stock",
        assumptions: "Revised incentive assumptions.",
        eligibilityNotes: "Tier 1 credit assumed.",
        terms: {
          termMonths: 36,
          annualMileage: 12000,
          monthlyPaymentCents: 58900,
          taxesCents: 0,
          cashDueAtSigningCents: 289900,
          firstPaymentIncludedAtSigning: true,
          refundableDepositCents: 0,
          brokerageFeeCents: 50000,
          dispositionFeeCents: 39500,
          taxTreatment: "tax on payment",
          incentiveEligibility: "all customers",
          unknownOrContingentCosts: [],
        },
      }),
    });
    assert.equal(revised.status, 201);
    assert.equal(revised.payload.offerVersion.versionNumber, 2);
    assert.equal(revised.payload.offerVersion.state, "draft");

    const progressLink = await request(`/api/cases/${caseRef}/progress-links`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(progressLink.status, 201);
    const clientToken = parseToken(progressLink.payload.progressUrl);
    assert.ok(clientToken.length > 20);

    const privateView = await request(`/api/client-progress/${caseRef}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.equal(privateView.status, 200);
    assert.equal(privateView.payload.case.reference, caseRef);
    assert.equal(privateView.payload.case.publishedOffers.length, 1);
    assert.equal(privateView.payload.case.internalNotes, undefined);

    const clientDecision = await request(`/api/client-progress/${caseRef}/decision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offerFamilyId: familyId,
        versionNumber: 1,
        response: "accept",
        note: "Proceed with this option.",
      }),
    });
    assert.equal(clientDecision.status, 201);

    const ledgerA = await request(`/api/cases/${caseRef}/financial-events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "ledger-receipt-1",
      },
      body: JSON.stringify({
        type: "receipt",
        amountCents: 99900,
        note: "Collected brokerage fee.",
      }),
    });
    assert.equal(ledgerA.status, 201);
    assert.equal(ledgerA.payload.duplicate, false);

    const ledgerB = await request(`/api/cases/${caseRef}/financial-events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${managerToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "ledger-receipt-1",
      },
      body: JSON.stringify({
        type: "receipt",
        amountCents: 99900,
        note: "Duplicate should not create new row.",
      }),
    });
    assert.equal(ledgerB.status, 200);
    assert.equal(ledgerB.payload.duplicate, true);

    const financeSummary = await request("/api/finance/summary", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(financeSummary.status, 200);
    assert.equal(financeSummary.payload.totals.receiptsCents, 99900);

    const renew = await request(`/api/cases/${caseRef}/progress-links/${progressLink.payload.id}/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(renew.status, 200);
    const newToken = parseToken(renew.payload.progressUrl);
    assert.notEqual(newToken, clientToken);

    const oldTokenBlocked = await request(`/api/client-progress/${caseRef}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assert.equal(oldTokenBlocked.status, 410);

    const newTokenWorks = await request(`/api/client-progress/${caseRef}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    assert.equal(newTokenWorks.status, 200);
  } finally {
    await close();
  }
});

test("broker cannot access unassigned case and revoked links are blocked", async () => {
  const harness = await startHarness();
  const { request, login, close } = harness;
  try {
    const first = await request("/api/inquiries/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Client Beta",
        email: "beta@example.test",
        phone: "555-2200",
        vehicleInterest: "Compact sedan",
        budgetCents: 2500000,
      }),
    });
    assert.equal(first.status, 201);
    const completed = await request(`/api/inquiries/${first.payload.inquiryId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timing: "This month",
        location: "NJ",
        servicePreference: "Offer Review",
        consent: {
          inquiry_contact: true,
          ongoing_service: true,
          promotional_marketing: false,
        },
      }),
    });
    assert.equal(completed.status, 201);
    const caseRef = completed.payload.caseReference;

    const managerToken = await login("manager@ike.demo", "manager-demo-pass");
    const brokerToken = await login("broker@ike.demo", "broker-demo-pass");

    const denied = await request(`/api/cases/${caseRef}`, {
      headers: { Authorization: `Bearer ${brokerToken}` },
    });
    assert.equal(denied.status, 403);

    const link = await request(`/api/cases/${caseRef}/progress-links`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(link.status, 201);
    const token = parseToken(link.payload.progressUrl);

    const revoke = await request(`/api/cases/${caseRef}/progress-links/${link.payload.id}/revoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(revoke.status, 200);

    const revokedRead = await request(`/api/client-progress/${caseRef}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(revokedRead.status, 410);
  } finally {
    await close();
  }
});

test("fictional lease comparison example math is stable", async () => {
  const harness = await startHarness();
  const { request, close } = harness;
  try {
    const response = await request("/api/example/lease-comparison");
    assert.equal(response.status, 200);
    const rows = response.payload.comparison.rows;
    const a = rows.find((row) => row.id === "EXAMPLE-A");
    const b = rows.find((row) => row.id === "EXAMPLE-B");
    assert.equal(a.computed.scheduledCostCents, 2485900);
    assert.equal(b.computed.scheduledCostCents, 2425900);
    assert.equal(a.computed.scheduledCostCents - b.computed.scheduledCostCents, 60000);
  } finally {
    await close();
  }
});

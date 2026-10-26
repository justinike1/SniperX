function byId(id) {
  return document.getElementById(id);
}

function setFlash(message, tone = "warning") {
  const node = byId("progressFlash");
  if (!node) return;
  node.className = tone === "success" ? "success" : "warning";
  node.textContent = message;
}

function parseFragmentToken() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return params.get("access_token") || "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function renderProgress(payload) {
  const target = byId("progressContent");
  if (!target) return;
  const record = payload.case;
  const offers = record.publishedOffers || [];
  const updates = record.clientUpdates || [];
  const decisions = record.decisions || [];
  target.innerHTML = `
    <p><strong>Reference:</strong> ${escapeHtml(record.reference)}</p>
    <p><strong>Stage:</strong> ${escapeHtml(record.stage)}</p>
    <p><strong>Assigned broker:</strong> ${escapeHtml(record.assignedBrokerName || "Pending")}</p>
    <p><strong>Next step:</strong> ${escapeHtml(record.nextAction || "")}</p>
    <p><strong>Next expected update:</strong> ${escapeHtml(record.nextClientUpdateAt || "Not set")}</p>

    <h3>Client-facing updates</h3>
    ${
      updates.length
        ? `<ul>${updates
            .map((update) => `<li><strong>${escapeHtml(update.at)}:</strong> ${escapeHtml(update.message)}</li>`)
            .join("")}</ul>`
        : "<p>No client updates yet.</p>"
    }

    <h3>Approved and published offers</h3>
    ${
      offers.length
        ? `<ul>${offers
            .map(
              (offer) =>
                `<li><strong>${escapeHtml(offer.label)}</strong> (v${offer.versionNumber}) · published ${escapeHtml(
                  offer.publishedAt || "n/a"
                )}</li>`
            )
            .join("")}</ul>`
        : "<p>No published offers available yet.</p>"
    }

    <h3>Recorded decisions</h3>
    ${
      decisions.length
        ? `<ul>${decisions
            .map(
              (decision) =>
                `<li>${escapeHtml(decision.at)} · ${escapeHtml(decision.response)} · offer ${escapeHtml(
                  decision.offerFamilyId
                )} v${escapeHtml(decision.offerVersionNumber)}</li>`
            )
            .join("")}</ul>`
        : "<p>No decision recorded yet.</p>"
    }
  `;
}

async function fetchProgress() {
  const caseRef = String(byId("caseRefInput")?.value || "").trim();
  const token = String(byId("tokenInput")?.value || "").trim();
  if (!caseRef) {
    setFlash("Case reference is required.");
    return;
  }
  if (!token) {
    setFlash("Private access token is required.");
    return;
  }

  const response = await fetch(`/api/client-progress/${encodeURIComponent(caseRef)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload.message ||
      (payload.error === "expired_link"
        ? "This link expired. Ask your broker for renewal."
        : payload.error === "revoked_link"
          ? "This link was replaced. Use the latest link from your broker."
          : "Unable to load case progress.");
    setFlash(message);
    return;
  }

  renderProgress(payload);
  setFlash("Private case progress loaded.", "success");
}

function initialize() {
  const tokenFromHash = parseFragmentToken();
  if (tokenFromHash) {
    const tokenInput = byId("tokenInput");
    if (tokenInput) tokenInput.value = tokenFromHash;
  }

  const caseRefFromPath = window.location.pathname.split("/").filter(Boolean).pop() || "";
  const caseRefInput = byId("caseRefInput");
  if (caseRefInput && caseRefFromPath && caseRefFromPath !== "client-progress") {
    caseRefInput.value = caseRefFromPath;
  }

  byId("loadProgress")?.addEventListener("click", () => {
    fetchProgress().catch((error) => setFlash(error.message || "Unable to load progress."));
  });
}

initialize();

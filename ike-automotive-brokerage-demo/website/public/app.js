function byId(id) {
  return document.getElementById(id);
}

function setFlash(node, message, tone = "warning") {
  node.className = tone === "success" ? "success" : "warning";
  node.textContent = message;
}

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function renderTeamProfiles(profiles) {
  const node = byId("teamProfiles");
  if (!node) return;
  if (!profiles.length) {
    node.innerHTML =
      '<article class="card"><h3>Team profile placeholder</h3><p>Founder profile image or details are missing in this environment.</p></article>';
    return;
  }
  node.innerHTML = profiles
    .map(
      (profile) => `
      <article class="team-card">
        <img src="${profile.imagePath || ""}" alt="${profile.name || "Team member"}">
        <div>
          <span class="badge">${profile.role || "Team"}</span>
          <h3>${profile.name || "Unnamed profile"}</h3>
          <p>${profile.bio || ""}</p>
        </div>
      </article>
    `
    )
    .join("");
}

function wireTwoStepInquiry() {
  const step1 = byId("inquiryStep1");
  const step2 = byId("inquiryStep2");
  const flash = byId("inquiryFlash");
  const back = byId("backToStep1");
  if (!step1 || !step2 || !flash || !back) return;

  back.addEventListener("click", () => {
    step2.classList.remove("active");
    step1.classList.add("active");
  });

  step1.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(step1);
    const payload = Object.fromEntries(formData);
    payload.budgetCents = Number(payload.budgetCents || 0);
    try {
      const result = await getJson("/api/inquiries/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `step1-${payload.email}-${payload.phone}-${payload.vehicleInterest}`,
        },
        body: JSON.stringify(payload),
      });
      step2.querySelector('input[name="inquiryId"]').value = result.inquiryId;
      setFlash(flash, "Step 1 saved. Continue with service details.", "success");
      step1.classList.remove("active");
      step2.classList.add("active");
    } catch (error) {
      setFlash(flash, error.message || "Unable to save inquiry step 1.");
    }
  });

  step2.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(step2);
    const inquiryId = String(formData.get("inquiryId") || "");
    if (!inquiryId) {
      setFlash(flash, "Missing inquiry id. Please complete step 1 again.");
      return;
    }
    const payload = {
      timing: String(formData.get("timing") || ""),
      location: String(formData.get("location") || ""),
      servicePreference: String(formData.get("servicePreference") || "Vehicle Brokerage"),
      contactPreference: String(formData.get("contactPreference") || ""),
      consent: {
        inquiry_contact: formData.get("consentInquiryContact") === "on",
        ongoing_service: formData.get("consentOngoingService") === "on",
        promotional_marketing: formData.get("consentPromotionalMarketing") === "on",
      },
    };
    try {
      const result = await getJson(`/api/inquiries/${encodeURIComponent(inquiryId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setFlash(
        flash,
        `Inquiry saved successfully. Reference: ${result.caseReference}. Private progress link will be provided by your broker.`,
        "success"
      );
      step2.reset();
      step1.reset();
      step2.classList.remove("active");
      step1.classList.add("active");
    } catch (error) {
      setFlash(flash, error.message || "Unable to complete inquiry.");
    }
  });
}

async function hydratePublicData() {
  try {
    const [team, metadata] = await Promise.all([
      getJson("/api/public/team"),
      getJson("/api/public/metadata"),
    ]);
    renderTeamProfiles(team.teamProfiles || []);
    const serviceCards = byId("serviceCards");
    if (serviceCards && Array.isArray(metadata.services)) {
      serviceCards.innerHTML = metadata.services
        .map(
          (service) => `
        <article class="card">
          <h3>${service.name}</h3>
          <p>${service.scopeLimits}</p>
          <p class="small">Pricing and final terms remain under internal approval.</p>
        </article>
      `
        )
        .join("");
    }
  } catch (error) {
    const node = byId("teamProfiles");
    if (node) {
      node.innerHTML = `<article class="card"><h3>Unable to load team profiles</h3><p>${error.message}</p></article>`;
    }
  }
}

hydratePublicData();
wireTwoStepInquiry();

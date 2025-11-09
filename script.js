(function () {
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("nav__links--open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("nav__links--open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const leadForm = document.getElementById("leadForm");
  const formStatus = document.getElementById("leadFormStatus");
  if (leadForm) {
    const endpoint = (leadForm.dataset.endpoint || "").trim();
    leadForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = leadForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      const formData = new FormData(leadForm);
      const payload = Object.fromEntries(formData.entries());
      payload.sms_consent = leadForm.querySelector("#smsConsent")?.checked || false;
      payload.channel = "web_form";
      payload.timestamp = new Date().toISOString();

      let delivered = false;
      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          delivered = response.ok;
        } catch (error) {
          console.warn("Lead submission failed, caching locally", error);
        }
      }

      if (!delivered) {
        try {
          const cached = JSON.parse(
            localStorage.getItem("leadSubmissions") || "[]"
          );
          cached.push(payload);
          localStorage.setItem("leadSubmissions", JSON.stringify(cached));
        } catch (cacheError) {
          console.warn("Unable to cache lead submission", cacheError);
        }
      }

      if (formStatus) {
        formStatus.textContent = delivered
          ? "Thanks! A concierge will text you shortly."
          : "Thanks! We logged your consent and will text you from our concierge number.";
      }

      leadForm.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    });
  }
})();

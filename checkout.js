(function () {
  "use strict";

  var API_BASE = "https://api.aiwolfsolutions.com";
  var btn = document.getElementById("checkoutBtn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Redirecting to checkout…";

    fetch(API_BASE + "/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Server error " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      })
      .catch(function (err) {
        console.error("Checkout error:", err);
        btn.disabled = false;
        btn.textContent = "Get Started";
        alert(
          "Something went wrong starting checkout. Please try again or contact andrew@aiwolfsolutions.com"
        );
      });
  });
})();

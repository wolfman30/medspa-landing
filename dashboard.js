(function () {
  const form = document.getElementById("dashboardForm");
  if (!form) return;

  const apiBaseEl = document.getElementById("dashboardApiBase");
  const orgIdEl = document.getElementById("dashboardOrgId");
  const jwtEl = document.getElementById("dashboardJwt");
  const daysEl = document.getElementById("dashboardDays");
  const statusEl = document.getElementById("dashboardStatus");
  const clearTokenBtn = document.getElementById("dashboardClearToken");
  const demoModeBtn = document.getElementById("dashboardDemoMode");

  const kpiMissedCallsEl = document.getElementById("kpiMissedCalls");
  const kpiPaidDepositsEl = document.getElementById("kpiPaidDeposits");
  const kpiConversionEl = document.getElementById("kpiConversion");
  const kpiP95El = document.getElementById("kpiP95");

  const dailyChartEl = document.getElementById("dailyChart");
  const latencyChartEl = document.getElementById("latencyChart");
  const dailyChartMetaEl = document.getElementById("dailyChartMeta");
  const latencyChartMetaEl = document.getElementById("latencyChartMeta");

  const storageKeys = {
    apiBase: "opsDashboard.apiBase",
    orgId: "opsDashboard.orgId",
    days: "opsDashboard.days",
    jwt: "opsDashboard.jwt",
  };

  // Check for Cognito auth integration
  function getCognitoAuth() {
    if (typeof window.MedspaAuth !== "undefined" && window.MedspaAuth.isLoggedIn()) {
      const tokens = window.MedspaAuth.getTokens();
      const config = window.MedspaAuth.getConfig();
      return {
        jwt: tokens.idToken || tokens.accessToken,
        apiBase: config.apiBaseUrl,
        orgId: config.orgId,
        email: tokens.email,
      };
    }
    return null;
  }

  function getQueryParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        apiBase: params.get("api") || "",
        orgId: params.get("org") || "",
        days: params.get("days") || "",
      };
    } catch {
      return { apiBase: "", orgId: "", days: "" };
    }
  }

  function sanitizeApiBase(input) {
    return (input || "").trim().replace(/\/+$/, "");
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#b91c1c" : "";
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKeys.apiBase, apiBaseEl.value.trim());
      localStorage.setItem(storageKeys.orgId, orgIdEl.value.trim());
      localStorage.setItem(storageKeys.days, daysEl.value.trim());
      sessionStorage.setItem(storageKeys.jwt, jwtEl.value.trim());
    } catch (err) {
      console.warn("Unable to save dashboard settings", err);
    }
  }

  function loadSettings() {
    const qp = getQueryParams();
    const cognitoAuth = getCognitoAuth();

    try {
      // Prefer Cognito auth values, then query params, then localStorage
      if (cognitoAuth) {
        apiBaseEl.value = cognitoAuth.apiBase || localStorage.getItem(storageKeys.apiBase) || "https://api.aiwolfsolutions.com";
        orgIdEl.value = cognitoAuth.orgId || localStorage.getItem(storageKeys.orgId) || "default-org";
        jwtEl.value = cognitoAuth.jwt || "";
        // Mark JWT field as auto-filled from Cognito
        if (cognitoAuth.jwt && jwtEl) {
          jwtEl.placeholder = `Signed in as ${cognitoAuth.email || "user"}`;
          jwtEl.disabled = true;
        }
      } else {
        apiBaseEl.value =
          qp.apiBase ||
          localStorage.getItem(storageKeys.apiBase) ||
          "https://api-dev.aiwolfsolutions.com";
        orgIdEl.value =
          qp.orgId || localStorage.getItem(storageKeys.orgId) || "default-org";
        jwtEl.value = sessionStorage.getItem(storageKeys.jwt) || "";
      }
      daysEl.value = qp.days || localStorage.getItem(storageKeys.days) || "7";
    } catch {
      apiBaseEl.value = qp.apiBase || "https://api-dev.aiwolfsolutions.com";
      orgIdEl.value = qp.orgId || "default-org";
      daysEl.value = qp.days || "7";
    }
  }

  function numberToString(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString();
  }

  function msToString(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${Math.round(n).toLocaleString()} ms`;
  }

  function pctToString(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)}%`;
  }

  function clearSvg(svg) {
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function svgNode(tag, attrs) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        node.setAttribute(key, String(value));
      });
    }
    return node;
  }

  function formatSeconds(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n)) return "";
    if (n < 1) return `${n.toFixed(2)}s`;
    if (n < 10) return `${n.toFixed(1)}s`;
    return `${Math.round(n)}s`;
  }

  function renderDailyChart(days, metaLabel) {
    if (!dailyChartEl) return;
    clearSvg(dailyChartEl);

    const width = 800;
    const height = 260;
    const pad = { left: 55, top: 20, right: 20, bottom: 42 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const points = Array.isArray(days) ? days : [];
    const valuesMissed = points.map((p) => Number(p.missed_call_leads) || 0);
    const valuesPaid = points.map((p) => Number(p.paid_leads) || 0);
    const maxY = Math.max(1, ...valuesMissed, ...valuesPaid);

    dailyChartEl.appendChild(
      svgNode("rect", {
        x: 0,
        y: 0,
        width,
        height,
        fill: "#ffffff",
        rx: 14,
        ry: 14,
      })
    );

    dailyChartEl.appendChild(
      svgNode("line", {
        x1: pad.left,
        y1: height - pad.bottom,
        x2: width - pad.right,
        y2: height - pad.bottom,
        stroke: "rgba(15,23,42,0.25)",
        "stroke-width": 1,
      })
    );
    dailyChartEl.appendChild(
      svgNode("line", {
        x1: pad.left,
        y1: pad.top,
        x2: pad.left,
        y2: height - pad.bottom,
        stroke: "rgba(15,23,42,0.25)",
        "stroke-width": 1,
      })
    );

    // Y labels.
    dailyChartEl.appendChild(
      svgNode("text", {
        x: pad.left - 10,
        y: height - pad.bottom + 18,
        "text-anchor": "end",
        "font-size": 12,
        fill: "rgba(15,23,42,0.65)",
      })
    ).textContent = "0";
    dailyChartEl.appendChild(
      svgNode("text", {
        x: pad.left - 10,
        y: pad.top + 4,
        "text-anchor": "end",
        "font-size": 12,
        fill: "rgba(15,23,42,0.65)",
      })
    ).textContent = String(maxY);

    if (points.length === 0) {
      dailyChartEl.appendChild(
        svgNode("text", {
          x: width / 2,
          y: height / 2,
          "text-anchor": "middle",
          "font-size": 14,
          fill: "rgba(15,23,42,0.7)",
        })
      ).textContent = "No data for this window.";
      if (dailyChartMetaEl) dailyChartMetaEl.textContent = metaLabel || "—";
      return;
    }

    const xForIndex = (idx) => {
      if (points.length === 1) return pad.left + innerW / 2;
      return pad.left + (idx * innerW) / (points.length - 1);
    };
    const yForValue = (v) =>
      pad.top + innerH - (Math.max(0, v) / maxY) * innerH;

    function polylinePoints(values) {
      return values
        .map((v, idx) => `${xForIndex(idx).toFixed(2)},${yForValue(v).toFixed(2)}`)
        .join(" ");
    }

    const missedLine = svgNode("polyline", {
      points: polylinePoints(valuesMissed),
      fill: "none",
      stroke: "#7c3aed",
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    dailyChartEl.appendChild(missedLine);

    const paidLine = svgNode("polyline", {
      points: polylinePoints(valuesPaid),
      fill: "none",
      stroke: "#10b981",
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    dailyChartEl.appendChild(paidLine);

    // Dots + tooltips.
    points.forEach((p, idx) => {
      const dayLabel = p.day || "";
      const missed = Number(p.missed_call_leads) || 0;
      const paid = Number(p.paid_leads) || 0;

      const missedDot = svgNode("circle", {
        cx: xForIndex(idx),
        cy: yForValue(missed),
        r: 4,
        fill: "#7c3aed",
      });
      missedDot.appendChild(
        svgNode("title", null)
      ).textContent = `${dayLabel} — missed-call leads: ${missed}`;
      dailyChartEl.appendChild(missedDot);

      const paidDot = svgNode("circle", {
        cx: xForIndex(idx),
        cy: yForValue(paid),
        r: 4,
        fill: "#10b981",
      });
      paidDot.appendChild(svgNode("title", null)).textContent = `${dayLabel} — paid deposits: ${paid}`;
      dailyChartEl.appendChild(paidDot);
    });

    // X labels (first/middle/last).
    const labelIndices = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
    points.forEach((p, idx) => {
      if (!labelIndices.has(idx)) return;
      dailyChartEl.appendChild(
        svgNode("text", {
          x: xForIndex(idx),
          y: height - pad.bottom + 28,
          "text-anchor": "middle",
          "font-size": 12,
          fill: "rgba(15,23,42,0.65)",
        })
      ).textContent = p.day || "";
    });

    if (dailyChartMetaEl) dailyChartMetaEl.textContent = metaLabel || "—";
  }

  function renderLatencyChart(latency, metaLabel) {
    if (!latencyChartEl) return;
    clearSvg(latencyChartEl);

    const width = 800;
    const height = 260;
    const pad = { left: 55, top: 20, right: 20, bottom: 42 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const buckets = Array.isArray(latency?.buckets) ? latency.buckets : [];
    const counts = buckets.map((b) => Number(b.count) || 0);
    const maxY = Math.max(1, ...counts);

    latencyChartEl.appendChild(
      svgNode("rect", {
        x: 0,
        y: 0,
        width,
        height,
        fill: "#ffffff",
        rx: 14,
        ry: 14,
      })
    );

    latencyChartEl.appendChild(
      svgNode("line", {
        x1: pad.left,
        y1: height - pad.bottom,
        x2: width - pad.right,
        y2: height - pad.bottom,
        stroke: "rgba(15,23,42,0.25)",
        "stroke-width": 1,
      })
    );
    latencyChartEl.appendChild(
      svgNode("line", {
        x1: pad.left,
        y1: pad.top,
        x2: pad.left,
        y2: height - pad.bottom,
        stroke: "rgba(15,23,42,0.25)",
        "stroke-width": 1,
      })
    );

    latencyChartEl.appendChild(
      svgNode("text", {
        x: pad.left - 10,
        y: height - pad.bottom + 18,
        "text-anchor": "end",
        "font-size": 12,
        fill: "rgba(15,23,42,0.65)",
      })
    ).textContent = "0";
    latencyChartEl.appendChild(
      svgNode("text", {
        x: pad.left - 10,
        y: pad.top + 4,
        "text-anchor": "end",
        "font-size": 12,
        fill: "rgba(15,23,42,0.65)",
      })
    ).textContent = String(maxY);

    if (buckets.length === 0) {
      latencyChartEl.appendChild(
        svgNode("text", {
          x: width / 2,
          y: height / 2,
          "text-anchor": "middle",
          "font-size": 14,
          fill: "rgba(15,23,42,0.7)",
        })
      ).textContent = "No latency samples yet.";
      if (latencyChartMetaEl) latencyChartMetaEl.textContent = metaLabel || "—";
      return;
    }

    const barGap = 6;
    const barW = Math.max(6, innerW / buckets.length - barGap);
    const yForCount = (c) => pad.top + innerH - (Math.max(0, c) / maxY) * innerH;

    buckets.forEach((b, idx) => {
      const count = Number(b.count) || 0;
      const x = pad.left + idx * (barW + barGap);
      const y = yForCount(count);
      const h = height - pad.bottom - y;
      const label =
        b.label ||
        (Number.isFinite(Number(b.le_seconds))
          ? `≤ ${formatSeconds(Number(b.le_seconds))}`
          : "");

      const rect = svgNode("rect", {
        x,
        y,
        width: barW,
        height: Math.max(0, h),
        fill: "rgba(76, 29, 149, 0.85)",
        rx: 6,
        ry: 6,
      });
      rect.appendChild(svgNode("title", null)).textContent = `${label} — ${count}`;
      latencyChartEl.appendChild(rect);

      // Label every ~4th bar to reduce clutter.
      if (idx === 0 || idx === buckets.length - 1 || idx % 4 === 0) {
        latencyChartEl.appendChild(
          svgNode("text", {
            x: x + barW / 2,
            y: height - pad.bottom + 28,
            "text-anchor": "middle",
            "font-size": 11,
            fill: "rgba(15,23,42,0.65)",
          })
        ).textContent = label.replace("≤ ", "");
      }
    });

    if (latencyChartMetaEl) latencyChartMetaEl.textContent = metaLabel || "—";
  }

  function renderDashboard(data) {
    if (!data) return;

    if (kpiMissedCallsEl)
      kpiMissedCallsEl.textContent = numberToString(data.missed_call_leads);
    if (kpiPaidDepositsEl)
      kpiPaidDepositsEl.textContent = numberToString(data.missed_call_paid_leads);
    if (kpiConversionEl)
      kpiConversionEl.textContent = pctToString(data.missed_call_conversion_pct);
    if (kpiP95El)
      kpiP95El.textContent = msToString(data.llm_latency?.p95_ms);

    const dailyMeta =
      data.period_start && data.period_end
        ? `Window: ${data.period_start} → ${data.period_end} (UTC)`
        : "—";
    const latencyMeta =
      data.llm_latency?.total
        ? `Samples: ${numberToString(data.llm_latency.total)} • p90: ${msToString(
            data.llm_latency.p90_ms
          )} • p95: ${msToString(data.llm_latency.p95_ms)}`
        : "—";

    renderDailyChart(data.daily, dailyMeta);
    renderLatencyChart(data.llm_latency, latencyMeta);
  }

  async function loadMetrics() {
    const apiBase = sanitizeApiBase(apiBaseEl.value);
    const orgId = (orgIdEl.value || "").trim();
    const jwt = (jwtEl.value || "").trim();
    const days = (daysEl.value || "").trim();

    if (!apiBase || !orgId || !jwt) {
      setStatus("API base URL, Org ID, and Admin JWT are required.", true);
      return;
    }

    setStatus("Loading…", false);

    const url = `${apiBase}/admin/clinics/${encodeURIComponent(
      orgId
    )}/dashboard?days=${encodeURIComponent(days || "7")}`;

    let responseText = "";
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      responseText = await res.text();
      if (!res.ok) {
        throw new Error(
          `Request failed (${res.status}). ${tryExtractError(responseText)}`
        );
      }
      const payload = JSON.parse(responseText);
      renderDashboard(payload);
      saveSettings();
      setStatus("Updated.", false);
    } catch (err) {
      console.warn("Dashboard fetch failed", err);
      setStatus(
        `Unable to load dashboard metrics. ${err?.message || ""}`.trim(),
        true
      );
    }
  }

  function tryExtractError(text) {
    try {
      const json = JSON.parse(text);
      if (json && typeof json.error === "string") return json.error;
    } catch {
      // ignore
    }
    return text && text.length < 160 ? text : "Check API/CORS/JWT settings.";
  }

  if (clearTokenBtn) {
    clearTokenBtn.addEventListener("click", () => {
      try {
        sessionStorage.removeItem(storageKeys.jwt);
      } catch {
        // ignore
      }
      if (jwtEl) jwtEl.value = "";
      setStatus("Token cleared.", false);
    });
  }

  // Generate realistic demo data for visualization testing
  function generateDemoData() {
    const days = parseInt(daysEl.value, 10) || 7;
    const daily = [];
    const today = new Date();

    let totalMissed = 0;
    let totalPaid = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split("T")[0];

      // Generate realistic missed call leads (8-25 per day with some variance)
      const missed = Math.floor(8 + Math.random() * 17);
      // Conversion rate varies between 15-35%
      const convRate = 0.15 + Math.random() * 0.20;
      const paid = Math.floor(missed * convRate);

      totalMissed += missed;
      totalPaid += paid;

      daily.push({
        day: dayStr,
        missed_call_leads: missed,
        paid_leads: paid,
      });
    }

    const conversionPct = totalMissed > 0 ? (totalPaid / totalMissed) * 100 : 0;

    // Generate latency buckets (typical LLM response times)
    const buckets = [
      { le_seconds: 0.5, count: Math.floor(50 + Math.random() * 100) },
      { le_seconds: 1.0, count: Math.floor(150 + Math.random() * 200) },
      { le_seconds: 1.5, count: Math.floor(300 + Math.random() * 250) },
      { le_seconds: 2.0, count: Math.floor(400 + Math.random() * 300) },
      { le_seconds: 2.5, count: Math.floor(350 + Math.random() * 200) },
      { le_seconds: 3.0, count: Math.floor(200 + Math.random() * 150) },
      { le_seconds: 3.5, count: Math.floor(100 + Math.random() * 100) },
      { le_seconds: 4.0, count: Math.floor(50 + Math.random() * 60) },
      { le_seconds: 5.0, count: Math.floor(20 + Math.random() * 30) },
      { le_seconds: 7.5, count: Math.floor(5 + Math.random() * 15) },
      { le_seconds: 10.0, count: Math.floor(2 + Math.random() * 8) },
    ];

    const totalSamples = buckets.reduce((sum, b) => sum + b.count, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    return {
      missed_call_leads: totalMissed,
      missed_call_paid_leads: totalPaid,
      missed_call_conversion_pct: conversionPct,
      period_start: startDate.toISOString().split("T")[0],
      period_end: today.toISOString().split("T")[0],
      daily: daily,
      llm_latency: {
        p50_ms: 1800 + Math.floor(Math.random() * 400),
        p90_ms: 2800 + Math.floor(Math.random() * 500),
        p95_ms: 3200 + Math.floor(Math.random() * 600),
        p99_ms: 4500 + Math.floor(Math.random() * 1000),
        total: totalSamples,
        buckets: buckets,
      },
    };
  }

  function loadDemoMode() {
    setStatus("Loading demo data...", false);
    const demoData = generateDemoData();
    renderDashboard(demoData);
    setStatus("Demo mode active - showing sample data.", false);
  }

  if (demoModeBtn) {
    demoModeBtn.addEventListener("click", loadDemoMode);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadMetrics();
  });

  loadSettings();
  if ((jwtEl?.value || "").trim()) {
    loadMetrics();
  }
})();


(function () {
  // Storage keys
  const STORAGE_KEYS = {
    cognitoDomain: "medspa.cognito.domain",
    cognitoClientId: "medspa.cognito.clientId",
    cognitoRegion: "medspa.cognito.region",
    apiBaseUrl: "medspa.api.baseUrl",
    orgId: "medspa.org.id",
    idToken: "medspa.auth.idToken",
    accessToken: "medspa.auth.accessToken",
    refreshToken: "medspa.auth.refreshToken",
    tokenExpiry: "medspa.auth.expiry",
    userEmail: "medspa.auth.email",
    codeVerifier: "medspa.auth.codeVerifier",
  };

  // DOM Elements
  const setupCard = document.getElementById("setupCard");
  const loginCard = document.getElementById("loginCard");
  const callbackCard = document.getElementById("callbackCard");
  const loggedInCard = document.getElementById("loggedInCard");
  const setupForm = document.getElementById("setupForm");
  const loginBtn = document.getElementById("loginBtn");
  const loginCognitoBtn = document.getElementById("loginCognitoBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const reconfigureLink = document.getElementById("reconfigureLink");
  const loggedInUser = document.getElementById("loggedInUser");
  const setupStatus = document.getElementById("setupStatus");
  const loginStatus = document.getElementById("loginStatus");
  const callbackStatus = document.getElementById("callbackStatus");

  // Form inputs
  const cognitoDomainEl = document.getElementById("cognitoDomain");
  const cognitoClientIdEl = document.getElementById("cognitoClientId");
  const cognitoRegionEl = document.getElementById("cognitoRegion");
  const apiBaseUrlEl = document.getElementById("apiBaseUrl");
  const orgIdEl = document.getElementById("orgId");

  // Helper functions
  function getConfig() {
    return {
      domain: localStorage.getItem(STORAGE_KEYS.cognitoDomain) || "",
      clientId: localStorage.getItem(STORAGE_KEYS.cognitoClientId) || "",
      region: localStorage.getItem(STORAGE_KEYS.cognitoRegion) || "us-east-1",
      apiBaseUrl: localStorage.getItem(STORAGE_KEYS.apiBaseUrl) || "",
      orgId: localStorage.getItem(STORAGE_KEYS.orgId) || "",
    };
  }

  function saveConfig(config) {
    localStorage.setItem(STORAGE_KEYS.cognitoDomain, config.domain);
    localStorage.setItem(STORAGE_KEYS.cognitoClientId, config.clientId);
    localStorage.setItem(STORAGE_KEYS.cognitoRegion, config.region);
    localStorage.setItem(STORAGE_KEYS.apiBaseUrl, config.apiBaseUrl);
    localStorage.setItem(STORAGE_KEYS.orgId, config.orgId);
  }

  function isConfigured() {
    const config = getConfig();
    return config.domain && config.clientId && config.apiBaseUrl && config.orgId;
  }

  function getTokens() {
    return {
      idToken: sessionStorage.getItem(STORAGE_KEYS.idToken),
      accessToken: sessionStorage.getItem(STORAGE_KEYS.accessToken),
      refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
      expiry: parseInt(sessionStorage.getItem(STORAGE_KEYS.tokenExpiry) || "0", 10),
      email: sessionStorage.getItem(STORAGE_KEYS.userEmail),
    };
  }

  function saveTokens(tokens) {
    if (tokens.id_token) {
      sessionStorage.setItem(STORAGE_KEYS.idToken, tokens.id_token);
    }
    if (tokens.access_token) {
      sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
    }
    if (tokens.expires_in) {
      const expiry = Date.now() + tokens.expires_in * 1000;
      sessionStorage.setItem(STORAGE_KEYS.tokenExpiry, String(expiry));
    }
    // Decode email from ID token
    if (tokens.id_token) {
      try {
        const payload = JSON.parse(atob(tokens.id_token.split(".")[1]));
        if (payload.email) {
          sessionStorage.setItem(STORAGE_KEYS.userEmail, payload.email);
        }
      } catch (e) {
        console.warn("Could not decode ID token", e);
      }
    }
  }

  function clearTokens() {
    sessionStorage.removeItem(STORAGE_KEYS.idToken);
    sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    sessionStorage.removeItem(STORAGE_KEYS.tokenExpiry);
    sessionStorage.removeItem(STORAGE_KEYS.userEmail);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);
  }

  function isLoggedIn() {
    const tokens = getTokens();
    if (!tokens.idToken || !tokens.accessToken) return false;
    if (tokens.expiry && Date.now() > tokens.expiry) return false;
    return true;
  }

  function showCard(card) {
    [setupCard, loginCard, callbackCard, loggedInCard].forEach((c) => {
      if (c) c.style.display = "none";
    });
    if (card) card.style.display = "block";
  }

  function setStatus(el, message, isError) {
    if (!el) return;
    el.textContent = message || "";
    el.style.color = isError ? "#b91c1c" : "#059669";
  }

  // PKCE helpers
  function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(hash));
  }

  function base64UrlEncode(buffer) {
    let str = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Get redirect URI
  function getRedirectUri() {
    return window.location.origin + window.location.pathname;
  }

  // Initiate login with Cognito
  async function initiateLogin(identityProvider) {
    const config = getConfig();
    if (!config.domain || !config.clientId) {
      setStatus(loginStatus, "Cognito not configured", true);
      return;
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: getRedirectUri(),
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Add identity provider if specified (for Google, etc.)
    if (identityProvider) {
      params.set("identity_provider", identityProvider);
    }

    const authUrl = `https://${config.domain}/oauth2/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  // Exchange authorization code for tokens
  async function exchangeCodeForTokens(code) {
    const config = getConfig();
    const codeVerifier = localStorage.getItem(STORAGE_KEYS.codeVerifier);

    if (!codeVerifier) {
      throw new Error("Code verifier not found. Please try logging in again.");
    }

    const tokenUrl = `https://${config.domain}/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code: code,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await response.json();
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);
    return tokens;
  }

  // Handle OAuth callback
  async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    if (error) {
      showCard(loginCard);
      setStatus(loginStatus, errorDescription || error, true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      showCard(callbackCard);
      try {
        const tokens = await exchangeCodeForTokens(code);
        saveTokens(tokens);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redirect to dashboard
        window.location.href = "dashboard.html";
      } catch (err) {
        console.error("Callback error:", err);
        setStatus(callbackStatus, err.message || "Authentication failed", true);
        setTimeout(() => {
          showCard(loginCard);
          setStatus(loginStatus, "Authentication failed. Please try again.", true);
        }, 2000);
      }
      return true;
    }

    return false;
  }

  // Logout
  function logout() {
    clearTokens();
    const config = getConfig();

    // Optionally redirect to Cognito logout
    if (config.domain && config.clientId) {
      const logoutUrl = `https://${config.domain}/logout?client_id=${config.clientId}&logout_uri=${encodeURIComponent(getRedirectUri())}`;
      window.location.href = logoutUrl;
    } else {
      showCard(loginCard);
    }
  }

  // Initialize page
  async function init() {
    // Check for OAuth callback first
    if (await handleCallback()) {
      return;
    }

    // Check if already logged in
    if (isLoggedIn()) {
      const tokens = getTokens();
      if (loggedInUser) {
        loggedInUser.textContent = `Signed in as ${tokens.email || "user"}`;
      }
      showCard(loggedInCard);
      return;
    }

    // Check if Cognito is configured
    if (isConfigured()) {
      showCard(loginCard);

      // Pre-fill form for reconfigure
      const config = getConfig();
      if (cognitoDomainEl) cognitoDomainEl.value = config.domain;
      if (cognitoClientIdEl) cognitoClientIdEl.value = config.clientId;
      if (cognitoRegionEl) cognitoRegionEl.value = config.region;
      if (apiBaseUrlEl) apiBaseUrlEl.value = config.apiBaseUrl;
      if (orgIdEl) orgIdEl.value = config.orgId;
    } else {
      showCard(setupCard);
    }
  }

  // Event listeners
  if (setupForm) {
    setupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const config = {
        domain: (cognitoDomainEl?.value || "").trim(),
        clientId: (cognitoClientIdEl?.value || "").trim(),
        region: (cognitoRegionEl?.value || "").trim() || "us-east-1",
        apiBaseUrl: (apiBaseUrlEl?.value || "").trim().replace(/\/+$/, ""),
        orgId: (orgIdEl?.value || "").trim(),
      };

      if (!config.domain || !config.clientId || !config.apiBaseUrl || !config.orgId) {
        setStatus(setupStatus, "All fields are required", true);
        return;
      }

      saveConfig(config);
      setStatus(setupStatus, "Settings saved!", false);
      setTimeout(() => showCard(loginCard), 500);
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => initiateLogin("Google"));
  }

  if (loginCognitoBtn) {
    loginCognitoBtn.addEventListener("click", () => initiateLogin(null));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (reconfigureLink) {
    reconfigureLink.addEventListener("click", (e) => {
      e.preventDefault();
      showCard(setupCard);
    });
  }

  // Export for use in other scripts
  window.MedspaAuth = {
    isLoggedIn,
    getTokens,
    getConfig,
    logout,
    STORAGE_KEYS,
  };

  // Initialize
  init();
})();

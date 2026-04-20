(() => {
  const STORAGE_KEYS = {
    token: "kd_token",
    cart: "kd_cart",
    theme: "kd_theme",
    authReturnTo: "kd_auth_return_to",
  };

  const STATUS_LABELS = {
    new: "Yangi",
    confirmed: "Tasdiqlangan",
    preparing: "Tayyorlanmoqda",
    out_for_delivery: "Yetkazilmoqda",
    delivered: "Yetkazildi",
    cancelled: "Bekor qilingan",
    not_submitted: "Yuborilmagan",
    pending: "Tekshiruvda",
    approved: "Tasdiqlandi",
    rejected: "Rad etildi",
    completed: "Yakunlandi",
  };

  const DEFAULT_SITE_SETTINGS = {
    brand: {
      name: "Kardeshler Doner",
      slogan: "Tez yetkazib berish, premium ta'm, zamonaviy servis",
      supportPhone: "+998 90 777 55 44",
      supportTelegram: "@kardeshler_support",
      logoUrl: "/foodwagon-v1.0.0/public/assets/img/logo.png",
      logoDarkUrl: "/foodwagon-v1.0.0/public/assets/img/logo.png",
      faviconUrl: "/foodwagon-v1.0.0/public/assets/img/favicons/favicon-32x32.png",
    },
    offlineService: {
      address: "Toshkent shahri, Chilonzor tumani",
      mapEmbedUrl: "https://www.google.com/maps?q=41.2995,69.2401&z=14&output=embed",
      mapLink: "https://maps.google.com/?q=41.2995,69.2401",
      workingHours: "10:00 - 23:00",
      reservationSlots: [],
    },
    footer: {
      title: "Kardeshler Doner",
      legalLine: "Barcha huquqlar himoyalangan.",
      description: "Premium fast-food platforma",
      address: "Toshkent shahri, Chilonzor tumani",
      phone: "+998 90 777 55 44",
      email: "admin@kardeshler.uz",
      telegram: "@kardeshler_support",
      mapEmbedUrl: "https://www.google.com/maps?q=41.2995,69.2401&z=14&output=embed",
      mapLink: "https://maps.google.com/?q=41.2995,69.2401",
    },
    landing: {},
  };

  const state = {
    currentUser: null,
    siteSettings: null,
    pendingAuthResolvers: [],
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeSiteSettings(settings) {
    const source = settings && typeof settings === "object" ? settings : {};
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...source,
      brand: {
        ...DEFAULT_SITE_SETTINGS.brand,
        ...(source.brand || {}),
      },
      offlineService: {
        ...DEFAULT_SITE_SETTINGS.offlineService,
        ...(source.offlineService || {}),
      },
      footer: {
        ...DEFAULT_SITE_SETTINGS.footer,
        ...(source.footer || {}),
      },
      landing: {
        ...DEFAULT_SITE_SETTINGS.landing,
        ...(source.landing || {}),
      },
    };
  }

  function getSiteSettings() {
    if (state.siteSettings) {
      return state.siteSettings;
    }
    return normalizeSiteSettings({});
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEYS.token) || "";
  }

  function setToken(token) {
    if (!token) {
      localStorage.removeItem(STORAGE_KEYS.token);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.token, token);
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || "";
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    document.body.setAttribute("data-theme", theme);
    syncBrandLogosWithTheme();
    const toggle = qs("#themeToggle i");
    if (toggle) {
      toggle.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  function initTheme() {
    const savedTheme = getTheme();
    if (savedTheme) {
      setTheme(savedTheme);
      return;
    }

    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }

  function toggleTheme() {
    const current = document.body.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  }

  function parseQuery() {
    return new URLSearchParams(window.location.search);
  }

  function normalizePath(pathValue) {
    if (!pathValue) return "/index.html";
    if (pathValue.startsWith("http")) return "/index.html";
    return pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  }

  function resolvePendingAuth(success) {
    const pending = [...state.pendingAuthResolvers];
    state.pendingAuthResolvers = [];
    pending.forEach((resolver) => resolver(Boolean(success)));
  }

  async function api(path, options = {}, { allowUnauthorized = false } = {}) {
    const finalOptions = {
      method: options.method || "GET",
      headers: { ...(options.headers || {}) },
      body: options.body,
    };

    const token = getToken();
    if (token) {
      finalOptions.headers.Authorization = `Bearer ${token}`;
    }

    if (finalOptions.body && !(finalOptions.body instanceof FormData)) {
      finalOptions.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, finalOptions);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !allowUnauthorized) {
        logout({ silent: true });
      }
      throw new Error(payload.message || "So'rovda xatolik yuz berdi.");
    }

    return payload;
  }

  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.cart);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    renderCartBadges();
    document.dispatchEvent(new CustomEvent("kd:cart-updated", { detail: cart }));
  }

  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        imageUrl: item.imageUrl || "",
        quantity: Math.max(1, Number(item.quantity) || 1),
      });
    }
    saveCart(cart);
    toast(`${item.name} savatga qo'shildi.`, "success");
  }

  function updateCartQty(itemId, quantity) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === itemId);
    if (!item) return;
    item.quantity = Math.max(1, Number(quantity) || 1);
    saveCart(cart);
  }

  function removeFromCart(itemId) {
    const cart = getCart().filter((item) => item.id !== itemId);
    saveCart(cart);
  }

  function clearCart() {
    localStorage.removeItem(STORAGE_KEYS.cart);
    renderCartBadges();
    document.dispatchEvent(new CustomEvent("kd:cart-updated", { detail: [] }));
  }

  function cartTotal(cart = getCart()) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function renderCartBadges() {
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    qsa(".cart-count").forEach((node) => {
      node.textContent = count > 0 ? String(count) : "";
      node.classList.toggle("d-none", count === 0);
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function statusText(key) {
    return STATUS_LABELS[key] || key;
  }

  function badgeHtml(status) {
    return `<span class="kd-badge status-${escapeHtml(status)}">${escapeHtml(
      statusText(status),
    )}</span>`;
  }

  function ensureToastWrap() {
    if (!qs("#kdToastWrap")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        '<div class="kd-toast-wrap" id="kdToastWrap" aria-live="polite"></div>',
      );
    }
  }

  function toast(message, type = "info") {
    ensureToastWrap();
    const wrap = qs("#kdToastWrap");
    if (!wrap) return;

    const node = document.createElement("div");
    node.className = `kd-toast ${type}`;
    node.textContent = message;
    wrap.appendChild(node);

    setTimeout(() => {
      node.remove();
    }, 3200);
  }

  function stabilizeStyles() {
    const head = document.head;
    if (!head) return;

    const themeExists = qsa("link[rel='stylesheet']").some(
      (link) =>
        link.href.includes("/foodwagon-v1.0.0/public/assets/css/theme.min.css") ||
        link.href.includes("/foodwagon-v1.0.0/public/assets/css/theme.css"),
    );
    const appExists = qsa("link[rel='stylesheet']").some((link) =>
      link.href.includes("/assets/css/app.css"),
    );

    if (!themeExists) {
      const theme = document.createElement("link");
      theme.rel = "stylesheet";
      theme.href = `/foodwagon-v1.0.0/public/assets/css/theme.min.css?v=${Date.now()}`;
      theme.onerror = () => {
        theme.href = `/foodwagon-v1.0.0/public/assets/css/theme.css?v=${Date.now()}`;
      };
      head.appendChild(theme);
    }

    if (!appExists) {
      const appCss = document.createElement("link");
      appCss.rel = "stylesheet";
      appCss.href = `/assets/css/app.css?v=${Date.now()}`;
      head.appendChild(appCss);
    }
  }

  function applyFavicon(settings) {
    const head = document.head;
    if (!head) return;

    const faviconUrl =
      settings.brand?.faviconUrl || settings.brand?.logoUrl || DEFAULT_SITE_SETTINGS.brand.faviconUrl;

    const iconLinks = [
      { rel: "icon", type: "image/png", sizes: "32x32" },
      { rel: "shortcut icon", type: "image/x-icon" },
      { rel: "apple-touch-icon", type: "image/png", sizes: "180x180" },
    ];

    iconLinks.forEach((item) => {
      const selector = `link[rel='${item.rel}']`;
      const existing = qs(selector, head);
      const link = existing || document.createElement("link");
      link.setAttribute("rel", item.rel);
      if (item.type) link.setAttribute("type", item.type);
      if (item.sizes) link.setAttribute("sizes", item.sizes);
      link.setAttribute("href", faviconUrl);
      if (!existing) {
        head.appendChild(link);
      }
    });
  }

  function syncBrandLogosWithTheme() {
    const isDark = (document.body.getAttribute("data-theme") || "light") === "dark";
    qsa(".kd-brand img[data-logo-light]").forEach((img) => {
      const light = img.getAttribute("data-logo-light") || "";
      const dark = img.getAttribute("data-logo-dark") || light;
      img.setAttribute("src", isDark ? dark : light);
    });
  }

  function applyNavBranding(settings) {
    const brandName = settings.brand?.name || DEFAULT_SITE_SETTINGS.brand.name;
    const logoLight = settings.brand?.logoUrl || "";
    const logoDark = settings.brand?.logoDarkUrl || logoLight;

    qsa(".kd-brand").forEach((node) => {
      if (!node.dataset.kdSubtitle) {
        node.dataset.kdSubtitle = (qs("small", node)?.textContent || "").trim();
      }
      const subtitle = node.dataset.kdSubtitle || "";
      const logoMarkup = logoLight
        ? `<img class="kd-brand-logo-img" src="${escapeHtml(
            logoLight,
          )}" data-logo-light="${escapeHtml(logoLight)}" data-logo-dark="${escapeHtml(
            logoDark,
          )}" alt="${escapeHtml(brandName)} logo" />`
        : "";

      node.innerHTML = `
        <span class="kd-brand-head">
          ${logoMarkup}
          <span class="kd-brand-name">${escapeHtml(brandName)}</span>
        </span>
        ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}
      `;
    });

    syncBrandLogosWithTheme();

    if (document.title.includes("Kardeshler Doner")) {
      document.title = document.title.replaceAll("Kardeshler Doner", brandName);
    }
  }

  function applyOfficialFooter(settings) {
    const footerNode = qs("footer.kd-footer");
    if (!footerNode) return;

    const brand = settings.brand || {};
    const footer = settings.footer || {};
    const offline = settings.offlineService || {};
    const title = footer.title || brand.name || DEFAULT_SITE_SETTINGS.footer.title;
    const legalLine = footer.legalLine || DEFAULT_SITE_SETTINGS.footer.legalLine;
    const description = footer.description || DEFAULT_SITE_SETTINGS.footer.description;
    const address = footer.address || offline.address || DEFAULT_SITE_SETTINGS.footer.address;
    const phone = footer.phone || brand.supportPhone || DEFAULT_SITE_SETTINGS.footer.phone;
    const email = footer.email || DEFAULT_SITE_SETTINGS.footer.email;
    const telegram = footer.telegram || brand.supportTelegram || DEFAULT_SITE_SETTINGS.footer.telegram;
    const mapEmbedUrl =
      footer.mapEmbedUrl || offline.mapEmbedUrl || DEFAULT_SITE_SETTINGS.footer.mapEmbedUrl;
    const mapLink = footer.mapLink || offline.mapLink || DEFAULT_SITE_SETTINGS.footer.mapLink;
    const year = new Date().getFullYear();

    footerNode.innerHTML = `
      <div class="kd-footer-grid">
        <div class="kd-footer-col">
          <h4 class="mb-2">${escapeHtml(title)}</h4>
          <p class="kd-meta mb-2">${escapeHtml(description)}</p>
          <p class="kd-meta mb-0">© ${year} ${escapeHtml(title)}. ${escapeHtml(legalLine)}</p>
        </div>
        <div class="kd-footer-col">
          <div class="kd-footer-row"><i class="fas fa-location-dot"></i><span>${escapeHtml(
            address,
          )}</span></div>
          <div class="kd-footer-row"><i class="fas fa-phone"></i><span>${escapeHtml(phone)}</span></div>
          <div class="kd-footer-row"><i class="fas fa-envelope"></i><span>${escapeHtml(
            email,
          )}</span></div>
          <div class="kd-footer-row"><i class="fab fa-telegram"></i><span>${escapeHtml(
            telegram,
          )}</span></div>
          ${
            mapLink
              ? `<a class="kd-btn-ghost kd-compact mt-2" href="${escapeHtml(
                  mapLink,
                )}" target="_blank" rel="noreferrer">Xaritada ochish</a>`
              : ""
          }
        </div>
        <div class="kd-footer-col">
          ${
            mapEmbedUrl
              ? `<iframe class="kd-footer-map" src="${escapeHtml(
                  mapEmbedUrl,
                )}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
              : '<div class="kd-empty">Xarita havolasi kiritilmagan.</div>'
          }
        </div>
      </div>
    `;
  }

  function applySiteSettingsToPage() {
    const settings = getSiteSettings();
    applyFavicon(settings);
    applyNavBranding(settings);
    applyOfficialFooter(settings);
  }

  async function loadSiteSettings() {
    try {
      const settings = await api("/api/settings", {}, { allowUnauthorized: true });
      state.siteSettings = normalizeSiteSettings(settings);
    } catch (error) {
      state.siteSettings = normalizeSiteSettings({});
    }

    applySiteSettingsToPage();
    document.dispatchEvent(
      new CustomEvent("kd:settings-updated", { detail: getSiteSettings() }),
    );
  }

  function getManualBackdrop() {
    return qs("#authModalBackdrop");
  }

  function manualShowAuthModal(modalEl) {
    if (!modalEl) return;

    modalEl.style.display = "block";
    modalEl.removeAttribute("aria-hidden");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.classList.add("show");
    document.body.classList.add("modal-open");

    if (!getManualBackdrop()) {
      const backdrop = document.createElement("div");
      backdrop.id = "authModalBackdrop";
      backdrop.className = "modal-backdrop fade show";
      document.body.appendChild(backdrop);
    }
  }

  function manualHideAuthModal(modalEl) {
    if (!modalEl) return;

    modalEl.classList.remove("show");
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.removeAttribute("aria-modal");
    modalEl.style.display = "none";
    document.body.classList.remove("modal-open");
    getManualBackdrop()?.remove();
  }

  function initAuthModal() {
    if (qs("#authModal")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content kd-panel">
            <div class="modal-header border-0">
              <h5 class="modal-title">Kirish yoki ro'yxatdan o'tish</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <ul class="nav nav-pills mb-3" role="tablist">
                <li class="nav-item"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#loginPane" type="button">Kirish</button></li>
                <li class="nav-item"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#registerPane" type="button">Ro'yxatdan o'tish</button></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane fade show active" id="loginPane">
                  <form id="loginForm" class="d-grid gap-2">
                    <input class="form-control" name="phone" placeholder="Telefon raqam" required>
                    <input class="form-control" type="password" name="password" placeholder="Parol" required>
                    <button class="kd-btn-primary" type="submit">Kirish</button>
                  </form>
                </div>
                <div class="tab-pane fade" id="registerPane">
                  <form id="registerForm" class="d-grid gap-2">
                    <input class="form-control" name="fullName" placeholder="Ism familiya" required>
                    <input class="form-control" name="phone" placeholder="Telefon raqam" required>
                    <input class="form-control" name="address" placeholder="Manzil (ixtiyoriy)">
                    <input class="form-control" type="password" name="password" placeholder="Parol (kamida 6 belgi)" required>
                    <button class="kd-btn-primary" type="submit">Ro'yxatdan o'tish</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      `,
    );

    const modalEl = qs("#authModal");
    modalEl?.addEventListener("hidden.bs.modal", () => {
      if (!state.currentUser) {
        resolvePendingAuth(false);
      }
    });
    modalEl?.addEventListener("click", (event) => {
      if (event.target !== modalEl) return;
      if (window.bootstrap?.Modal) return;
      manualHideAuthModal(modalEl);
      if (!state.currentUser) {
        resolvePendingAuth(false);
      }
    });

    const closeButton = qs("#authModal .btn-close");
    closeButton?.addEventListener("click", () => {
      if (window.bootstrap?.Modal) return;
      manualHideAuthModal(modalEl);
      if (!state.currentUser) {
        resolvePendingAuth(false);
      }
    });

    const loginForm = qs("#loginForm");
    const registerForm = qs("#registerForm");

    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        phone: String(formData.get("phone") || "").trim(),
        password: String(formData.get("password") || "").trim(),
      };

      try {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onAuthSucceeded(data, "Muvaffaqiyatli kirdingiz.");
      } catch (error) {
        toast(error.message, "error");
      }
    });

    registerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        fullName: String(formData.get("fullName") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        password: String(formData.get("password") || "").trim(),
      };

      try {
        const data = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onAuthSucceeded(data, "Akkaunt yaratildi.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function getAuthModal() {
    initAuthModal();
    const modalEl = qs("#authModal");
    const ModalCtor = window.bootstrap?.Modal;

    if (!modalEl) {
      return null;
    }

    if (!ModalCtor) {
      return {
        show: () => manualShowAuthModal(modalEl),
        hide: () => manualHideAuthModal(modalEl),
      };
    }

    let instance = null;
    if (typeof ModalCtor.getOrCreateInstance === "function") {
      instance = ModalCtor.getOrCreateInstance(modalEl);
    } else if (typeof ModalCtor.getInstance === "function") {
      instance = ModalCtor.getInstance(modalEl) || new ModalCtor(modalEl);
    } else {
      instance = new ModalCtor(modalEl);
    }

    return {
      show: () => instance?.show?.(),
      hide: () => instance?.hide?.(),
    };
  }

  function redirectAfterAuthIfNeeded() {
    const query = parseQuery();
    const queryNext = query.get("next");
    const storedNext = localStorage.getItem(STORAGE_KEYS.authReturnTo);
    const next = normalizePath(queryNext || storedNext || "");

    if (!next || next === "/index.html" || next === window.location.pathname + window.location.search) {
      return false;
    }

    const isAuthEntryPage = query.get("auth") === "1" || window.location.pathname === "/index.html";
    if (!isAuthEntryPage) {
      return false;
    }

    localStorage.removeItem(STORAGE_KEYS.authReturnTo);
    window.location.href = next;
    return true;
  }

  function onAuthSucceeded(data, successMessage) {
    setToken(data.token);
    state.currentUser = data.user;
    renderAuthArea();

    const modal = getAuthModal();
    modal?.hide();

    toast(successMessage, "success");
    document.dispatchEvent(new Event("kd:user-updated"));
    resolvePendingAuth(true);

    const redirected = redirectAfterAuthIfNeeded();
    if (!redirected) {
      localStorage.removeItem(STORAGE_KEYS.authReturnTo);
    }
  }

  function openAuthModal() {
    const modal = getAuthModal();
    modal?.show();
  }

  function logout({ silent = false } = {}) {
    setToken("");
    state.currentUser = null;
    renderAuthArea();
    if (!silent) {
      toast("Sessiya yakunlandi.", "success");
    }
    document.dispatchEvent(new Event("kd:user-updated"));
  }

  function initials(fullName) {
    const clean = String(fullName || "").trim();
    if (!clean) return "U";
    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
  }

  function renderAuthArea() {
    const mount = qs("#authArea");
    if (!mount) return;

    if (!state.currentUser) {
      mount.innerHTML = `
        <div class="kd-auth-actions">
          <button type="button" class="kd-btn-outline" data-open-auth>Kirish</button>
          <a class="kd-btn-primary" href="/menu.html">Buyurtma</a>
        </div>
      `;
      bindAuthOpeners();
      return;
    }

    const adminLink =
      state.currentUser.role === "admin"
        ? '<a class="kd-btn-ghost kd-compact" href="/admin.html">Admin</a>'
        : "";

    mount.innerHTML = `
      <div class="kd-auth-user">
        <span class="kd-avatar">${escapeHtml(initials(state.currentUser.fullName))}</span>
        <div class="kd-compact kd-desktop-only">
          <div class="fw-bold">${escapeHtml(state.currentUser.fullName)}</div>
          <div class="kd-meta">${escapeHtml(state.currentUser.phone || "")}</div>
        </div>
        <a class="kd-btn-ghost kd-compact" href="/dashboard.html">Kabinet</a>
        ${adminLink}
        <button type="button" class="kd-btn-outline kd-compact" id="logoutButton">Chiqish</button>
      </div>
    `;

    qs("#logoutButton")?.addEventListener("click", () => logout());
  }

  function bindAuthOpeners(root = document) {
    qsa("[data-open-auth]", root).forEach((node) => {
      if (node.dataset.boundAuthOpen) return;
      node.dataset.boundAuthOpen = "true";
      node.addEventListener("click", (event) => {
        event.preventDefault();
        openAuthModal();
      });
    });
  }

  async function loadCurrentUser() {
    const token = getToken();
    if (!token) {
      state.currentUser = null;
      renderAuthArea();
      return;
    }

    try {
      state.currentUser = await api("/api/me", {}, { allowUnauthorized: true });
    } catch (error) {
      setToken("");
      state.currentUser = null;
    }

    renderAuthArea();
  }

  function setActiveNav() {
    const currentRaw = window.location.pathname.split("/").pop() || "index.html";
    const current = currentRaw.includes(".") ? currentRaw : `${currentRaw}.html`;
    qsa(".kd-nav-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("active", href.endsWith(current));
    });
  }

  async function ensureAuth(options = {}) {
    if (state.currentUser) return true;

    if (options.storeReturnTo) {
      localStorage.setItem(
        STORAGE_KEYS.authReturnTo,
        normalizePath(window.location.pathname + window.location.search),
      );
    }

    openAuthModal();
    return new Promise((resolve) => {
      state.pendingAuthResolvers.push(resolve);
    });
  }

  function enforceRouteGuard() {
    const body = document.body;
    if (!body) return false;

    const requiresAuth = body.dataset.requireAuth === "true";
    const adminOnly = body.dataset.adminOnly === "true";

    if (requiresAuth && !state.currentUser) {
      const nextPath = normalizePath(window.location.pathname + window.location.search);
      localStorage.setItem(STORAGE_KEYS.authReturnTo, nextPath);
      window.location.href = `/index.html?auth=1&next=${encodeURIComponent(nextPath)}`;
      return true;
    }

    if (adminOnly && state.currentUser?.role !== "admin") {
      toast("Admin huquqi talab qilinadi.", "error");
      window.location.href = "/dashboard.html";
      return true;
    }

    return false;
  }

  function bindThemeToggle() {
    const toggle = qs("#themeToggle");
    toggle?.addEventListener("click", toggleTheme);
  }

  function injectBottomNav() {
    if (qs("#kdBottomNav")) return;

    const currentRaw = window.location.pathname.split("/").pop() || "index.html";
    const current = currentRaw.includes(".") ? currentRaw : `${currentRaw}.html`;
    const links = [
      { href: "/index.html", icon: "fa-house", label: "Bosh" },
      { href: "/menu.html", icon: "fa-utensils", label: "Menu" },
      { href: "/order.html", icon: "fa-basket-shopping", label: "Buyurtma" },
      { href: "/tables.html", icon: "fa-chair", label: "Stol" },
      { href: "/payment.html", icon: "fa-credit-card", label: "To'lov" },
      { href: "/profile.html", icon: "fa-user", label: "Profil" },
    ];

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <nav id="kdBottomNav" class="kd-bottom-nav">
        ${links
          .map(
            (item) => `
          <a class="kd-bottom-link ${item.href.endsWith(current) ? "active" : ""}" href="${item.href}">
            <i class="fas ${item.icon}"></i>
            <span>${item.label}</span>
          </a>
        `,
          )
          .join("")}
      </nav>
      `,
    );
  }

  function bootstrapCommon() {
    stabilizeStyles();
    initTheme();
    applySiteSettingsToPage();
    setActiveNav();
    renderCartBadges();
    bindThemeToggle();
    bindAuthOpeners();
    initAuthModal();
    injectBottomNav();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bootstrapCommon();
    await loadSiteSettings();
    await loadCurrentUser();

    if (enforceRouteGuard()) {
      return;
    }

    const query = parseQuery();
    if (!state.currentUser && query.get("auth") === "1") {
      toast("Davom etish uchun login/register qiling.", "error");
      openAuthModal();
      return;
    }

    if (state.currentUser) {
      redirectAfterAuthIfNeeded();
    }
  });

  window.KDApp = {
    api,
    toast,
    qs,
    qsa,
    formatCurrency,
    formatDate,
    statusText,
    badgeHtml,
    escapeHtml,
    getCart,
    saveCart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartTotal,
    ensureAuth,
    getCurrentUser: () => state.currentUser,
    getSiteSettings: () => getSiteSettings(),
    reloadSiteSettings: loadSiteSettings,
    openAuthModal,
    logout,
    parseQuery,
    normalizePath,
  };
})();

(() => {
  const STORAGE_KEYS = {
    token: "kd_token",
    cart: "kd_cart",
    theme: "kd_theme",
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
  };

  const state = {
    currentUser: null,
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

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }

  function toggleTheme() {
    const current = document.body.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
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
    return `<span class="kd-badge status-${escapeHtml(status)}">${escapeHtml(statusText(status))}</span>`;
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
                    <input class="form-control" name="phone" placeholder="Telefon" required>
                    <input class="form-control" type="password" name="password" placeholder="Parol" required>
                    <button class="kd-btn-primary" type="submit">Kirish</button>
                  </form>
                </div>
                <div class="tab-pane fade" id="registerPane">
                  <form id="registerForm" class="d-grid gap-2">
                    <input class="form-control" name="fullName" placeholder="Ism familiya" required>
                    <input class="form-control" name="phone" placeholder="Telefon" required>
                    <input class="form-control" name="email" type="email" placeholder="Email (ixtiyoriy)">
                    <input class="form-control" name="address" placeholder="Manzil">
                    <input class="form-control" type="password" name="password" placeholder="Parol (kamida 6 belgi)" required>
                    <button class="kd-btn-primary" type="submit">Akkaunt yaratish</button>
                  </form>
                </div>
              </div>
              <div class="small text-muted mt-3">
                Admin demo login: <code>${escapeHtml(window.__ADMIN_PHONE__ || "+998900000000")}</code> / <code>${escapeHtml(window.__ADMIN_PASSWORD__ || "admin12345")}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
      `,
    );

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
        setToken(data.token);
        state.currentUser = data.user;
        renderAuthArea();
        const modal = window.bootstrap?.Modal.getOrCreateInstance(qs("#authModal"));
        modal?.hide();
        toast("Muvaffaqiyatli kirdingiz.", "success");
        document.dispatchEvent(new Event("kd:user-updated"));
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
        email: String(formData.get("email") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        password: String(formData.get("password") || "").trim(),
      };

      try {
        const data = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToken(data.token);
        state.currentUser = data.user;
        renderAuthArea();
        const modal = window.bootstrap?.Modal.getOrCreateInstance(qs("#authModal"));
        modal?.hide();
        toast("Akkaunt yaratildi.", "success");
        document.dispatchEvent(new Event("kd:user-updated"));
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function openAuthModal() {
    initAuthModal();
    const modal = window.bootstrap?.Modal.getOrCreateInstance(qs("#authModal"));
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
        <div class="kd-compact">
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
    const current = window.location.pathname.split("/").pop() || "index.html";
    qsa(".kd-nav-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("active", href.endsWith(current));
    });
  }

  async function ensureAuth(options = {}) {
    if (state.currentUser) return true;
    if (options.redirectToHome) {
      window.location.href = "/index.html?auth=1";
    } else {
      openAuthModal();
    }
    return false;
  }

  function enforceRouteGuard() {
    const body = document.body;
    if (!body) return;

    const requiresAuth = body.dataset.requireAuth === "true";
    const adminOnly = body.dataset.adminOnly === "true";

    if (requiresAuth && !state.currentUser) {
      window.location.href = "/index.html?auth=1";
      return;
    }

    if (adminOnly && state.currentUser?.role !== "admin") {
      toast("Admin huquqi talab qilinadi.", "error");
      window.location.href = "/dashboard.html";
    }
  }

  function bindThemeToggle() {
    const toggle = qs("#themeToggle");
    toggle?.addEventListener("click", toggleTheme);
  }

  function bootstrapCommon() {
    initTheme();
    setActiveNav();
    renderCartBadges();
    bindThemeToggle();
    bindAuthOpeners();
    initAuthModal();
  }

  function parseQuery() {
    return new URLSearchParams(window.location.search);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bootstrapCommon();
    await loadCurrentUser();
    enforceRouteGuard();

    if (parseQuery().get("auth") === "1") {
      openAuthModal();
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
    openAuthModal,
    logout,
    parseQuery,
  };
})();

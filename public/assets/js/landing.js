document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, escapeHtml, formatCurrency, addToCart, toast } = window.KDApp;

  const featuredGrid = qs("#featuredMenuGrid");
  const landingMenuCount = qs("#landingMenuCount");
  const landingTableCount = qs("#landingTableCount");

  let featuredItems = [];

  function setText(id, value) {
    const node = qs(`#${id}`);
    if (!node || typeof value !== "string" || !value.trim()) return;
    node.textContent = value.trim();
  }

  function applyLandingSettings(settings) {
    const brand = settings?.brand || {};
    const landing = settings?.landing || {};
    const offline = settings?.offlineService || {};

    setText("brandName", landing.heroTitle || brand.name);
    setText("brandSlogan", landing.heroSubtitle || brand.slogan);
    setText("supportPhone", brand.supportPhone);
    setText("landingBadge", landing.badge);
    setText("whyChooseTitle", landing.whyChooseTitle);
    setText("featuredTitle", landing.featuredTitle);
    setText("processTitle", landing.processTitle);

    setText("step1Title", landing.processStep1Title);
    setText("step1Description", landing.processStep1Description);
    setText("step2Title", landing.processStep2Title);
    setText("step2Description", landing.processStep2Description);
    setText("step3Title", landing.processStep3Title);
    setText("step3Description", landing.processStep3Description);

    setText("paymentBannerTitle", landing.paymentBannerTitle);
    setText("paymentBannerText", landing.paymentBannerText);
    setText("paymentBannerButtonText", landing.paymentBannerButtonText);

    setText("offlineTitle", landing.offlineTitle);
    setText("offlineDescription", landing.offlineDescription);
    setText("offlineButtonText", landing.offlineButtonText);

    setText("testimonialsTitle", landing.testimonialsTitle);
    setText("testimonial1Quote", landing.testimonial1Quote);
    setText("testimonial1Author", landing.testimonial1Author);
    setText("testimonial2Quote", landing.testimonial2Quote);
    setText("testimonial2Author", landing.testimonial2Author);
    setText("testimonial3Quote", landing.testimonial3Quote);
    setText("testimonial3Author", landing.testimonial3Author);
    setText("testimonial4Quote", landing.testimonial4Quote);
    setText("testimonial4Author", landing.testimonial4Author);

    const quickAddress = qs("#quickAddress");
    if (quickAddress && landing.quickOrderPlaceholder) {
      quickAddress.setAttribute("placeholder", landing.quickOrderPlaceholder);
    }

    setText("ctaToMenuText", landing.ctaMenuText);
    setText("ctaToOrderText", landing.ctaOrderText);
    setText("ctaToTablesText", landing.ctaTableText);
    setText("feature1Title", landing.feature1Title);
    setText("feature1Description", landing.feature1Description);
    setText("feature2Title", landing.feature2Title);
    setText("feature2Description", landing.feature2Description);
    setText("feature3Title", landing.feature3Title);
    setText("feature3Description", landing.feature3Description);
    setText("feature4Title", landing.feature4Title);
    setText("feature4Description", landing.feature4Description);

    setText("landingAddress", offline.address);
    const landingMap = qs("#landingMapEmbed");
    if (landingMap && offline.mapEmbedUrl) {
      landingMap.setAttribute("src", offline.mapEmbedUrl);
    }
    const landingMapLink = qs("#offlineMapLink");
    if (landingMapLink) {
      const linkValue = offline.mapLink || offline.mapEmbedUrl || "";
      if (linkValue) {
        landingMapLink.setAttribute("href", linkValue);
      }
    }
  }

  function hydrateLandingSettings() {
    const settings = window.KDApp.getSiteSettings?.();
    if (settings) {
      applyLandingSettings(settings);
      return;
    }
    api("/api/settings")
      .then((data) => applyLandingSettings(data))
      .catch(() => {});
  }

  function cardTemplate(item) {
    return `
      <article class="kd-card kd-animated">
        <div class="card-img-wrap"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}"></div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h5 class="mb-1">${escapeHtml(item.name)}</h5>
            <span class="kd-pill">${escapeHtml(item.category)}</span>
          </div>
          <p class="kd-meta mb-2">${escapeHtml(item.description || "")}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="kd-price">${formatCurrency(item.price)}</span>
            <button class="kd-btn-primary add-featured" data-id="${escapeHtml(item._id)}">Savatga</button>
          </div>
        </div>
      </article>
    `;
  }

  async function loadFeatured() {
    if (!featuredGrid) return;

    featuredGrid.innerHTML = `<div class="kd-empty">Menu yuklanmoqda...</div>`;

    try {
      featuredItems = await api("/api/menu?featured=true&limit=8");
      if (!featuredItems.length) {
        featuredGrid.innerHTML = `<div class="kd-empty">Hozircha featured menu mavjud emas.</div>`;
        return;
      }

      featuredGrid.innerHTML = featuredItems.map(cardTemplate).join("");
      if (landingMenuCount) landingMenuCount.textContent = featuredItems.length;
    } catch (error) {
      featuredGrid.innerHTML = `<div class="kd-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  async function loadLandingStats() {
    try {
      const tablesData = await api("/api/tables");
      if (landingTableCount) {
        landingTableCount.textContent = Number(tablesData.tables?.length || 0);
      }

      if (landingMenuCount && !landingMenuCount.textContent.trim()) {
        const menu = await api("/api/menu?limit=300");
        landingMenuCount.textContent = Number(menu.length || 0);
      }
    } catch (error) {
      console.error(error);
    }
  }

  featuredGrid?.addEventListener("click", (event) => {
    const button = event.target.closest(".add-featured");
    if (!button) return;
    const id = button.dataset.id;
    const selected = featuredItems.find((entry) => entry._id === id);
    if (!selected) return;
    addToCart({
      id: selected._id,
      name: selected.name,
      imageUrl: selected.imageUrl,
      price: selected.price,
      quantity: 1,
    });
  });

  qs("#ctaToMenu")?.addEventListener("click", () => {
    window.location.href = "/menu.html";
  });

  qs("#ctaToOrder")?.addEventListener("click", async () => {
    const ok = await window.KDApp.ensureAuth({ storeReturnTo: true });
    if (!ok) return;
    window.location.href = "/order.html";
  });

  qs("#quickOrderButton")?.addEventListener("click", async () => {
    const value = String(qs("#quickAddress")?.value || "").trim();
    if (!value) {
      toast("Manzil kiriting.", "error");
      return;
    }
    localStorage.setItem("kd_quick_address", value);
    window.location.href = "/menu.html";
  });

  document.addEventListener("kd:settings-updated", (event) => {
    applyLandingSettings(event.detail || {});
  });

  hydrateLandingSettings();
  loadFeatured();
  loadLandingStats();
});

document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, escapeHtml, formatCurrency, addToCart, toast } = window.KDApp;

  const brandNameNode = qs("#brandName");
  const sloganNode = qs("#brandSlogan");
  const supportPhoneNode = qs("#supportPhone");
  const featuredGrid = qs("#featuredMenuGrid");

  async function loadHeaderMeta() {
    try {
      const settings = await api("/api/settings");
      if (brandNameNode) brandNameNode.textContent = settings.brand?.name || "Kardeshler Doner";
      if (sloganNode) sloganNode.textContent = settings.brand?.slogan || "Premium ta'm va tez yetkazib berish";
      if (supportPhoneNode) supportPhoneNode.textContent = settings.brand?.supportPhone || "+998 90 777 55 44";
    } catch (error) {
      console.error(error);
    }
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
      const items = await api("/api/menu?featured=true&limit=8");
      if (!items.length) {
        featuredGrid.innerHTML = `<div class="kd-empty">Hozircha featured menu mavjud emas.</div>`;
        return;
      }

      featuredGrid.innerHTML = items.map(cardTemplate).join("");
      featuredGrid.addEventListener("click", (event) => {
        const button = event.target.closest(".add-featured");
        if (!button) return;
        const id = button.dataset.id;
        const selected = items.find((entry) => entry._id === id);
        if (!selected) return;
        addToCart({
          id: selected._id,
          name: selected.name,
          imageUrl: selected.imageUrl,
          price: selected.price,
          quantity: 1,
        });
      });
    } catch (error) {
      featuredGrid.innerHTML = `<div class="kd-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  qs("#ctaToMenu")?.addEventListener("click", () => {
    window.location.href = "/menu.html";
  });

  qs("#ctaToOrder")?.addEventListener("click", async () => {
    const ok = await window.KDApp.ensureAuth();
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

  loadHeaderMeta();
  loadFeatured();
});

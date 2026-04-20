document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, escapeHtml, formatCurrency, addToCart } = window.KDApp;

  const menuGrid = qs("#menuGrid");
  const categoryWrap = qs("#categoryWrap");
  const searchInput = qs("#menuSearch");
  const availableOnly = qs("#availableOnly");

  let allItems = [];
  let activeCategory = "Barchasi";

  function renderCategories(categories) {
    if (!categoryWrap) return;
    categoryWrap.innerHTML = categories
      .map(
        (category) =>
          `<button class="kd-chip ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`,
      )
      .join("");
  }

  function renderMenu(items) {
    if (!menuGrid) return;

    if (!items.length) {
      menuGrid.innerHTML = `<div class="kd-empty">Qidiruv bo'yicha menu topilmadi.</div>`;
      return;
    }

    menuGrid.innerHTML = items
      .map(
        (item) => `
        <article class="kd-card kd-animated">
          <div class="card-img-wrap"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}"></div>
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <h5 class="mb-1">${escapeHtml(item.name)}</h5>
              <span class="kd-pill">${escapeHtml(item.category)}</span>
            </div>
            <p class="kd-meta mb-2">${escapeHtml(item.description || "")}</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="kd-price">${formatCurrency(item.price)}</span>
              <button class="kd-btn-primary add-menu-item" data-id="${escapeHtml(item._id)}">Savatga</button>
            </div>
          </div>
        </article>
      `,
      )
      .join("");
  }

  function applyFilter() {
    const q = String(searchInput?.value || "").trim().toLowerCase();
    const availableFilter = Boolean(availableOnly?.checked);

    const filtered = allItems.filter((item) => {
      const byCategory = activeCategory === "Barchasi" || item.category === activeCategory;
      const bySearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q);
      const byAvailability = !availableFilter || item.isAvailable;
      return byCategory && bySearch && byAvailability;
    });

    renderMenu(filtered);
  }

  async function loadMenu() {
    if (!menuGrid) return;
    menuGrid.innerHTML = `<div class="kd-empty">Menu yuklanmoqda...</div>`;

    try {
      const [categories, items] = await Promise.all([
        api("/api/menu/categories"),
        api("/api/menu?limit=200"),
      ]);

      allItems = items;
      renderCategories(categories);
      applyFilter();
    } catch (error) {
      menuGrid.innerHTML = `<div class="kd-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  categoryWrap?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    activeCategory = chip.dataset.category;
    renderCategories([
      ...new Set(["Barchasi", ...allItems.map((item) => item.category).filter(Boolean)]),
    ]);
    applyFilter();
  });

  menuGrid?.addEventListener("click", (event) => {
    const button = event.target.closest(".add-menu-item");
    if (!button) return;
    const selected = allItems.find((item) => item._id === button.dataset.id);
    if (!selected) return;

    addToCart({
      id: selected._id,
      name: selected.name,
      price: selected.price,
      imageUrl: selected.imageUrl,
      quantity: 1,
    });
  });

  searchInput?.addEventListener("input", applyFilter);
  availableOnly?.addEventListener("change", applyFilter);

  loadMenu();
});

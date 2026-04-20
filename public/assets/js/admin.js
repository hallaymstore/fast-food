document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, escapeHtml, formatCurrency, formatDate, badgeHtml, toast } =
    window.KDApp;

  const state = {
    users: [],
    menu: [],
    orders: [],
    tables: [],
    tableReservations: [],
    settings: null,
  };

  const STATUS_OPTIONS = [
    "new",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  const TABLE_RESERVATION_STATUSES = [
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
  ];

  let dragState = null;

  function optionTemplate(value, selected) {
    return `<option value="${escapeHtml(value)}" ${
      value === selected ? "selected" : ""
    }>${escapeHtml(window.KDApp.statusText(value))}</option>`;
  }

  function setOverview(data) {
    const map = {
      ovUsers: data.users,
      ovMenu: data.menuItems,
      ovOrders: data.orders,
      ovPendingPayment: data.pendingPayments,
      ovRevenue: formatCurrency(data.totalRevenue || 0),
      ovStatusNew: data.statusSummary?.new || 0,
      ovStatusPreparing: data.statusSummary?.preparing || 0,
      ovStatusDelivery: data.statusSummary?.out_for_delivery || 0,
      ovStatusDelivered: data.statusSummary?.delivered || 0,
      ovTableSpots: data.tableSpots || 0,
      ovPendingTableReservations: data.pendingTableReservations || 0,
    };

    Object.entries(map).forEach(([id, value]) => {
      const node = qs(`#${id}`);
      if (node) node.textContent = value;
    });
  }

  function renderUsers() {
    const body = qs("#adminUsersBody");
    if (!body) return;

    if (!state.users.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="text-center kd-meta">Foydalanuvchilar topilmadi.</td></tr>';
      return;
    }

    body.innerHTML = state.users
      .map(
        (user) => `
      <tr>
        <td>${escapeHtml(user.fullName)}</td>
        <td>${escapeHtml(user.phone)}</td>
        <td>${escapeHtml(user.email || "-")}</td>
        <td>
          <select class="form-select form-select-sm user-role" data-id="${escapeHtml(
            user.id,
          )}">
            <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
            <option value="admin" ${
              user.role === "admin" ? "selected" : ""
            }>Admin</option>
          </select>
        </td>
        <td><input class="form-check-input user-active" type="checkbox" data-id="${escapeHtml(
          user.id,
        )}" ${user.isActive ? "checked" : ""}></td>
        <td>${user.orderCount || 0}</td>
        <td>${formatCurrency(user.totalSpent || 0)}</td>
      </tr>
    `,
      )
      .join("");
  }

  function renderMenu() {
    const body = qs("#adminMenuBody");
    if (!body) return;

    if (!state.menu.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="text-center kd-meta">Menu mavjud emas.</td></tr>';
      return;
    }

    body.innerHTML = state.menu
      .map(
        (item) => `
      <tr>
        <td><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(
          item.name,
        )}" style="width:52px;height:52px;object-fit:cover;border-radius:10px"></td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${item.isAvailable ? "Mavjud" : "Yopiq"}</td>
        <td>${item.isFeatured ? "Ha" : "Yo'q"}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="kd-btn-ghost kd-compact menu-edit" data-id="${escapeHtml(
              item._id,
            )}">Edit</button>
            <button class="kd-btn-outline kd-compact menu-delete" data-id="${escapeHtml(
              item._id,
            )}">Delete</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function renderOrders() {
    const body = qs("#adminOrdersBody");
    if (!body) return;

    if (!state.orders.length) {
      body.innerHTML =
        '<tr><td colspan="8" class="text-center kd-meta">Buyurtmalar topilmadi.</td></tr>';
      return;
    }

    body.innerHTML = state.orders
      .map((order) => {
        const customerName =
          order.customerSnapshot?.fullName || order.user?.fullName || "-";
        const customerPhone =
          order.customerSnapshot?.phone || order.user?.phone || "-";
        return `
          <tr>
            <td>
              <div class="fw-bold">${escapeHtml(order.orderNumber)}</div>
              <div class="kd-meta">${formatDate(order.createdAt)}</div>
              <div class="kd-meta">${order.items?.length || 0} ta taom</div>
            </td>
            <td>
              <div>${escapeHtml(customerName)}</div>
              <div class="kd-meta">${escapeHtml(customerPhone)}</div>
              <div class="kd-meta">${escapeHtml(
                order.customerSnapshot?.address || "-",
              )}</div>
            </td>
            <td>${formatCurrency(order.total)}</td>
            <td>${badgeHtml(order.payment?.status || "not_submitted")}</td>
            <td>
              <div class="d-flex flex-column gap-1">
                <select class="form-select form-select-sm order-status" data-id="${escapeHtml(
                  order.id,
                )}">
                  ${STATUS_OPTIONS.map((status) => optionTemplate(status, order.status)).join(
                    "",
                  )}
                </select>
                <button class="kd-btn-primary kd-compact order-status-save" data-id="${escapeHtml(
                  order.id,
                )}">Status saqlash</button>
              </div>
            </td>
            <td>
              ${
                order.payment?.proofUrl
                  ? `<a href="${escapeHtml(
                      order.payment.proofUrl,
                    )}" target="_blank" class="kd-btn-ghost kd-compact">Screenshot</a>`
                  : '<span class="kd-meta">Yoq</span>'
              }
              <div class="mt-1 kd-meta">${escapeHtml(order.payment?.note || "")}</div>
              <div class="d-flex gap-1 mt-1">
                <button class="kd-btn-primary kd-compact payment-approve" data-id="${escapeHtml(
                  order.id,
                )}">Tasdiqlash</button>
                <button class="kd-btn-outline kd-compact payment-reject" data-id="${escapeHtml(
                  order.id,
                )}">Rad etish</button>
              </div>
            </td>
            <td>
              <div class="d-grid gap-1" style="min-width:190px">
                <select class="form-select form-select-sm delivery-service" data-id="${escapeHtml(
                  order.id,
                )}">
                  <option value="internal" ${
                    order.delivery?.service === "internal" ? "selected" : ""
                  }>Kardeshler Express</option>
                  <option value="partner" ${
                    order.delivery?.service === "partner" ? "selected" : ""
                  }>Partner</option>
                </select>
                <input class="form-control form-control-sm delivery-rider" data-id="${escapeHtml(
                  order.id,
                )}" value="${escapeHtml(
          order.delivery?.riderName || "",
        )}" placeholder="Kuryer ismi">
                <input class="form-control form-control-sm delivery-phone" data-id="${escapeHtml(
                  order.id,
                )}" value="${escapeHtml(
          order.delivery?.riderPhone || "",
        )}" placeholder="Kuryer telefoni">
                <input class="form-control form-control-sm delivery-eta" data-id="${escapeHtml(
                  order.id,
                )}" type="number" min="0" value="${Number(
          order.delivery?.etaMinutes || 0,
        )}" placeholder="ETA (daq)">
                <input class="form-control form-control-sm delivery-tracking" data-id="${escapeHtml(
                  order.id,
                )}" value="${escapeHtml(
          order.delivery?.trackingCode || "",
        )}" placeholder="Tracking kod">
                <button class="kd-btn-ghost kd-compact delivery-save" data-id="${escapeHtml(
                  order.id,
                )}">Delivery saqlash</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderTablesList() {
    const body = qs("#adminTablesBody");
    if (!body) return;

    if (!state.tables.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="text-center kd-meta">Stollar mavjud emas.</td></tr>';
      return;
    }

    body.innerHTML = state.tables
      .map(
        (table) => `
      <tr>
        <td>${Number(table.number)}</td>
        <td>${escapeHtml(table.label || `Stol ${table.number}`)}</td>
        <td>${Number(table.capacity || 0)}</td>
        <td>${escapeHtml(table.zone || "-")}</td>
        <td>${table.shape === "round" ? "Doira" : "To'rtburchak"}</td>
        <td>${table.isActive ? "Ha" : "Yo'q"}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="kd-btn-ghost kd-compact table-edit" data-id="${escapeHtml(
              table._id,
            )}">Edit</button>
            <button class="kd-btn-outline kd-compact table-delete" data-id="${escapeHtml(
              table._id,
            )}">Delete</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function renderAdminTableMap() {
    const map = qs("#adminTableMap");
    if (!map) return;

    if (!state.tables.length) {
      map.innerHTML = '<div class="kd-empty">Stollarni qo\'shing.</div>';
      return;
    }

    map.innerHTML = state.tables
      .map((table) => {
        const left = Math.max(0, Math.min(Number(table.x) || 0, 0.95)) * 100;
        const top = Math.max(0, Math.min(Number(table.y) || 0, 0.95)) * 100;
        const width = Math.max(0.08, Math.min(Number(table.width) || 0.18, 0.4)) * 100;
        const height = Math.max(0.08, Math.min(Number(table.height) || 0.18, 0.4)) * 100;
        return `
          <button
            type="button"
            class="kd-table-spot ${escapeHtml(table.shape || "rect")} ${
          table.isActive ? "available" : "busy"
        }"
            data-id="${escapeHtml(table._id)}"
            style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;"
            title="Drag qilish mumkin"
          >
            <span>${escapeHtml(String(table.number))}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderTableReservations() {
    const body = qs("#adminTableReservationsBody");
    if (!body) return;

    if (!state.tableReservations.length) {
      body.innerHTML =
        '<tr><td colspan="7" class="text-center kd-meta">Stol bron so\'rovlari yo\'q.</td></tr>';
      return;
    }

    body.innerHTML = state.tableReservations
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.reservationCode)}</td>
        <td>
          <div>${escapeHtml(item.customerSnapshot?.fullName || item.user?.fullName || "-")}</div>
          <div class="kd-meta">${escapeHtml(item.customerSnapshot?.phone || item.user?.phone || "-")}</div>
        </td>
        <td>${escapeHtml(item.table?.label || `Stol ${item.table?.number || "-"}`)}</td>
        <td>${escapeHtml(item.visitDate)} ${escapeHtml(item.visitTime)}</td>
        <td>${Number(item.guestCount || 1)}</td>
        <td>${badgeHtml(item.status)}</td>
        <td>
          <div class="d-grid gap-1" style="min-width:170px">
            <select class="form-select form-select-sm reservation-status" data-id="${escapeHtml(
              item._id,
            )}">
              ${TABLE_RESERVATION_STATUSES.map((status) => optionTemplate(status, item.status)).join(
                "",
              )}
            </select>
            <input class="form-control form-control-sm reservation-note" data-id="${escapeHtml(
              item._id,
            )}" placeholder="Admin izoh" value="${escapeHtml(item.adminNote || "")}">
            <button class="kd-btn-primary kd-compact reservation-save" data-id="${escapeHtml(
              item._id,
            )}">Saqlash</button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  function setInputValue(id, value) {
    const node = qs(`#${id}`);
    if (!node) return;
    node.value = value || "";
  }

  function setImagePreview(id, url) {
    const node = qs(`#${id}`);
    if (!node) return;
    if (url) {
      node.setAttribute("src", url);
      node.classList.remove("d-none");
    } else {
      node.setAttribute("src", "");
      node.classList.add("d-none");
    }
  }

  function renderSettings() {
    if (!state.settings) return;

    const brand = state.settings.brand || {};
    const landing = state.settings.landing || {};
    const footer = state.settings.footer || {};
    const offline = state.settings.offlineService || {};
    const adminCard = state.settings.adminCard || {};

    setInputValue("settingsBrandName", brand.name);
    setInputValue("settingsBrandSlogan", brand.slogan);
    setInputValue("settingsSupportPhone", brand.supportPhone);
    setInputValue("settingsSupportTelegram", brand.supportTelegram);

    setInputValue("settingsHeroBadge", landing.badge);
    setInputValue("settingsHeroTitle", landing.heroTitle);
    setInputValue("settingsHeroSubtitle", landing.heroSubtitle);
    setInputValue("settingsQuickPlaceholder", landing.quickOrderPlaceholder);
    setInputValue("settingsCtaMenu", landing.ctaMenuText);
    setInputValue("settingsCtaOrder", landing.ctaOrderText);
    setInputValue("settingsCtaTable", landing.ctaTableText);
    setInputValue("settingsFeature1Title", landing.feature1Title);
    setInputValue("settingsFeature1Description", landing.feature1Description);
    setInputValue("settingsFeature2Title", landing.feature2Title);
    setInputValue("settingsFeature2Description", landing.feature2Description);
    setInputValue("settingsFeature3Title", landing.feature3Title);
    setInputValue("settingsFeature3Description", landing.feature3Description);
    setInputValue("settingsFeature4Title", landing.feature4Title);
    setInputValue("settingsFeature4Description", landing.feature4Description);
    setInputValue("settingsWhyTitle", landing.whyChooseTitle);
    setInputValue("settingsFeaturedTitle", landing.featuredTitle);
    setInputValue("settingsProcessTitle", landing.processTitle);
    setInputValue("settingsStep1Title", landing.processStep1Title);
    setInputValue("settingsStep1Description", landing.processStep1Description);
    setInputValue("settingsStep2Title", landing.processStep2Title);
    setInputValue("settingsStep2Description", landing.processStep2Description);
    setInputValue("settingsStep3Title", landing.processStep3Title);
    setInputValue("settingsStep3Description", landing.processStep3Description);
    setInputValue("settingsPaymentTitle", landing.paymentBannerTitle);
    setInputValue("settingsPaymentText", landing.paymentBannerText);
    setInputValue("settingsPaymentButton", landing.paymentBannerButtonText);
    setInputValue("settingsOfflineTitle", landing.offlineTitle);
    setInputValue("settingsOfflineDescription", landing.offlineDescription);
    setInputValue("settingsOfflineButton", landing.offlineButtonText);
    setInputValue("settingsTestimonialsTitle", landing.testimonialsTitle);
    setInputValue("settingsTestimonial1Quote", landing.testimonial1Quote);
    setInputValue("settingsTestimonial1Author", landing.testimonial1Author);
    setInputValue("settingsTestimonial2Quote", landing.testimonial2Quote);
    setInputValue("settingsTestimonial2Author", landing.testimonial2Author);
    setInputValue("settingsTestimonial3Quote", landing.testimonial3Quote);
    setInputValue("settingsTestimonial3Author", landing.testimonial3Author);
    setInputValue("settingsTestimonial4Quote", landing.testimonial4Quote);
    setInputValue("settingsTestimonial4Author", landing.testimonial4Author);

    setInputValue("settingsFooterTitle", footer.title);
    setInputValue("settingsFooterLegal", footer.legalLine);
    setInputValue("settingsFooterDescription", footer.description);
    setInputValue("settingsAddress", footer.address || offline.address);
    setInputValue("settingsFooterPhone", footer.phone || brand.supportPhone);
    setInputValue("settingsFooterEmail", footer.email);
    setInputValue("settingsFooterTelegram", footer.telegram || brand.supportTelegram);
    setInputValue("settingsMapEmbed", footer.mapEmbedUrl || offline.mapEmbedUrl);
    setInputValue("settingsMapLink", footer.mapLink || offline.mapLink);
    setInputValue("settingsWorkingHours", offline.workingHours);
    setInputValue(
      "settingsReservationSlots",
      Array.isArray(offline.reservationSlots)
        ? offline.reservationSlots.join(", ")
        : "",
    );

    setInputValue("settingsCardNumber", adminCard.cardNumber);
    setInputValue("settingsCardHolder", adminCard.cardHolder);
    setInputValue("settingsBankName", adminCard.bankName);
    setInputValue("settingsCardNote", adminCard.note);

    setImagePreview("brandLogoPreview", brand.logoUrl || "");
    setImagePreview("brandLogoDarkPreview", brand.logoDarkUrl || "");
    setImagePreview("brandFaviconPreview", brand.faviconUrl || "");
  }

  async function loadSettings() {
    state.settings = await api("/api/admin/settings");
    renderSettings();
  }

  async function uploadBrandAsset(assetType, file) {
    if (!file) return;
    const formData = new FormData();
    formData.set("assetType", assetType);
    formData.set("asset", file);
    await api("/api/admin/settings/asset", {
      method: "POST",
      body: formData,
    });
  }

  function collectSettingsPayload() {
    return {
      brand: {
        name: qs("#settingsBrandName")?.value || "",
        slogan: qs("#settingsBrandSlogan")?.value || "",
        supportPhone: qs("#settingsSupportPhone")?.value || "",
        supportTelegram: qs("#settingsSupportTelegram")?.value || "",
      },
      landing: {
        badge: qs("#settingsHeroBadge")?.value || "",
        heroTitle: qs("#settingsHeroTitle")?.value || "",
        heroSubtitle: qs("#settingsHeroSubtitle")?.value || "",
        quickOrderPlaceholder: qs("#settingsQuickPlaceholder")?.value || "",
        ctaMenuText: qs("#settingsCtaMenu")?.value || "",
        ctaOrderText: qs("#settingsCtaOrder")?.value || "",
        ctaTableText: qs("#settingsCtaTable")?.value || "",
        feature1Title: qs("#settingsFeature1Title")?.value || "",
        feature1Description: qs("#settingsFeature1Description")?.value || "",
        feature2Title: qs("#settingsFeature2Title")?.value || "",
        feature2Description: qs("#settingsFeature2Description")?.value || "",
        feature3Title: qs("#settingsFeature3Title")?.value || "",
        feature3Description: qs("#settingsFeature3Description")?.value || "",
        feature4Title: qs("#settingsFeature4Title")?.value || "",
        feature4Description: qs("#settingsFeature4Description")?.value || "",
        whyChooseTitle: qs("#settingsWhyTitle")?.value || "",
        featuredTitle: qs("#settingsFeaturedTitle")?.value || "",
        processTitle: qs("#settingsProcessTitle")?.value || "",
        processStep1Title: qs("#settingsStep1Title")?.value || "",
        processStep1Description: qs("#settingsStep1Description")?.value || "",
        processStep2Title: qs("#settingsStep2Title")?.value || "",
        processStep2Description: qs("#settingsStep2Description")?.value || "",
        processStep3Title: qs("#settingsStep3Title")?.value || "",
        processStep3Description: qs("#settingsStep3Description")?.value || "",
        paymentBannerTitle: qs("#settingsPaymentTitle")?.value || "",
        paymentBannerText: qs("#settingsPaymentText")?.value || "",
        paymentBannerButtonText: qs("#settingsPaymentButton")?.value || "",
        offlineTitle: qs("#settingsOfflineTitle")?.value || "",
        offlineDescription: qs("#settingsOfflineDescription")?.value || "",
        offlineButtonText: qs("#settingsOfflineButton")?.value || "",
        testimonialsTitle: qs("#settingsTestimonialsTitle")?.value || "",
        testimonial1Quote: qs("#settingsTestimonial1Quote")?.value || "",
        testimonial1Author: qs("#settingsTestimonial1Author")?.value || "",
        testimonial2Quote: qs("#settingsTestimonial2Quote")?.value || "",
        testimonial2Author: qs("#settingsTestimonial2Author")?.value || "",
        testimonial3Quote: qs("#settingsTestimonial3Quote")?.value || "",
        testimonial3Author: qs("#settingsTestimonial3Author")?.value || "",
        testimonial4Quote: qs("#settingsTestimonial4Quote")?.value || "",
        testimonial4Author: qs("#settingsTestimonial4Author")?.value || "",
      },
      footer: {
        title: qs("#settingsFooterTitle")?.value || "",
        legalLine: qs("#settingsFooterLegal")?.value || "",
        description: qs("#settingsFooterDescription")?.value || "",
        address: qs("#settingsAddress")?.value || "",
        phone: qs("#settingsFooterPhone")?.value || "",
        email: qs("#settingsFooterEmail")?.value || "",
        telegram: qs("#settingsFooterTelegram")?.value || "",
        mapEmbedUrl: qs("#settingsMapEmbed")?.value || "",
        mapLink: qs("#settingsMapLink")?.value || "",
      },
      offlineService: {
        enabled: true,
        workingHours: qs("#settingsWorkingHours")?.value || "",
        address: qs("#settingsAddress")?.value || "",
        mapEmbedUrl: qs("#settingsMapEmbed")?.value || "",
        mapLink: qs("#settingsMapLink")?.value || "",
        reservationSlots: qs("#settingsReservationSlots")?.value || "",
      },
      adminCard: {
        cardNumber: qs("#settingsCardNumber")?.value || "",
        cardHolder: qs("#settingsCardHolder")?.value || "",
        bankName: qs("#settingsBankName")?.value || "",
        note: qs("#settingsCardNote")?.value || "",
      },
    };
  }

  async function loadOverview() {
    const data = await api("/api/admin/overview");
    setOverview(data);
  }

  async function loadUsers() {
    state.users = await api("/api/admin/users");
    renderUsers();
  }

  async function loadMenu() {
    state.menu = await api("/api/menu?limit=300");
    renderMenu();
  }

  async function loadOrders() {
    const params = new URLSearchParams();
    const status = qs("#orderStatusFilter")?.value || "all";
    const paymentStatus = qs("#orderPaymentFilter")?.value || "all";
    if (status !== "all") params.set("status", status);
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);

    const query = params.toString();
    state.orders = await api(`/api/admin/orders${query ? `?${query}` : ""}`);
    renderOrders();
  }

  async function loadTables() {
    state.tables = await api("/api/admin/tables");
    renderTablesList();
    renderAdminTableMap();
  }

  async function loadTableReservations() {
    const status = qs("#tableReservationStatusFilter")?.value || "all";
    const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
    state.tableReservations = await api(`/api/admin/tables/reservations${query}`);
    renderTableReservations();
  }

  async function loadAll() {
    try {
      await Promise.all([
        loadOverview(),
        loadUsers(),
        loadMenu(),
        loadOrders(),
        loadTables(),
        loadTableReservations(),
        loadSettings(),
      ]);
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function persistTablePosition(id, x, y) {
    try {
      await api(`/api/admin/tables/${id}`, {
        method: "PUT",
        body: JSON.stringify({ x, y }),
      });
      toast("Stol joylashuvi saqlandi.", "success");
      await loadTables();
    } catch (error) {
      toast(error.message, "error");
      await loadTables();
    }
  }

  qs("#adminTableMap")?.addEventListener("pointerdown", (event) => {
    const spot = event.target.closest(".kd-table-spot");
    if (!spot) return;

    const container = qs("#adminTableMap");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const spotRect = spot.getBoundingClientRect();

    dragState = {
      id: spot.dataset.id,
      spot,
      container,
      offsetX: event.clientX - spotRect.left,
      offsetY: event.clientY - spotRect.top,
      containerRect: rect,
    };

    spot.classList.add("dragging");
    spot.setPointerCapture(event.pointerId);
  });

  qs("#adminTableMap")?.addEventListener("pointermove", (event) => {
    if (!dragState) return;

    const { containerRect, spot, offsetX, offsetY } = dragState;
    const xPx = event.clientX - containerRect.left - offsetX;
    const yPx = event.clientY - containerRect.top - offsetY;

    const widthPx = spot.offsetWidth;
    const heightPx = spot.offsetHeight;
    const clampedX = Math.max(0, Math.min(xPx, containerRect.width - widthPx));
    const clampedY = Math.max(0, Math.min(yPx, containerRect.height - heightPx));

    spot.style.left = `${(clampedX / containerRect.width) * 100}%`;
    spot.style.top = `${(clampedY / containerRect.height) * 100}%`;
  });

  qs("#adminTableMap")?.addEventListener("pointerup", async (event) => {
    if (!dragState) return;

    const { spot, containerRect, id } = dragState;
    spot.classList.remove("dragging");

    const leftPercent = Number.parseFloat(spot.style.left || "0") || 0;
    const topPercent = Number.parseFloat(spot.style.top || "0") || 0;
    const table = state.tables.find((item) => item._id === id);

    dragState = null;

    if (!table) return;

    const widthRatio = (spot.offsetWidth || 0) / (containerRect.width || 1);
    const heightRatio = (spot.offsetHeight || 0) / (containerRect.height || 1);
    const x = Math.max(0, Math.min(leftPercent / 100, 0.95));
    const y = Math.max(0, Math.min(topPercent / 100, 0.95));

    try {
      await api(`/api/admin/tables/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          x,
          y,
          width: Math.max(0.08, Math.min(widthRatio || table.width || 0.18, 0.4)),
          height: Math.max(0.08, Math.min(heightRatio || table.height || 0.18, 0.4)),
        }),
      });

      toast("Stol pozitsiyasi yangilandi.", "success");
      await loadTables();
    } catch (error) {
      toast(error.message, "error");
      await loadTables();
    }
  });

  qs("#adminUsersBody")?.addEventListener("change", async (event) => {
    const rowTarget = event.target;
    const id = rowTarget.dataset.id;
    if (!id) return;

    const role = qs(`.user-role[data-id='${id}']`)?.value || "user";
    const isActive = Boolean(qs(`.user-active[data-id='${id}']`)?.checked);

    try {
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role, isActive }),
      });
      toast("Foydalanuvchi yangilandi.", "success");
      loadUsers();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  qs("#adminMenuBody")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".menu-edit");
    const deleteButton = event.target.closest(".menu-delete");

    if (editButton) {
      const target = state.menu.find((item) => item._id === editButton.dataset.id);
      if (!target) return;
      qs("#menuId").value = target._id;
      qs("#menuName").value = target.name || "";
      qs("#menuDescription").value = target.description || "";
      qs("#menuCategory").value = target.category || "";
      qs("#menuPrice").value = target.price || 0;
      qs("#menuSpicyLevel").value = target.spicyLevel || "Oddiy";
      qs("#menuPrepTime").value = target.prepTime || 12;
      qs("#menuImageUrl").value = target.imageUrl || "";
      qs("#menuAvailable").checked = Boolean(target.isAvailable);
      qs("#menuFeatured").checked = Boolean(target.isFeatured);
      qs("#menuTags").value = (target.tags || []).join(", ");
      qs("#menuFormTitle").textContent = "Menu itemni tahrirlash";
      return;
    }

    if (deleteButton) {
      const yes = window.confirm("Haqiqatan ham ushbu menu itemni o'chirasizmi?");
      if (!yes) return;
      try {
        await api(`/api/admin/menu/${deleteButton.dataset.id}`, { method: "DELETE" });
        toast("Menu item o'chirildi.", "success");
        await loadMenu();
      } catch (error) {
        toast(error.message, "error");
      }
    }
  });

  qs("#menuCancelEdit")?.addEventListener("click", () => {
    qs("#menuForm")?.reset();
    qs("#menuId").value = "";
    qs("#menuFormTitle").textContent = "Yangi menu item";
  });

  qs("#menuForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("isAvailable", String(qs("#menuAvailable")?.checked || false));
    formData.set("isFeatured", String(qs("#menuFeatured")?.checked || false));

    const menuId = String(qs("#menuId")?.value || "").trim();

    try {
      if (menuId) {
        await api(`/api/admin/menu/${menuId}`, {
          method: "PUT",
          body: formData,
        });
        toast("Menu item yangilandi.", "success");
      } else {
        await api("/api/admin/menu", {
          method: "POST",
          body: formData,
        });
        toast("Menu item yaratildi.", "success");
      }

      form.reset();
      qs("#menuId").value = "";
      qs("#menuFormTitle").textContent = "Yangi menu item";
      await loadMenu();
      await loadOverview();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  qs("#adminOrdersBody")?.addEventListener("click", async (event) => {
    const statusButton = event.target.closest(".order-status-save");
    const approveButton = event.target.closest(".payment-approve");
    const rejectButton = event.target.closest(".payment-reject");
    const deliveryButton = event.target.closest(".delivery-save");

    if (statusButton) {
      const id = statusButton.dataset.id;
      const status = qs(`.order-status[data-id='${id}']`)?.value;
      try {
        await api(`/api/admin/orders/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        toast("Order status yangilandi.", "success");
        await loadOrders();
        await loadOverview();
      } catch (error) {
        toast(error.message, "error");
      }
      return;
    }

    if (approveButton) {
      try {
        await api(`/api/admin/orders/${approveButton.dataset.id}/payment`, {
          method: "PATCH",
          body: JSON.stringify({ action: "approve" }),
        });
        toast("To'lov tasdiqlandi.", "success");
        await loadOrders();
        await loadOverview();
      } catch (error) {
        toast(error.message, "error");
      }
      return;
    }

    if (rejectButton) {
      const reason = window.prompt("Rad etish sababi:", "Screenshot noaniq");
      if (reason === null) return;
      try {
        await api(`/api/admin/orders/${rejectButton.dataset.id}/payment`, {
          method: "PATCH",
          body: JSON.stringify({ action: "reject", rejectReason: reason }),
        });
        toast("To'lov rad etildi.", "success");
        await loadOrders();
        await loadOverview();
      } catch (error) {
        toast(error.message, "error");
      }
      return;
    }

    if (deliveryButton) {
      const id = deliveryButton.dataset.id;
      const payload = {
        service: qs(`.delivery-service[data-id='${id}']`)?.value || "internal",
        riderName: qs(`.delivery-rider[data-id='${id}']`)?.value || "",
        riderPhone: qs(`.delivery-phone[data-id='${id}']`)?.value || "",
        etaMinutes: Number(qs(`.delivery-eta[data-id='${id}']`)?.value || 0),
        trackingCode: qs(`.delivery-tracking[data-id='${id}']`)?.value || "",
      };

      try {
        await api(`/api/admin/orders/${id}/delivery`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast("Delivery ma'lumotlari saqlandi.", "success");
      } catch (error) {
        toast(error.message, "error");
      }
    }
  });

  qs("#adminTablesBody")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".table-edit");
    const deleteButton = event.target.closest(".table-delete");

    if (editButton) {
      const table = state.tables.find((item) => item._id === editButton.dataset.id);
      if (!table) return;
      qs("#tableId").value = table._id;
      qs("#tableNumber").value = table.number;
      qs("#tableLabel").value = table.label || "";
      qs("#tableCapacity").value = table.capacity || 4;
      qs("#tableZone").value = table.zone || "Asosiy zal";
      qs("#tableShape").value = table.shape || "rect";
      qs("#tableActive").checked = Boolean(table.isActive);
      qs("#tableFormTitle").textContent = `Stol ${table.number} tahrirlash`;
      return;
    }

    if (deleteButton) {
      const ok = window.confirm("Stolni o'chirishni tasdiqlaysizmi?");
      if (!ok) return;
      try {
        await api(`/api/admin/tables/${deleteButton.dataset.id}`, { method: "DELETE" });
        toast("Stol o'chirildi.", "success");
        await loadTables();
        await loadOverview();
      } catch (error) {
        toast(error.message, "error");
      }
    }
  });

  qs("#tableCancelEdit")?.addEventListener("click", () => {
    qs("#tableForm")?.reset();
    qs("#tableId").value = "";
    qs("#tableFormTitle").textContent = "Yangi stol qo'shish";
    qs("#tableCapacity").value = 4;
    qs("#tableZone").value = "Asosiy zal";
    qs("#tableShape").value = "rect";
    qs("#tableActive").checked = true;
  });

  qs("#tableForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const tableId = String(qs("#tableId")?.value || "").trim();
    const payload = {
      number: Number(qs("#tableNumber")?.value || 1),
      label: qs("#tableLabel")?.value || "",
      capacity: Number(qs("#tableCapacity")?.value || 4),
      zone: qs("#tableZone")?.value || "Asosiy zal",
      shape: qs("#tableShape")?.value || "rect",
      isActive: Boolean(qs("#tableActive")?.checked),
    };

    try {
      if (tableId) {
        await api(`/api/admin/tables/${tableId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast("Stol yangilandi.", "success");
      } else {
        await api("/api/admin/tables", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Stol qo'shildi.", "success");
      }

      qs("#tableForm")?.reset();
      qs("#tableId").value = "";
      qs("#tableFormTitle").textContent = "Yangi stol qo'shish";
      qs("#tableCapacity").value = 4;
      qs("#tableZone").value = "Asosiy zal";
      qs("#tableShape").value = "rect";
      qs("#tableActive").checked = true;

      await loadTables();
      await loadOverview();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  qs("#adminTableReservationsBody")?.addEventListener("click", async (event) => {
    const saveButton = event.target.closest(".reservation-save");
    if (!saveButton) return;

    const id = saveButton.dataset.id;
    const status = qs(`.reservation-status[data-id='${id}']`)?.value;
    const adminNote = qs(`.reservation-note[data-id='${id}']`)?.value || "";

    try {
      await api(`/api/admin/tables/reservations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      toast("Rezervatsiya yangilandi.", "success");
      await loadTableReservations();
      await loadOverview();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  qs("#siteSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = qs("#siteSettingsSaveButton");
    if (saveButton) saveButton.disabled = true;

    try {
      const payload = collectSettingsPayload();
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await uploadBrandAsset("logo", qs("#brandLogoFile")?.files?.[0]);
      await uploadBrandAsset("logoDark", qs("#brandLogoDarkFile")?.files?.[0]);
      await uploadBrandAsset("favicon", qs("#brandFaviconFile")?.files?.[0]);

      if (qs("#brandLogoFile")) qs("#brandLogoFile").value = "";
      if (qs("#brandLogoDarkFile")) qs("#brandLogoDarkFile").value = "";
      if (qs("#brandFaviconFile")) qs("#brandFaviconFile").value = "";

      await loadSettings();
      await window.KDApp.reloadSiteSettings?.();
      toast("Sayt sozlamalari saqlandi.", "success");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  });

  qs("#orderStatusFilter")?.addEventListener("change", loadOrders);
  qs("#orderPaymentFilter")?.addEventListener("change", loadOrders);
  qs("#tableReservationStatusFilter")?.addEventListener("change", loadTableReservations);

  loadAll();
});

document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const {
    api,
    qs,
    escapeHtml,
    formatCurrency,
    formatDate,
    badgeHtml,
    toast,
  } = window.KDApp;

  const state = {
    users: [],
    menu: [],
    orders: [],
  };

  const STATUS_OPTIONS = [
    "new",
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  function optionTemplate(value, selected) {
    return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(window.KDApp.statusText(value))}</option>`;
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
      body.innerHTML = '<tr><td colspan="7" class="text-center kd-meta">Foydalanuvchilar topilmadi.</td></tr>';
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
          <select class="form-select form-select-sm user-role" data-id="${escapeHtml(user.id)}">
            <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td><input class="form-check-input user-active" type="checkbox" data-id="${escapeHtml(user.id)}" ${user.isActive ? "checked" : ""}></td>
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
      body.innerHTML = '<tr><td colspan="7" class="text-center kd-meta">Menu mavjud emas.</td></tr>';
      return;
    }

    body.innerHTML = state.menu
      .map(
        (item) => `
      <tr>
        <td><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width:52px;height:52px;object-fit:cover;border-radius:10px"></td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${item.isAvailable ? "Mavjud" : "Yopiq"}</td>
        <td>${item.isFeatured ? "Ha" : "Yo'q"}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="kd-btn-ghost kd-compact menu-edit" data-id="${escapeHtml(item._id)}">Edit</button>
            <button class="kd-btn-outline kd-compact menu-delete" data-id="${escapeHtml(item._id)}">Delete</button>
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
      body.innerHTML = '<tr><td colspan="8" class="text-center kd-meta">Buyurtmalar topilmadi.</td></tr>';
      return;
    }

    body.innerHTML = state.orders
      .map((order) => {
        const customerName = order.customerSnapshot?.fullName || order.user?.fullName || "-";
        const customerPhone = order.customerSnapshot?.phone || order.user?.phone || "-";
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
              <div class="kd-meta">${escapeHtml(order.customerSnapshot?.address || "-")}</div>
            </td>
            <td>${formatCurrency(order.total)}</td>
            <td>${badgeHtml(order.payment?.status || "not_submitted")}</td>
            <td>
              <div class="d-flex flex-column gap-1">
                <select class="form-select form-select-sm order-status" data-id="${escapeHtml(order.id)}">
                  ${STATUS_OPTIONS.map((status) => optionTemplate(status, order.status)).join("")}
                </select>
                <button class="kd-btn-primary kd-compact order-status-save" data-id="${escapeHtml(order.id)}">Status saqlash</button>
              </div>
            </td>
            <td>
              ${order.payment?.proofUrl ? `<a href="${escapeHtml(order.payment.proofUrl)}" target="_blank" class="kd-btn-ghost kd-compact">Screenshot</a>` : '<span class="kd-meta">Yoq</span>'}
              <div class="mt-1 kd-meta">${escapeHtml(order.payment?.note || "")}</div>
              <div class="d-flex gap-1 mt-1">
                <button class="kd-btn-primary kd-compact payment-approve" data-id="${escapeHtml(order.id)}">Tasdiqlash</button>
                <button class="kd-btn-outline kd-compact payment-reject" data-id="${escapeHtml(order.id)}">Rad etish</button>
              </div>
            </td>
            <td>
              <div class="d-grid gap-1" style="min-width:190px">
                <select class="form-select form-select-sm delivery-service" data-id="${escapeHtml(order.id)}">
                  <option value="internal" ${order.delivery?.service === "internal" ? "selected" : ""}>Kardeshler Express</option>
                  <option value="partner" ${order.delivery?.service === "partner" ? "selected" : ""}>Partner</option>
                </select>
                <input class="form-control form-control-sm delivery-rider" data-id="${escapeHtml(order.id)}" value="${escapeHtml(order.delivery?.riderName || "")}" placeholder="Kuryer ismi">
                <input class="form-control form-control-sm delivery-phone" data-id="${escapeHtml(order.id)}" value="${escapeHtml(order.delivery?.riderPhone || "")}" placeholder="Kuryer telefoni">
                <input class="form-control form-control-sm delivery-eta" data-id="${escapeHtml(order.id)}" type="number" min="0" value="${Number(order.delivery?.etaMinutes || 0)}" placeholder="ETA (daq)">
                <input class="form-control form-control-sm delivery-tracking" data-id="${escapeHtml(order.id)}" value="${escapeHtml(order.delivery?.trackingCode || "")}" placeholder="Tracking kod">
                <button class="kd-btn-ghost kd-compact delivery-save" data-id="${escapeHtml(order.id)}">Delivery saqlash</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
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

  async function loadAll() {
    try {
      await Promise.all([loadOverview(), loadUsers(), loadMenu(), loadOrders()]);
    } catch (error) {
      toast(error.message, "error");
    }
  }

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

  qs("#orderStatusFilter")?.addEventListener("change", loadOrders);
  qs("#orderPaymentFilter")?.addEventListener("change", loadOrders);

  loadAll();
});

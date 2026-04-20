document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, escapeHtml, formatCurrency, formatDate, badgeHtml, toast, parseQuery } =
    window.KDApp;

  const cardNumber = qs("#adminCardNumber");
  const cardHolder = qs("#adminCardHolder");
  const bankName = qs("#adminBankName");
  const cardNote = qs("#adminCardNote");
  const orderList = qs("#paymentOrderList");
  const uploadForm = qs("#paymentUploadForm");
  const proofInput = qs("#proofFile");
  const preview = qs("#proofPreview");

  let selectedOrderId = "";
  let myOrders = [];

  function orderOptionTemplate(order) {
    return `
      <label class="kd-order-option ${selectedOrderId === order.id ? "active" : ""}">
        <input class="d-none" type="radio" name="paymentOrder" value="${escapeHtml(order.id)}" ${selectedOrderId === order.id ? "checked" : ""}>
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong>${escapeHtml(order.orderNumber)}</strong>
          ${badgeHtml(order.payment?.status || "not_submitted")}
        </div>
        <div class="kd-meta">Jami: ${formatCurrency(order.total)}</div>
        <div class="kd-meta">${formatDate(order.createdAt)}</div>
      </label>
    `;
  }

  function renderOrderOptions() {
    if (!orderList) return;

    if (!myOrders.length) {
      orderList.innerHTML = `<div class="kd-empty">Screenshot yuborilishi kerak bo'lgan buyurtmalar yo'q.</div>`;
      return;
    }

    const waitingOrders = myOrders.filter((order) => order.payment?.status !== "approved");
    if (!waitingOrders.length) {
      orderList.innerHTML = `<div class="kd-empty">Barcha to'lovlar tasdiqlangan.</div>`;
      return;
    }

    if (!selectedOrderId) {
      selectedOrderId = waitingOrders[0].id;
    }

    orderList.innerHTML = `<div class="kd-orders-list">${waitingOrders
      .map(orderOptionTemplate)
      .join("")}</div>`;
  }

  async function loadSettings() {
    try {
      const settings = await api("/api/settings");
      if (cardNumber) cardNumber.textContent = settings.adminCard?.cardNumber || "-";
      if (cardHolder) cardHolder.textContent = settings.adminCard?.cardHolder || "-";
      if (bankName) bankName.textContent = settings.adminCard?.bankName || "-";
      if (cardNote) cardNote.textContent = settings.adminCard?.note || "-";
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function loadOrders() {
    try {
      const orders = await api("/api/orders/my");
      myOrders = orders;
      renderOrderOptions();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  orderList?.addEventListener("change", (event) => {
    const input = event.target.closest("input[name='paymentOrder']");
    if (!input) return;
    selectedOrderId = input.value;
    renderOrderOptions();
  });

  proofInput?.addEventListener("change", () => {
    const file = proofInput.files?.[0];
    if (!file || !preview) return;

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${escapeHtml(reader.result)}" alt="Payment screenshot">`;
    };
    reader.readAsDataURL(file);
  });

  uploadForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = proofInput?.files?.[0];
    if (!selectedOrderId) {
      toast("Buyurtmani tanlang.", "error");
      return;
    }
    if (!file) {
      toast("Screenshot tanlang.", "error");
      return;
    }

    const data = new FormData(uploadForm);

    try {
      await api(`/api/orders/${selectedOrderId}/payment-proof`, {
        method: "POST",
        body: data,
      });
      toast("Screenshot yuborildi. Admin tasdiqini kuting.", "success");
      uploadForm.reset();
      if (preview) preview.innerHTML = "";
      await loadOrders();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  const fromQuery = parseQuery().get("order");
  if (fromQuery) {
    selectedOrderId = fromQuery;
  }

  loadSettings();
  loadOrders();
});

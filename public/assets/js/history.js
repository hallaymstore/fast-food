document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, formatCurrency, formatDate, badgeHtml, escapeHtml, toast } = window.KDApp;

  const tableBody = qs("#historyTableBody");
  const filterStatus = qs("#historyStatusFilter");

  let orders = [];

  function render() {
    if (!tableBody) return;

    const activeStatus = String(filterStatus?.value || "all");
    const filtered =
      activeStatus === "all" ? orders : orders.filter((order) => order.status === activeStatus);

    if (!filtered.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="text-center kd-meta">Buyurtma tarixi topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered
      .map(
        (order) => `
      <tr>
        <td>${escapeHtml(order.orderNumber)}</td>
        <td>${formatDate(order.createdAt)}</td>
        <td>${order.items?.length || 0}</td>
        <td>${formatCurrency(order.total)}</td>
        <td>${badgeHtml(order.status)}</td>
        <td>${badgeHtml(order.payment?.status || "not_submitted")}</td>
        <td>${escapeHtml(order.delivery?.service || "internal")}</td>
      </tr>
    `,
      )
      .join("");
  }

  async function loadHistory() {
    try {
      orders = await api("/api/orders/my");
      render();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  filterStatus?.addEventListener("change", render);
  loadHistory();
});

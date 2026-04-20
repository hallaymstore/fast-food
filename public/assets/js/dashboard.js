document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, formatCurrency, formatDate, badgeHtml, escapeHtml, toast } = window.KDApp;

  const statTotal = qs("#statTotal");
  const statPendingPayment = qs("#statPendingPayment");
  const statPreparing = qs("#statPreparing");
  const statDelivery = qs("#statDelivery");
  const statDelivered = qs("#statDelivered");
  const statSpent = qs("#statSpent");
  const recentOrders = qs("#recentOrders");

  function rowTemplate(order) {
    return `
      <tr>
        <td>${escapeHtml(order.orderNumber)}</td>
        <td>${formatDate(order.createdAt)}</td>
        <td>${formatCurrency(order.total)}</td>
        <td>${badgeHtml(order.status)}</td>
        <td>${badgeHtml(order.payment?.status || "not_submitted")}</td>
      </tr>
    `;
  }

  async function loadDashboard() {
    try {
      const data = await api("/api/dashboard/me");

      if (statTotal) statTotal.textContent = data.counters?.total ?? 0;
      if (statPendingPayment) statPendingPayment.textContent = data.counters?.pendingPayment ?? 0;
      if (statPreparing) statPreparing.textContent = data.counters?.preparing ?? 0;
      if (statDelivery) statDelivery.textContent = data.counters?.outForDelivery ?? 0;
      if (statDelivered) statDelivered.textContent = data.counters?.delivered ?? 0;
      if (statSpent) statSpent.textContent = formatCurrency(data.spent || 0);

      if (!recentOrders) return;
      if (!data.recent?.length) {
        recentOrders.innerHTML = `<tr><td colspan="5" class="text-center kd-meta">Hozircha buyurtmalar mavjud emas.</td></tr>`;
        return;
      }

      recentOrders.innerHTML = data.recent.map(rowTemplate).join("");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  loadDashboard();
});

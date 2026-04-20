document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const {
    api,
    qs,
    getCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartTotal,
    formatCurrency,
    escapeHtml,
    toast,
    ensureAuth,
    getCurrentUser,
  } = window.KDApp;

  const cartContainer = qs("#orderCartList");
  const subtotalNode = qs("#orderSubtotal");
  const deliveryFeeNode = qs("#orderDeliveryFee");
  const totalNode = qs("#orderTotal");
  const orderForm = qs("#placeOrderForm");
  const orderResult = qs("#orderResult");

  const DELIVERY_FEE = 12000;

  function resolveDeliveryFee() {
    const deliveryType = String(qs("#deliveryType")?.value || "courier");
    return deliveryType === "pickup" ? 0 : DELIVERY_FEE;
  }

  function renderCart() {
    const cart = getCart();

    if (!cartContainer) return;
    if (!cart.length) {
      cartContainer.innerHTML = `<div class="kd-empty">Savat bo'sh. Menudan taom qo'shing.</div>`;
      updateSummary();
      return;
    }

    cartContainer.innerHTML = cart
      .map(
        (item) => `
        <div class="d-flex gap-3 align-items-center kd-panel p-2 mb-2">
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width:64px;height:64px;object-fit:cover;border-radius:12px;">
          <div class="flex-grow-1">
            <div class="fw-bold">${escapeHtml(item.name)}</div>
            <div class="kd-meta">${formatCurrency(item.price)}</div>
          </div>
          <div class="d-flex align-items-center gap-1">
            <button class="kd-btn-ghost cart-minus" data-id="${escapeHtml(item.id)}">-</button>
            <span class="px-2">${item.quantity}</span>
            <button class="kd-btn-ghost cart-plus" data-id="${escapeHtml(item.id)}">+</button>
          </div>
          <div class="fw-bold">${formatCurrency(item.price * item.quantity)}</div>
          <button class="kd-btn-outline cart-remove" data-id="${escapeHtml(item.id)}">O'chirish</button>
        </div>
      `,
      )
      .join("");

    updateSummary();
  }

  function updateSummary() {
    const subtotal = cartTotal();
    const deliveryFee = resolveDeliveryFee();
    const total = subtotal + deliveryFee;

    if (subtotalNode) subtotalNode.textContent = formatCurrency(subtotal);
    if (deliveryFeeNode) deliveryFeeNode.textContent = formatCurrency(deliveryFee);
    if (totalNode) totalNode.textContent = formatCurrency(total);
  }

  cartContainer?.addEventListener("click", (event) => {
    const plus = event.target.closest(".cart-plus");
    const minus = event.target.closest(".cart-minus");
    const remove = event.target.closest(".cart-remove");

    const cart = getCart();

    if (plus) {
      const item = cart.find((entry) => entry.id === plus.dataset.id);
      if (!item) return;
      updateCartQty(item.id, item.quantity + 1);
      renderCart();
      return;
    }

    if (minus) {
      const item = cart.find((entry) => entry.id === minus.dataset.id);
      if (!item) return;
      if (item.quantity <= 1) {
        removeFromCart(item.id);
      } else {
        updateCartQty(item.id, item.quantity - 1);
      }
      renderCart();
      return;
    }

    if (remove) {
      removeFromCart(remove.dataset.id);
      renderCart();
    }
  });

  qs("#deliveryType")?.addEventListener("change", updateSummary);

  orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const cart = getCart();
    if (!cart.length) {
      toast("Savat bo'sh.", "error");
      return;
    }

    const authed = await ensureAuth();
    if (!authed) return;

    const user = getCurrentUser();
    const form = new FormData(orderForm);
    const deliveryAddress = String(form.get("deliveryAddress") || "").trim();
    const deliveryType = String(form.get("deliveryType") || "courier");

    if (deliveryType === "courier" && !deliveryAddress) {
      toast("Yetkazib berish manzilini kiriting.", "error");
      return;
    }

    try {
      const payload = {
        items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
        deliveryType,
        deliveryService: String(form.get("deliveryService") || "internal"),
        deliveryAddress: deliveryAddress || user?.address || "",
        customerNote: String(form.get("customerNote") || "").trim(),
      };

      const order = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      clearCart();
      renderCart();

      if (orderResult) {
        orderResult.classList.remove("d-none");
        orderResult.innerHTML = `
          <div class="kd-panel p-3">
            <h5 class="mb-2">Buyurtma yaratildi</h5>
            <p class="mb-1"><strong>Raqam:</strong> ${escapeHtml(order.orderNumber)}</p>
            <p class="mb-2"><strong>Jami:</strong> ${formatCurrency(order.total)}</p>
            <a class="kd-btn-primary" href="/payment.html?order=${escapeHtml(order.id)}">To'lov screenshot yuklash</a>
          </div>
        `;
      }
      toast("Buyurtma qabul qilindi.", "success");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  document.addEventListener("kd:user-updated", () => {
    const user = getCurrentUser();
    if (user) {
      const addressInput = qs("#deliveryAddress");
      if (addressInput && !addressInput.value) {
        addressInput.value = user.address || localStorage.getItem("kd_quick_address") || "";
      }
    }
  });

  const readyUser = getCurrentUser();
  if (readyUser) {
    const addressInput = qs("#deliveryAddress");
    if (addressInput && !addressInput.value) {
      addressInput.value = readyUser.address || localStorage.getItem("kd_quick_address") || "";
    }
  }

  renderCart();
});

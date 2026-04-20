document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const {
    api,
    qs,
    qsa,
    escapeHtml,
    formatDate,
    badgeHtml,
    toast,
    ensureAuth,
    getCurrentUser,
  } = window.KDApp;

  const dateInput = qs("#reservationDate");
  const timeSelect = qs("#reservationTime");
  const tableMap = qs("#tableMap");
  const reservationForm = qs("#tableReservationForm");
  const selectedTableInfo = qs("#selectedTableInfo");
  const historyBody = qs("#tableReservationHistory");

  let currentTables = [];
  let selectedTableId = "";

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderSlots(slots) {
    if (!timeSelect) return;
    const unique = Array.from(new Set(slots || [])).filter(Boolean);
    const defaultSlots = unique.length
      ? unique
      : ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

    const previous = timeSelect.value;
    timeSelect.innerHTML = defaultSlots
      .map((slot) => `<option value="${escapeHtml(slot)}">${escapeHtml(slot)}</option>`)
      .join("");

    if (defaultSlots.includes(previous)) {
      timeSelect.value = previous;
    }
  }

  function renderSelectedInfo() {
    if (!selectedTableInfo) return;
    const selected = currentTables.find((table) => table._id === selectedTableId);
    if (!selected) {
      selectedTableInfo.innerHTML = '<span class="kd-meta">Stol tanlanmagan.</span>';
      return;
    }

    selectedTableInfo.innerHTML = `
      <div class="kd-meta">
        Tanlangan: <strong>${escapeHtml(selected.label || `Stol ${selected.number}`)}</strong>
        (${selected.capacity} kishi)
      </div>
    `;
  }

  function tableSpotTemplate(table) {
    const left = Math.max(0, Math.min(Number(table.x) || 0, 0.95)) * 100;
    const top = Math.max(0, Math.min(Number(table.y) || 0, 0.95)) * 100;
    const width = Math.max(0.08, Math.min(Number(table.width) || 0.18, 0.4)) * 100;
    const height = Math.max(0.08, Math.min(Number(table.height) || 0.18, 0.4)) * 100;
    const stateClass = table.occupancyStatus === "busy" ? "busy" : "available";
    const selectedClass = table._id === selectedTableId ? "selected" : "";

    return `
      <button
        type="button"
        class="kd-table-spot ${escapeHtml(table.shape || "rect")} ${stateClass} ${selectedClass}"
        style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;"
        data-id="${escapeHtml(table._id)}"
        title="${escapeHtml(table.label || `Stol ${table.number}`)}"
      >
        <span>${escapeHtml(String(table.number))}</span>
      </button>
    `;
  }

  function renderTableMap() {
    if (!tableMap) return;

    if (!currentTables.length) {
      tableMap.innerHTML = '<div class="kd-empty">Hozircha stol joylashuvi mavjud emas.</div>';
      renderSelectedInfo();
      return;
    }

    const validSelected = currentTables.find(
      (table) => table._id === selectedTableId && table.occupancyStatus === "available",
    );
    if (!validSelected) {
      selectedTableId = "";
    }

    tableMap.innerHTML = currentTables.map(tableSpotTemplate).join("");
    renderSelectedInfo();
  }

  async function loadTables() {
    try {
      const date = dateInput?.value || todayStr();
      const time = timeSelect?.value || "19:00";
      const data = await api(`/api/tables?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
      currentTables = data.tables || [];
      renderTableMap();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function loadSettings() {
    try {
      const settings = await api("/api/settings");
      renderSlots(settings.offlineService?.reservationSlots || []);
      const workingHours = qs("#offlineWorkingHours");
      if (workingHours) {
        workingHours.textContent = settings.offlineService?.workingHours || "10:00 - 23:00";
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadMyReservations() {
    if (!historyBody) return;
    if (!getCurrentUser()) {
      historyBody.innerHTML = '<tr><td colspan="7" class="text-center kd-meta">Kirishdan keyin bronlar ko\'rinadi.</td></tr>';
      return;
    }

    try {
      const reservations = await api("/api/tables/my-reservations");
      if (!reservations.length) {
        historyBody.innerHTML = '<tr><td colspan="7" class="text-center kd-meta">Hozircha stol bronlari mavjud emas.</td></tr>';
        return;
      }

      historyBody.innerHTML = reservations
        .map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.reservationCode)}</td>
            <td>${escapeHtml(item.table?.label || `Stol ${item.table?.number || "-"}`)}</td>
            <td>${escapeHtml(item.visitDate)} ${escapeHtml(item.visitTime)}</td>
            <td>${Number(item.guestCount || 1)}</td>
            <td>${badgeHtml(item.status)}</td>
            <td>${escapeHtml(item.note || "-")}</td>
            <td>${formatDate(item.createdAt)}</td>
          </tr>
        `,
        )
        .join("");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  tableMap?.addEventListener("click", (event) => {
    const button = event.target.closest(".kd-table-spot");
    if (!button) return;

    const table = currentTables.find((entry) => entry._id === button.dataset.id);
    if (!table) return;
    if (table.occupancyStatus === "busy") {
      toast("Bu stol ushbu vaqt uchun band.", "error");
      return;
    }

    selectedTableId = table._id;
    renderTableMap();
  });

  dateInput?.addEventListener("change", loadTables);
  timeSelect?.addEventListener("change", loadTables);

  reservationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedTableId) {
      toast("Avval bo'sh stol tanlang.", "error");
      return;
    }

    const authed = await ensureAuth({ storeReturnTo: true });
    if (!authed) {
      toast("Bron qilish uchun login/register qiling.", "error");
      return;
    }

    const formData = new FormData(reservationForm);
    const payload = {
      tableId: selectedTableId,
      visitDate: String(formData.get("visitDate") || dateInput?.value || todayStr()),
      visitTime: String(formData.get("visitTime") || timeSelect?.value || "19:00"),
      guestCount: Number(formData.get("guestCount") || 1),
      note: String(formData.get("note") || "").trim(),
    };

    try {
      await api("/api/tables/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast("Stol bron so'rovi yuborildi. Admin tasdiqini kuting.", "success");
      selectedTableId = "";
      await loadTables();
      await loadMyReservations();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  document.addEventListener("kd:user-updated", () => {
    loadMyReservations();
  });

  if (dateInput) {
    dateInput.value = todayStr();
    dateInput.min = todayStr();
  }

  loadSettings().then(loadTables);
  loadMyReservations();
});

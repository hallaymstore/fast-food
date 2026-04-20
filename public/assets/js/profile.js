document.addEventListener("DOMContentLoaded", () => {
  if (!window.KDApp) return;

  const { api, qs, toast } = window.KDApp;

  const profileForm = qs("#profileForm");

  async function loadProfile() {
    try {
      const me = await api("/api/me");
      qs("#profileName").value = me.fullName || "";
      qs("#profilePhone").value = me.phone || "";
      qs("#profileEmail").value = me.email || "";
      qs("#profileAddress").value = me.address || "";
      qs("#profileRole").textContent = me.role === "admin" ? "Admin" : "Mijoz";
    } catch (error) {
      toast(error.message, "error");
    }
  }

  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      fullName: qs("#profileName").value,
      email: qs("#profileEmail").value,
      address: qs("#profileAddress").value,
    };

    const currentPassword = qs("#currentPassword").value.trim();
    const newPassword = qs("#newPassword").value.trim();

    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      await api("/api/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast("Profil yangilandi.", "success");
      qs("#currentPassword").value = "";
      qs("#newPassword").value = "";
      loadProfile();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  loadProfile();
});

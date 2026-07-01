async function loadIdentity() {
  try {
    return await import("https://esm.sh/@netlify/identity");
  } catch (error) {
    return null;
  }
}

function showGate(message = "Student login is required to open this mock-test section.") {
  document.body.innerHTML = `
    <main class="student-gate" style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#111827;font-family:Aptos,'Segoe UI',sans-serif;">
      <section style="width:min(560px,100%);background:#fff;border:1px solid #d8dee8;border-radius:12px;box-shadow:0 18px 42px rgba(17,24,39,.08);padding:28px;">
        <p style="margin:0 0 8px;color:#8b5cf6;font-weight:800;">Student area</p>
        <h1 style="margin:0 0 12px;font-size:2rem;line-height:1.1;font-family:Aptos,'Segoe UI',sans-serif;">Michigan English Test by Vinicius Vieira</h1>
        <p id="gate-message" style="margin:0 0 20px;color:#4b5563;">${message}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button id="gate-login" style="min-height:48px;border:0;border-radius:8px;padding:0 18px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font:inherit;font-weight:800;cursor:pointer;">Student login</button>
          <a href="index.html#contact" style="min-height:48px;display:inline-flex;align-items:center;border:2px solid #8b5cf6;border-radius:8px;padding:0 18px;color:#5b21b6;font-weight:800;text-decoration:none;">Contact</a>
        </div>
      </section>
    </main>
  `;
}

function authHeaders(user) {
  const token = user?.token?.access_token || user?.token?.accessToken || user?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.MET_AUTH = {
  getUser: async () => null,
  authHeaders: async () => ({}),
};

function showSaveStatus(message, isError = false) {
  let status = document.getElementById("met-save-status");
  if (!status) {
    status = document.createElement("div");
    status.id = "met-save-status";
    status.setAttribute("role", "status");
    status.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:99999;max-width:320px;border-radius:8px;padding:12px 14px;font-family:Aptos,'Segoe UI',sans-serif;font-weight:700;box-shadow:0 16px 36px rgba(15,23,42,.18);";
    document.body.appendChild(status);
  }
  status.textContent = message;
  status.style.background = isError ? "#fee2e2" : "#dcfce7";
  status.style.color = isError ? "#991b1b" : "#166534";
  window.clearTimeout(showSaveStatus.timer);
  showSaveStatus.timer = window.setTimeout(() => status.remove(), 4200);
}

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.startsWith("/api/")) {
    const headers = new Headers(init.headers || {});
    const auth = await window.MET_AUTH.authHeaders();
    Object.entries(auth).forEach(([key, value]) => headers.set(key, value));
    try {
      const response = await nativeFetch(input, { ...init, headers });
      if (url.startsWith("/api/save-")) {
        showSaveStatus(response.ok ? "Your answer was saved." : "Save failed. Please try again or tell your teacher.", !response.ok);
      }
      return response;
    } catch (error) {
      if (url.startsWith("/api/save-")) {
        showSaveStatus("Save failed. Please check your connection and try again.", true);
      }
      throw error;
    }
  }
  return nativeFetch(input, init);
};

const identity = await loadIdentity();

if (!identity) {
  showGate("Student login will work after this site is deployed and Netlify Identity is enabled.");
} else {
  const { getUser, handleAuthCallback, login } = identity;

  async function currentUser() {
    try {
      await handleAuthCallback();
      return await getUser();
    } catch (error) {
      return null;
    }
  }

  window.MET_AUTH.getUser = currentUser;
  window.MET_AUTH.authHeaders = async () => authHeaders(await currentUser());

  const user = await currentUser();
  if (!user) {
    showGate();
    document.getElementById("gate-login")?.addEventListener("click", async () => {
      const email = window.prompt("Student email");
      if (!email) return;
      const password = window.prompt("Password");
      if (!password) return;
      try {
        await login(email, password);
        window.location.reload();
      } catch (error) {
        const message = document.getElementById("gate-message");
        if (message) message.textContent = "Login failed. Check your student email and password.";
      }
    });
  }
}

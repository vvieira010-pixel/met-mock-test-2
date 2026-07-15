async function loadIdentity() {
  try {
    return await import("https://esm.sh/@netlify/identity");
  } catch (e) {
    return null;
  }
}

window.MET_AUTH = {
  getUser: async () => {
    const identity = await loadIdentity();
    if (!identity) return null;
    try {
      return await identity.getUser();
    } catch {
      return null;
    }
  },
  authHeaders: async () => {
    const identity = await loadIdentity();
    if (!identity) return {};
    try {
      const user = await identity.getUser();
      return user ? { "Authorization": `Bearer ${user.token?.access_token}` } : {};
    } catch {
      return {};
    }
  }
};

(async function enforceGate() {
  if (location.pathname.includes("mock-home.html") || location.pathname.includes("thanks.html")) return;

  const user = await window.MET_AUTH.getUser();
  const registeredName = localStorage.getItem('met:student:name');
  const registeredEmail = localStorage.getItem('met:student:email');

  if (!user && (!registeredName || !registeredEmail)) {
    window.location.replace("../sections/mock-home.html");
  } else if (user) {
    if (window.answerStorage && !window.answerStorage.getSession()) {
      window.answerStorage.initSession({
        id: user.id,
        name: user.user_metadata?.full_name || user.name || 'Student',
        email: user.email
      });
    }
  } else {
    if (window.answerStorage && !window.answerStorage.getSession()) {
      window.answerStorage.initSession({
        id: 'platform_' + btoa(registeredEmail),
        name: registeredName,
        email: registeredEmail
      });
    }
  }
})();

const STATUS_SELECTOR = "[data-auth-status]";
const LOGIN_SELECTOR = "[data-login-button]";
const LOGOUT_SELECTOR = "[data-logout-button]";

async function loadIdentity() {
  try {
    return await import("https://esm.sh/@netlify/identity");
  } catch (error) {
    return null;
  }
}

function setStatus(message) {
  document.querySelectorAll(STATUS_SELECTOR).forEach((node) => {
    node.textContent = message;
  });
}

function setButtonState(user) {
  document.querySelectorAll(LOGIN_SELECTOR).forEach((button) => {
    button.hidden = Boolean(user);
  });
  document.querySelectorAll(LOGOUT_SELECTOR).forEach((button) => {
    button.hidden = !user;
  });
}

function userLabel(user) {
  return user?.name || user?.email || "student";
}

const identity = await loadIdentity();

if (!identity) {
  setStatus("Student login is available after deployment on Netlify.");
  setButtonState(null);
} else {
  const { getUser, handleAuthCallback, login, logout, onAuthChange } = identity;

  async function refreshUser() {
    let user = null;
    try {
      await handleAuthCallback();
      user = await getUser();
    } catch (error) {
      user = null;
    }
    setButtonState(user);
    setStatus(user ? `Logged in as ${userLabel(user)}.` : "Use your invited student email and password to access the mock tests.");
    return user;
  }

  document.querySelectorAll(LOGIN_SELECTOR).forEach((button) => {
    button.addEventListener("click", async () => {
      const email = window.prompt("Student email");
      if (!email) return;
      const password = window.prompt("Password");
      if (!password) return;
      try {
        const user = await login(email, password);
        setButtonState(user);
        setStatus(`Logged in as ${userLabel(user)}.`);
      } catch (error) {
        setStatus("Login failed. Check your student email and password.");
      }
    });
  });

  document.querySelectorAll(LOGOUT_SELECTOR).forEach((button) => {
    button.addEventListener("click", async () => {
      await logout();
      setButtonState(null);
      setStatus("You are logged out.");
    });
  });

  onAuthChange((_event, user) => {
    setButtonState(user);
    setStatus(user ? `Logged in as ${userLabel(user)}.` : "Use your invited student email and password to access the mock tests.");
  });

  await refreshUser();
}

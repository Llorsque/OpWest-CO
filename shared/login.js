/**
 * Login module
 * Cosmetic login screen with 3 accounts.
 * Admin = full edit + GitHub save
 * Others = read-only
 */

const ACCOUNTS = [
  { login: "Admin",  password: "Welkom01!",  role: "admin",  naam: "Admin" },
  { login: "Justin", password: "Welkom01!",  role: "viewer", naam: "Justin" },
  { login: "Amee",   password: "OpWest01!",  role: "viewer", naam: "Amee" }
];

const LS_SESSION = "ovt_session_v1";

/* ── Session management ────────────────────── */

export function getSession(){
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if(!raw) return null;
    return JSON.parse(raw);
  } catch(e){ return null; }
}

export function isLoggedIn(){
  return !!getSession();
}

export function isAdminUser(){
  const s = getSession();
  return s?.role === "admin";
}

export function getUserName(){
  const s = getSession();
  return s?.naam || "";
}

export function logout(){
  localStorage.removeItem(LS_SESSION);
}

export function tryLogin(login, password){
  const account = ACCOUNTS.find(a =>
    a.login.toLowerCase() === login.trim().toLowerCase() &&
    a.password === password
  );
  if(!account) return { ok: false, error: "Ongeldige gebruikersnaam of wachtwoord." };

  const session = {
    login: account.login,
    naam:  account.naam,
    role:  account.role,
    loginAt: new Date().toISOString()
  };
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
  return { ok: true, session };
}

/* ── Login screen HTML ─────────────────────── */

export function renderLoginScreen(){
  return `
    <div class="login-overlay" id="loginOverlay">
      <div class="login-card">
        <div class="login-brand">
          <div class="brand__mark" aria-hidden="true">
            <span class="dot"></span>
            <span class="ring"></span>
          </div>
          <div>
            <div class="brand__title" style="font-size:20px;">Overdracht</div>
            <div class="brand__subtitle">Sportverenigingen</div>
          </div>
        </div>

        <div class="login-form">
          <div style="margin-bottom:16px;">
            <label class="label">Gebruikersnaam</label>
            <input class="input login-input" id="loginUser" placeholder="Gebruikersnaam" autocomplete="off" />
          </div>
          <div style="margin-bottom:20px;">
            <label class="label">Wachtwoord</label>
            <input class="input login-input" id="loginPass" type="password" placeholder="Wachtwoord" />
          </div>
          <div id="loginError" style="color:#f87171;font-size:13px;margin-bottom:12px;display:none;"></div>
          <button class="btn btn--login" id="btnLogin">Inloggen</button>
        </div>

        <div class="login-footer">
          <span class="muted" style="font-size:11px;">Interne tool — Clubondersteuning OpWest</span>
        </div>
      </div>
    </div>
  `;
}

export function bindLoginScreen(onSuccess){
  const btnLogin  = document.querySelector("#btnLogin");
  const inputUser = document.querySelector("#loginUser");
  const inputPass = document.querySelector("#loginPass");
  const errorEl   = document.querySelector("#loginError");

  function doLogin(){
    const login    = inputUser?.value || "";
    const password = inputPass?.value || "";

    if(!login || !password){
      errorEl.textContent = "Vul beide velden in.";
      errorEl.style.display = "block";
      return;
    }

    const result = tryLogin(login, password);
    if(result.ok){
      onSuccess(result.session);
    } else {
      errorEl.textContent = result.error;
      errorEl.style.display = "block";
      inputPass.value = "";
      inputPass.focus();
    }
  }

  btnLogin?.addEventListener("click", doLogin);

  // Enter key support
  inputUser?.addEventListener("keydown", e => { if(e.key === "Enter") inputPass?.focus(); });
  inputPass?.addEventListener("keydown", e => { if(e.key === "Enter") doLogin(); });

  // Auto-focus
  inputUser?.focus();
}

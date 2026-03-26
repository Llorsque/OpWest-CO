// Fallback accounts (used if settings.json can't be loaded)
const FALLBACK_ACCOUNTS=[
  {login:"Admin",password:"Welkom01!",role:"admin",naam:"Admin"}
];
const LS_SESSION="ovt_session_v1";

let _accounts = null;

export async function loadAccounts(){
  try {
    const res = await fetch(`./data/settings.json?t=${Date.now()}`,{cache:"no-store"});
    if(res.ok){
      const settings = await res.json();
      _accounts = settings.accounts || FALLBACK_ACCOUNTS;
      return;
    }
  } catch(e){}
  _accounts = FALLBACK_ACCOUNTS;
}

export function getSession(){ try{const r=localStorage.getItem(LS_SESSION);return r?JSON.parse(r):null;}catch(e){return null;} }
export function isLoggedIn(){ return !!getSession(); }
export function isAdminUser(){ return getSession()?.role==="admin"; }
export function getUserName(){ return getSession()?.naam||""; }
export function logout(){ localStorage.removeItem(LS_SESSION); }

export function tryLogin(login, password){
  const accounts = _accounts || FALLBACK_ACCOUNTS;
  const acc = accounts.find(a=>a.login.toLowerCase()===login.trim().toLowerCase() && a.password===password);
  if(!acc) return {ok:false,error:"Ongeldige gebruikersnaam of wachtwoord."};
  const session = {login:acc.login,naam:acc.naam,role:acc.role,loginAt:new Date().toISOString()};
  localStorage.setItem(LS_SESSION,JSON.stringify(session));
  return {ok:true,session};
}

export function renderLoginScreen(){
  return `<div class="login-overlay"><div class="login-card">
    <div class="login-brand"><div class="brand__mark" aria-hidden="true"><span class="dot"></span><span class="ring"></span></div>
    <div><div class="brand__title" style="font-size:20px;">Overdracht</div><div class="brand__subtitle">Sportverenigingen</div></div></div>
    <div class="login-form">
      <div style="margin-bottom:16px;"><label class="label">Gebruikersnaam</label><input class="input login-input" id="loginUser" placeholder="Gebruikersnaam" autocomplete="off"/></div>
      <div style="margin-bottom:20px;"><label class="label">Wachtwoord</label><input class="input login-input" id="loginPass" type="password" placeholder="Wachtwoord"/></div>
      <div id="loginError" style="color:var(--red);font-size:13px;margin-bottom:12px;display:none;"></div>
      <button class="btn btn--login" id="btnLogin">Inloggen</button>
    </div>
    <div class="login-footer"><span class="muted" style="font-size:11px;">Interne tool — Clubondersteuning OpWest</span></div>
  </div></div>`;
}

export function bindLoginScreen(onSuccess){
  const btn=document.querySelector("#btnLogin"),u=document.querySelector("#loginUser"),p=document.querySelector("#loginPass"),err=document.querySelector("#loginError");
  function go(){if(!u?.value||!p?.value){err.textContent="Vul beide velden in.";err.style.display="block";return;}const r=tryLogin(u.value,p.value);if(r.ok)onSuccess(r.session);else{err.textContent=r.error;err.style.display="block";p.value="";p.focus();}}
  btn?.addEventListener("click",go); u?.addEventListener("keydown",e=>{if(e.key==="Enter")p?.focus();}); p?.addEventListener("keydown",e=>{if(e.key==="Enter")go();}); u?.focus();
}

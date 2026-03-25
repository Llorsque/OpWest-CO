export const APP_VERSION = "2.1.0";
export function qs(sel, el = document){ return el.querySelector(sel); }
export function qsa(sel, el = document){ return Array.from(el.querySelectorAll(sel)); }
export function esc(str = ""){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
export function uid(prefix = "id"){ return `${prefix}-${Math.random().toString(16).slice(2,10)}-${Date.now().toString(16)}`; }
export function toast(msg, timeout = 2500){
  const el = qs("#toast"); if(!el) return;
  el.textContent = msg; el.classList.add("is-show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-show"), timeout);
}
export function formatDate(iso){
  if(!iso) return "—";
  try { return new Date(iso).toLocaleDateString("nl-NL", { day:"numeric", month:"short", year:"numeric" }); } catch(e){ return iso; }
}

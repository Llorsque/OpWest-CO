export const APP_VERSION = "2.0.0";

export function qs(sel, el = document){ return el.querySelector(sel); }
export function qsa(sel, el = document){ return Array.from(el.querySelectorAll(sel)); }

export function esc(str = ""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function uid(prefix = "id"){
  return `${prefix}-${Math.random().toString(16).slice(2,10)}-${Date.now().toString(16)}`;
}

export function toast(msg, timeout = 2500){
  const el = qs("#toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("is-show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.remove("is-show"), timeout);
}

export function formatDate(iso){
  if(!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  } catch(e){ return iso; }
}

export function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

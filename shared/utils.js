export const APP_VERSION = "0.1.0";

export function qs(sel, el=document){ return el.querySelector(sel); }
export function qsa(sel, el=document){ return Array.from(el.querySelectorAll(sel)); }

export function esc(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function uid(prefix="id"){
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function toast(msg, timeout=2200){
  const el = qs("#toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("is-show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(()=> el.classList.remove("is-show"), timeout);
}

export function readLS(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}
export function writeLS(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readFileAsJson(file){
  const text = await file.text();
  return JSON.parse(text);
}

import { qs, qsa, toast, readLS, writeLS, downloadJson, readFileAsJson, APP_VERSION } from "./shared/utils.js";
import * as Landing from "./modules/landing.js";
import * as Verenigingen from "./modules/verenigingen/index.js";
import * as Projecten from "./modules/projecten/index.js";
import * as Aankomend from "./modules/aankomend/index.js";
import * as Gemeente from "./modules/gemeente/index.js";
import * as Activiteiten from "./modules/activiteiten/index.js";
import * as Resources from "./modules/resources/index.js";

const ROUTES = {
  "/": Landing,
  "/verenigingen": Verenigingen,
  "/projecten": Projecten,
  "/aankomend": Aankomend,
  "/gemeente": Gemeente,
  "/activiteiten": Activiteiten,
  "/resources": Resources
};

const EXPORT_KEY = "ovt_bundle_export_v1"; // for reset quick lookup (optional)
const LS_KEYS = [
  "ovt_notes_v1",
  "ovt_custom_clubs_v1",
  "ovt_projects_v1",
  "ovt_upcoming_v1",
  "ovt_municipal_v1",
  "ovt_activiteiten_v1",
  "ovt_resources_v1"
];

const state = {
  ui: {
    q: "",
    selectedId: null,
    showAdd: false,
    showAddProject: false,
    showAddUpcoming: false,
    showAddAct: false
  },
  verenigingen: [],
  projecten: [],
  aankomend: [],
  gemeente: null,
  activiteiten: [],
  resources: null,
  notes: {},
  customClubs: [],
  rerender: () => {}
};

async function boot(){
  qs("#version").textContent = APP_VERSION;
  qs("#today").textContent = new Date().toLocaleDateString("nl-NL", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  // load initial repo data (verenigingen)
  try{
    const res = await fetch("./data/verenigingen.json", { cache: "no-store" });
    state.verenigingen = await res.json();
  }catch(e){
    state.verenigingen = [];
    toast("Kon verenigingen.json niet laden.");
  }

  // install global buttons
  qs("#btnToggleSidebar")?.addEventListener("click", ()=>{
    qs(".sidebar")?.classList.toggle("collapsed");
  });

  qs("#btnExport")?.addEventListener("click", doExport);
  qs("#fileImport")?.addEventListener("change", doImport);
  qs("#btnReset")?.addEventListener("click", doReset);

  window.addEventListener("hashchange", renderRoute);

  state.rerender = renderRoute;
  renderRoute();
}

function getRoute(){
  const raw = (location.hash || "#/").replace(/^#/, "");
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const clean = path.split("?")[0];
  return ROUTES[clean] ? clean : "/";
}

function setActiveNav(route){
  qsa(".nav__item").forEach(a => a.classList.remove("is-active"));
  const map = {
    "/": "#/",
    "/verenigingen": "#/verenigingen",
    "/projecten": "#/projecten",
    "/aankomend": "#/aankomend",
    "/gemeente": "#/gemeente",
    "/activiteiten": "#/activiteiten",
    "/resources": "#/resources"
  };
  const href = map[route] || "#/";
  const el = qsa(".nav__item").find(a => a.getAttribute("href") === href);
  el?.classList.add("is-active");
}

async function renderRoute(){
  const route = getRoute();
  setActiveNav(route);

  const mod = ROUTES[route];
  // reset per-route UI flags (keep search + selected)
  if(route !== "/verenigingen"){
    state.ui.q = "";
    state.ui.selectedId = null;
    state.ui.showAdd = false;
  }
  if(route !== "/projecten") state.ui.showAddProject = false;
  if(route !== "/aankomend") state.ui.showAddUpcoming = false;
  if(route !== "/activiteiten") state.ui.showAddAct = false;

  // hydrate (load local data)
  try{
    mod?.hydrate?.(state);
  }catch(e){ /* ignore */ }

  const meta = mod?.meta?.() || { title: "Module", meta: "" };
  qs("#crumbTitle").textContent = meta.title;
  qs("#crumbMeta").textContent = meta.meta || "";

  const html = mod?.render?.(state) || `<div class="muted">Geen view.</div>`;
  const view = qs("#view");
  view.innerHTML = html;

  // bind events
  try{
    mod?.bind?.(state, view);
  }catch(e){
    console.error(e);
    toast("Er ging iets mis bij het binden van events.");
  }
}

function collectExportBundle(){
  const bundle = {
    schema: "overdracht-bundle/v1",
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {}
  };
  for(const k of LS_KEYS){
    bundle.data[k] = readLS(k, null);
  }
  writeLS(EXPORT_KEY, bundle);
  return bundle;
}

function doExport(){
  const bundle = collectExportBundle();
  const stamp = new Date().toISOString().slice(0,19).replaceAll(":","-");
  downloadJson(`overdracht-export-${stamp}.json`, bundle);
  toast("Export gedownload.");
}

async function doImport(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const bundle = await readFileAsJson(file);
    if(bundle?.schema !== "overdracht-bundle/v1"){
      toast("Onbekend export-formaat.");
      return;
    }
    const data = bundle.data || {};
    for(const k of LS_KEYS){
      if(k in data) writeLS(k, data[k]);
    }
    toast("Import klaar. Herlaad view…");
    // reset input
    e.target.value = "";
    renderRoute();
  }catch(err){
    console.error(err);
    toast("Import mislukt (geen geldige JSON?).");
  }
}

function doReset(){
  for(const k of LS_KEYS){
    localStorage.removeItem(k);
  }
  localStorage.removeItem(EXPORT_KEY);
  toast("Lokale data gereset.");
  renderRoute();
}

boot();

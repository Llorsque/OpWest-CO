import { qs, qsa, toast, APP_VERSION } from "./shared/utils.js";
import { isAdmin, loadData } from "./shared/github.js";
import * as Landing      from "./modules/landing.js";
import * as Verenigingen from "./modules/verenigingen/index.js";
import * as Trajecten    from "./modules/trajecten/index.js";
import * as Projecten    from "./modules/projecten/index.js";
import * as Aankomend    from "./modules/aankomend/index.js";
import * as Gemeente     from "./modules/gemeente/index.js";
import * as Activiteiten from "./modules/activiteiten/index.js";
import * as Resources    from "./modules/resources/index.js";
import * as Instellingen from "./modules/instellingen.js";

const ROUTES = {
  "/":              Landing,
  "/verenigingen":  Verenigingen,
  "/trajecten":     Trajecten,
  "/projecten":     Projecten,
  "/aankomend":     Aankomend,
  "/gemeente":      Gemeente,
  "/activiteiten":  Activiteiten,
  "/resources":     Resources,
  "/instellingen":  Instellingen
};

const state = {
  isAdmin: false,
  ui: {
    q: "",
    selectedId: null,
    showAdd: false,
    showAddProject: false,
    showAddUpcoming: false,
    showAddAct: false,
    showAddTraject: false,
    selectedTrajectId: null
  },
  // Data (loaded from JSON files in data/)
  verenigingen: [],
  trajecten: [],
  projecten: [],
  aankomend: [],
  gemeente: {},
  activiteiten: [],
  resources: {},
  // Re-render function
  rerender: () => {}
};

async function boot(){
  qs("#version").textContent = APP_VERSION;
  qs("#today").textContent = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Check admin status
  state.isAdmin = isAdmin();
  updateAdminBadge();

  // Load all data from JSON files
  await loadAllData();

  // Sidebar toggle
  qs("#btnToggleSidebar")?.addEventListener("click", () => {
    qs(".sidebar")?.classList.toggle("collapsed");
  });

  window.addEventListener("hashchange", renderRoute);
  state.rerender = renderRoute;
  renderRoute();
}

async function loadAllData(){
  const [ver, trj, prj, aank, gem, act, res] = await Promise.all([
    loadData("verenigingen.json", []),
    loadData("trajecten.json",    []),
    loadData("projecten.json",    []),
    loadData("aankomend.json",    []),
    loadData("gemeente.json",     { kaders: "", contacten: "", links: "" }),
    loadData("activiteiten.json", []),
    loadData("resources.json",    { documenten: "", partners: "", tools: "" })
  ]);
  state.verenigingen = ver  || [];
  state.trajecten    = trj  || [];
  state.projecten    = prj  || [];
  state.aankomend    = aank || [];
  state.gemeente     = gem  || {};
  state.activiteiten = act  || [];
  state.resources    = res  || {};
}

function updateAdminBadge(){
  state.isAdmin = isAdmin();
  const el = qs("#adminBadge");
  if(!el) return;
  if(state.isAdmin){
    el.innerHTML = `
      <div class="chip chip--admin">
        <span class="chip__dot chip__dot--green"></span>
        <span class="chip__text">Admin (bewerkbaar)</span>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="chip">
        <span class="chip__dot"></span>
        <span class="chip__text">Alleen-lezen</span>
      </div>`;
  }
}

function getRoute(){
  const raw = (location.hash || "#/").replace(/^#/, "");
  const path = raw.startsWith("/") ? raw : "/" + raw;
  const clean = path.split("?")[0];
  return ROUTES[clean] ? clean : "/";
}

function setActiveNav(route){
  qsa(".nav__item").forEach(a => a.classList.remove("is-active"));
  const href = `#${route}`;
  const el = qsa(".nav__item").find(a => a.getAttribute("href") === href);
  el?.classList.add("is-active");
}

async function renderRoute(){
  const route = getRoute();
  setActiveNav(route);

  // Update admin status
  state.isAdmin = isAdmin();
  updateAdminBadge();

  const mod = ROUTES[route];

  // Reset per-route UI flags
  if(route !== "/verenigingen"){ state.ui.q = ""; state.ui.selectedId = null; state.ui.showAdd = false; }
  if(route !== "/projecten")    state.ui.showAddProject = false;
  if(route !== "/aankomend")    state.ui.showAddUpcoming = false;
  if(route !== "/activiteiten") state.ui.showAddAct = false;
  if(route !== "/trajecten"){   state.ui.showAddTraject = false; state.ui.selectedTrajectId = null; }

  // Hydrate (optional per-module setup)
  try { mod?.hydrate?.(state); } catch(e){ /* ignore */ }

  const meta = mod?.meta?.() || { title: "Module", meta: "" };
  qs("#crumbTitle").textContent = meta.title;
  qs("#crumbMeta").textContent  = meta.meta || "";

  const html = mod?.render?.(state) || `<div class="muted">Geen view.</div>`;
  const view = qs("#view");
  view.innerHTML = html;

  // Bind events
  try { mod?.bind?.(state, view); } catch(e){
    console.error(e);
    toast("Er ging iets mis bij het binden van events.");
  }
}

boot();

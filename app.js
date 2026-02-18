import { qs, qsa, toast, APP_VERSION } from "./shared/utils.js";
import { isAdmin, loadData } from "./shared/github.js";
import { isLoggedIn, isAdminUser, getUserName, logout, renderLoginScreen, bindLoginScreen } from "./shared/login.js";
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
  userName: "",
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
  verenigingen: [],
  trajecten: [],
  projecten: [],
  aankomend: [],
  gemeente: {},
  activiteiten: [],
  resources: {},
  rerender: () => {}
};

/* ── Boot ──────────────────────────────────── */

async function boot(){
  if(!isLoggedIn()){
    showLoginScreen();
    return;
  }
  startApp();
}

function showLoginScreen(){
  document.body.innerHTML = renderLoginScreen();
  bindLoginScreen(() => {
    location.reload();
  });
}

async function startApp(){
  qs("#version").textContent = APP_VERSION;
  qs("#today").textContent = new Date().toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Admin = admin user + GitHub token configured
  state.isAdmin = isAdminUser() && isAdmin();
  state.userName = getUserName();
  updateAdminBadge();
  updateUserBadge();

  // Hide Instellingen for non-admin users
  const settingsLink = qs("a[href='#/instellingen']");
  if(settingsLink && !isAdminUser()){
    settingsLink.style.display = "none";
  }

  await loadAllData();

  qs("#btnToggleSidebar")?.addEventListener("click", () => {
    qs(".sidebar")?.classList.toggle("collapsed");
  });

  qs("#btnLogout")?.addEventListener("click", () => {
    logout();
    location.reload();
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
  const el = qs("#adminBadge");
  if(!el) return;
  if(state.isAdmin){
    el.innerHTML = `
      <div class="chip chip--admin">
        <span class="chip__dot chip__dot--green"></span>
        <span class="chip__text">Admin (bewerkbaar)</span>
      </div>`;
  } else if(isAdminUser()){
    el.innerHTML = `
      <div class="chip chip--admin">
        <span class="chip__dot chip__dot--yellow"></span>
        <span class="chip__text">Admin (geen GitHub-token)</span>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="chip">
        <span class="chip__dot"></span>
        <span class="chip__text">Alleen-lezen</span>
      </div>`;
  }
}

function updateUserBadge(){
  const el = qs("#userBadge");
  if(!el) return;
  el.innerHTML = `
    <div class="user-badge">
      <div class="user-badge__avatar">${state.userName.charAt(0).toUpperCase()}</div>
      <div class="user-badge__info">
        <div class="user-badge__name">${state.userName}</div>
        <div class="user-badge__role">${isAdminUser() ? "Admin" : "Viewer"}</div>
      </div>
    </div>
  `;
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

  state.isAdmin = isAdminUser() && isAdmin();
  updateAdminBadge();

  const mod = ROUTES[route];

  if(route !== "/verenigingen"){ state.ui.q = ""; state.ui.selectedId = null; state.ui.showAdd = false; }
  if(route !== "/projecten")    state.ui.showAddProject = false;
  if(route !== "/aankomend")    state.ui.showAddUpcoming = false;
  if(route !== "/activiteiten") state.ui.showAddAct = false;
  if(route !== "/trajecten"){   state.ui.showAddTraject = false; state.ui.selectedTrajectId = null; }

  try { mod?.hydrate?.(state); } catch(e){ /* ignore */ }

  const meta = mod?.meta?.() || { title: "Module", meta: "" };
  qs("#crumbTitle").textContent = meta.title;
  qs("#crumbMeta").textContent  = meta.meta || "";

  const html = mod?.render?.(state) || `<div class="muted">Geen view.</div>`;
  const view = qs("#view");
  view.innerHTML = html;

  try { mod?.bind?.(state, view); } catch(e){
    console.error(e);
    toast("Er ging iets mis bij het binden van events.");
  }
}

boot();

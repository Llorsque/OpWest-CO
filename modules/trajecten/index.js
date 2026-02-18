import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

const STATUS_OPTIONS = ["Intake", "Lopend", "Afronding", "Afgerond", "Gepauzeerd"];
const TYPE_OPTIONS   = ["Bestuurlijk", "Financieel", "Ledenwerving", "Accommodatie", "Vrijwilligers", "Fusie/samenwerking", "Vitaliteitscan", "Anders"];

export function meta(){
  return { title: "Trajecten", meta: "Langdurige ondersteuning per vereniging" };
}

export function render(state){
  const list = state.trajecten || [];
  const admin = state.isAdmin;
  const sel = state.ui.selectedTrajectId;

  // Group by status
  const lopend   = list.filter(t => t.status === "Lopend" || t.status === "Intake");
  const afronding = list.filter(t => t.status === "Afronding" || t.status === "Gepauzeerd");
  const afgerond = list.filter(t => t.status === "Afgerond");

  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Trajecten <span class="muted" style="font-weight:400;">(${list.length})</span></div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Langdurige ondersteuningstrajecten per vereniging.</div>
        </div>
        ${admin ? `<button class="btn" id="btnAddTraject">+ Nieuw traject</button>` : ""}
      </div>
      <div class="panel__body">
        ${list.length === 0
          ? `<div class="muted" style="font-size:13px;">Nog geen trajecten.${admin ? " Klik op + Nieuw traject." : ""}</div>`
          : `
            ${trajectGroup("Actief", lopend, state)}
            ${trajectGroup("Afronding / Gepauzeerd", afronding, state)}
            ${trajectGroup("Afgerond", afgerond, state)}
          `
        }
      </div>
    </div>

    ${state.ui.showAddTraject ? addForm(state) : ""}
    ${sel && !state.ui.showAddTraject ? trajectDetail(state) : ""}
  `;
}

export function bind(state, root){
  // Add traject
  root.querySelector("#btnAddTraject")?.addEventListener("click", () => {
    state.ui.showAddTraject = true;
    state.ui.selectedTrajectId = null;
    state.rerender();
  });

  root.querySelector("#btnCancelTraject")?.addEventListener("click", () => {
    state.ui.showAddTraject = false;
    state.rerender();
  });

  root.querySelector("#btnCreateTraject")?.addEventListener("click", () => {
    const verenigingNaam = root.querySelector("#tVereniging")?.value?.trim();
    if(!verenigingNaam){ toast("Verenigingsnaam is verplicht."); return; }

    // Try to find matching club
    const match = state.verenigingen.find(v =>
      v.naam.toLowerCase() === verenigingNaam.toLowerCase()
    );

    const t = {
      id: uid("trj"),
      verenigingId:   match?.id || "",
      verenigingNaam: match?.naam || verenigingNaam,
      type:           root.querySelector("#tType")?.value        || "",
      omschrijving:   root.querySelector("#tOmschrijving")?.value?.trim() || "",
      startDatum:     root.querySelector("#tStart")?.value       || "",
      verwachtEinde:  root.querySelector("#tEinde")?.value       || "",
      status:         root.querySelector("#tStatus")?.value      || "Intake",
      coach:          root.querySelector("#tCoach")?.value?.trim() || "",
      log: []
    };
    state.trajecten.unshift(t);
    state.ui.showAddTraject = false;
    state.ui.selectedTrajectId = t.id;
    toast("Traject aangemaakt. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // Select traject
  root.querySelectorAll("[data-select-trj]")?.forEach(el => {
    el.addEventListener("click", () => {
      state.ui.selectedTrajectId = el.getAttribute("data-select-trj");
      state.ui.showAddTraject = false;
      state.rerender();
    });
  });

  // Add log entry
  root.querySelector("#btnAddLog")?.addEventListener("click", () => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(!t) return;
    const datum = root.querySelector("#logDatum")?.value || new Date().toISOString().slice(0,10);
    const tekst = root.querySelector("#logTekst")?.value?.trim();
    if(!tekst){ toast("Vul een logbericht in."); return; }
    t.log = t.log || [];
    t.log.unshift({ datum, tekst });
    toast("Log toegevoegd. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // Update status
  root.querySelector("#detailStatus")?.addEventListener("change", (e) => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(t) t.status = e.target.value;
  });

  // Update fields
  root.querySelector("#detailType")?.addEventListener("change", (e) => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(t) t.type = e.target.value;
  });

  root.querySelector("#detailEinde")?.addEventListener("change", (e) => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(t) t.verwachtEinde = e.target.value;
  });

  root.querySelector("#detailOmschrijving")?.addEventListener("input", (e) => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(t) t.omschrijving = e.target.value;
  });

  root.querySelector("#detailCoach")?.addEventListener("input", (e) => {
    const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
    if(t) t.coach = e.target.value?.trim();
  });

  // Delete log entry
  root.querySelectorAll("[data-del-log]")?.forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del-log"));
      const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
      if(t) t.log.splice(idx, 1);
      state.rerender();
    });
  });

  // Delete traject
  root.querySelector("#btnDeleteTraject")?.addEventListener("click", () => {
    if(!confirm("Weet je zeker dat je dit traject wilt verwijderen?")) return;
    state.trajecten = state.trajecten.filter(t => t.id !== state.ui.selectedTrajectId);
    state.ui.selectedTrajectId = null;
    toast("Traject verwijderd. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // SAVE TO GITHUB
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true;
    btn.textContent = "Bezig…";
    try {
      await saveData("trajecten.json", state.trajecten, "Update trajecten");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){
      toast("✗ Fout: " + e.message);
      console.error(e);
    }
    btn.disabled = false;
    btn.textContent = "Opslaan naar GitHub";
  });
}

/* ── Rendering helpers ─────────────────────── */

function trajectGroup(title, items, state){
  if(!items.length) return "";
  return `
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${esc(title)}</div>
      <div class="grid" style="gap:8px;">
        ${items.map(t => {
          const isSel = state.ui.selectedTrajectId === t.id;
          return `
            <div class="card" data-select-trj="${esc(t.id)}" style="cursor:pointer;grid-column:span 12;${isSel ? "border-color:rgba(82,232,232,0.35);" : ""}">
              <div class="card__inner" style="padding:12px 14px;">
                <div class="card__title">
                  <span>${esc(t.verenigingNaam)} — ${esc(t.type || "Onbepaald")}</span>
                  <span class="pill pill--status pill--${statusClass(t.status)}">${esc(t.status)}</span>
                </div>
                <div class="card__subtitle" style="margin-top:4px;">
                  ${t.omschrijving ? esc(t.omschrijving).slice(0, 120) + (t.omschrijving.length > 120 ? "…" : "") : "<em>Geen omschrijving</em>"}
                </div>
                <div class="card__meta" style="margin-top:8px;">
                  ${t.startDatum ? `<span class="pill">Start: ${formatDate(t.startDatum)}</span>` : ""}
                  ${t.verwachtEinde ? `<span class="pill">Einde: ${formatDate(t.verwachtEinde)}</span>` : ""}
                  ${t.coach ? `<span class="pill">Coach: ${esc(t.coach)}</span>` : ""}
                  ${t.log?.length ? `<span class="pill">${t.log.length} logboek</span>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function statusClass(s){
  if(s === "Lopend" || s === "Intake") return "active";
  if(s === "Afronding") return "warning";
  if(s === "Gepauzeerd") return "paused";
  if(s === "Afgerond") return "done";
  return "default";
}

function trajectDetail(state){
  const t = state.trajecten.find(x => x.id === state.ui.selectedTrajectId);
  if(!t) return "";
  const admin = state.isAdmin;
  const log = t.log || [];

  return `
    <div class="panel" style="margin-top:14px;">
      <div class="panel__header">
        <div class="panel__title">Detail: ${esc(t.verenigingNaam)}</div>
        ${admin ? `
          <div class="row" style="justify-content:flex-end;">
            <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
            <button class="btn btn--ghost btn--danger" id="btnDeleteTraject">Verwijder</button>
          </div>
        ` : ""}
      </div>
      <div class="panel__body">
        <div class="split">
          <div>
            <div class="kv">
              <div class="kv__k">Vereniging</div><div class="kv__v"><strong>${esc(t.verenigingNaam)}</strong></div>
              <div class="kv__k">Type</div>
              <div class="kv__v">${admin ? selectHtml("detailType", TYPE_OPTIONS, t.type) : esc(t.type || "—")}</div>
              <div class="kv__k">Status</div>
              <div class="kv__v">${admin ? selectHtml("detailStatus", STATUS_OPTIONS, t.status) : esc(t.status || "—")}</div>
              <div class="kv__k">Start</div><div class="kv__v">${formatDate(t.startDatum)}</div>
              <div class="kv__k">Verwacht einde</div>
              <div class="kv__v">${admin ? `<input class="input" id="detailEinde" type="date" value="${esc(t.verwachtEinde || "")}" />` : formatDate(t.verwachtEinde)}</div>
              <div class="kv__k">Coach</div>
              <div class="kv__v">${admin ? `<input class="input" id="detailCoach" value="${esc(t.coach || "")}" placeholder="Naam coach" />` : esc(t.coach || "—")}</div>
            </div>

            <div style="margin-top:14px;">
              <div class="muted" style="font-size:12px;margin-bottom:6px;">Omschrijving</div>
              ${admin
                ? `<textarea class="textarea" id="detailOmschrijving" placeholder="Wat houdt het traject in?">${esc(t.omschrijving || "")}</textarea>`
                : `<div style="font-size:13px;line-height:1.5;white-space:pre-wrap;">${esc(t.omschrijving || "Geen omschrijving.")}</div>`
              }
            </div>
          </div>

          <div>
            <div class="panel">
              <div class="panel__header">
                <div class="panel__title">Logboek</div>
              </div>
              <div class="panel__body">
                ${admin ? `
                  <div class="row" style="margin-bottom:10px;">
                    <input class="input" id="logDatum" type="date" value="${new Date().toISOString().slice(0,10)}" style="flex:0 0 160px;" />
                    <input class="input" id="logTekst" placeholder="Wat is er gebeurd / besproken?" />
                    <button class="btn" id="btnAddLog">+ Log</button>
                  </div>
                ` : ""}
                ${log.length
                  ? `<div class="grid" style="gap:8px;">
                      ${log.map((entry, idx) => `
                        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <div style="font-size:11px;color:var(--accent);min-width:80px;padding-top:2px;">${formatDate(entry.datum)}</div>
                          <div style="font-size:13px;line-height:1.4;flex:1;">${esc(entry.tekst)}</div>
                          ${admin ? `<button class="btn btn--ghost" data-del-log="${idx}" style="font-size:10px;padding:4px 6px;">✕</button>` : ""}
                        </div>
                      `).join("")}
                    </div>`
                  : `<div class="muted" style="font-size:13px;">Nog geen logboek-items.</div>`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addForm(state){
  const clubs = state.verenigingen || [];
  return `
    <div class="panel" style="margin-top:14px;border-color:rgba(82,232,232,0.2);">
      <div class="panel__header">
        <div class="panel__title">Nieuw traject</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelTraject">Annuleren</button>
          <button class="btn" id="btnCreateTraject">Aanmaken</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="tVereniging" placeholder="Verenigingsnaam *" list="clubList" />
          <datalist id="clubList">
            ${clubs.map(v => `<option value="${esc(v.naam)}">`).join("")}
          </datalist>
          ${selectHtmlWithId("tType", TYPE_OPTIONS, "", "Type ondersteuning")}
          ${selectHtmlWithId("tStatus", STATUS_OPTIONS, "Intake", "Status")}
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="tStart" type="date" title="Startdatum" />
          <input class="input" id="tEinde" type="date" title="Verwacht einde" />
          <input class="input" id="tCoach" placeholder="Coach / buurtsportcoach" />
        </div>
        <div style="margin-top:10px;">
          <textarea class="textarea" id="tOmschrijving" placeholder="Korte omschrijving van het traject"></textarea>
        </div>
      </div>
    </div>
  `;
}

function selectHtml(id, options, current){
  return `
    <select class="input" id="${id}">
      ${options.map(o => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select>
  `;
}

function selectHtmlWithId(id, options, current, placeholder){
  return `
    <select class="input" id="${id}">
      <option value="" disabled ${!current ? "selected" : ""}>${esc(placeholder || "Kies…")}</option>
      ${options.map(o => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select>
  `;
}

import { esc, uid, toast, readLS, writeLS } from "../../shared/utils.js";

const LS_NOTES = "ovt_notes_v1";
const LS_CUSTOM = "ovt_custom_clubs_v1";

export function meta(){
  return { title: "Verenigingen", meta: "Zoek, beheer contactpersonen en noteer wat er speelt" };
}

export function hydrate(state){
  // Merge localStorage notes + custom clubs into state (non-destructive)
  state.notes = readLS(LS_NOTES, {});
  state.customClubs = readLS(LS_CUSTOM, []);
  // add custom clubs (if not already present)
  const ids = new Set(state.verenigingen.map(v => v.id));
  for(const v of state.customClubs){
    if(!ids.has(v.id)){
      state.verenigingen.push(v);
      ids.add(v.id);
    }
  }
}

export function render(state){
  const q = state.ui.q || "";
  const list = filter(state.verenigingen, q);

  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Verenigingen</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">
            Tip: klik op een vereniging om details + ‘wat speelt er?’ te openen. Alles wordt lokaal opgeslagen.
          </div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <input class="input" id="clubSearch" placeholder="Zoek op naam, sport, gemeente, contact…" value="${esc(q)}" />
          <button class="btn" id="btnAddClub">+ Nieuwe vereniging</button>
        </div>
      </div>
      <div class="panel__body">
        <table class="table">
          <thead>
            <tr>
              <th style="width:34%;">Vereniging</th>
              <th style="width:16%;">Sport</th>
              <th style="width:16%;">Gemeente</th>
              <th>Contactpersoon (1e)</th>
              <th style="width:14%;">Notities</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(v => row(v, state)).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel__header">
        <div class="panel__title">Details</div>
        <div class="muted" style="font-size:12px;">Selecteer een vereniging in de tabel</div>
      </div>
      <div class="panel__body" id="clubDetails">
        ${state.ui.showAdd ? addForm() : (state.ui.selectedId ? details(state, state.ui.selectedId) : emptyDetails())}
      </div>
    </div>
  `;
}

export function bind(state, root){
  const search = root.querySelector("#clubSearch");
  if(search){
    search.addEventListener("input", (e)=>{
      state.ui.q = e.target.value;
      state.rerender();
    });
  }

  root.querySelector("#btnAddClub")?.addEventListener("click", ()=>{
    state.ui.selectedId = null;
    state.ui.showAdd = true;
    state.rerender();
  });

  root.querySelectorAll("[data-select-id]")?.forEach(tr=>{
    tr.addEventListener("click", ()=>{
      state.ui.selectedId = tr.getAttribute("data-select-id");
      state.ui.showAdd = false;
      state.rerender();
    });
  });

  root.querySelector("#btnSaveNote")?.addEventListener("click", ()=>{
    const id = state.ui.selectedId;
    if(!id) return;
    const ta = root.querySelector("#noteText");
    state.notes[id] = (ta?.value || "").trim();
    writeLS(LS_NOTES, state.notes);
    toast("Notitie opgeslagen.");
    state.rerender();
  });

  root.querySelector("#btnSaveContacts")?.addEventListener("click", ()=>{
    const id = state.ui.selectedId;
    if(!id) return;
    const v = state.verenigingen.find(x=>x.id===id);
    if(!v) return;

    // read contact rows
    const rows = Array.from(root.querySelectorAll("[data-contact-row]"));
    const contacts = rows.map(r=>{
      const rol = r.querySelector("[data-f='rol']")?.value?.trim() || "";
      const naam = r.querySelector("[data-f='naam']")?.value?.trim() || "";
      const email = r.querySelector("[data-f='email']")?.value?.trim() || "";
      const telefoon = r.querySelector("[data-f='telefoon']")?.value?.trim() || "";
      return { rol, naam, email, telefoon };
    }).filter(c => c.rol || c.naam || c.email || c.telefoon);

    v.contacten = contacts;
    // persist in custom store if this is custom, or we treat edited contacts as custom override
    persistClubOverride(state, v);
    toast("Contacten opgeslagen.");
    state.rerender();
  });

  root.querySelector("#btnAddContact")?.addEventListener("click", ()=>{
    const id = state.ui.selectedId;
    if(!id) return;
    const v = state.verenigingen.find(x=>x.id===id);
    v.contacten = v.contacten || [];
    v.contacten.push({rol:"", naam:"", email:"", telefoon:""});
    persistClubOverride(state, v);
    state.rerender();
  });

  root.querySelectorAll("[data-remove-contact]")?.forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-remove-contact"));
      const id = state.ui.selectedId;
      if(!id) return;
      const v = state.verenigingen.find(x=>x.id===id);
      v.contacten.splice(idx,1);
      persistClubOverride(state, v);
      state.rerender();
    });
  });

  // Add club form
  root.querySelector("#btnCreateClub")?.addEventListener("click", ()=>{
    const naam = root.querySelector("#newNaam")?.value?.trim();
    const sport = root.querySelector("#newSport")?.value?.trim();
    const gemeente = root.querySelector("#newGemeente")?.value?.trim();
    const rol = root.querySelector("#newRol")?.value?.trim();
    const contactNaam = root.querySelector("#newContactNaam")?.value?.trim();
    const email = root.querySelector("#newEmail")?.value?.trim();
    const telefoon = root.querySelector("#newTelefoon")?.value?.trim();

    if(!naam){
      toast("Vul minimaal een verenigingsnaam in.");
      return;
    }
    const id = uid("club");
    const club = {
      id,
      naam,
      sport: sport || "",
      gemeente: gemeente || "",
      contacten: [{ rol: rol || "Contact", naam: contactNaam || "", email: email || "", telefoon: telefoon || "" }]
    };
    state.verenigingen.unshift(club);
    state.customClubs = [club, ...state.customClubs];
    writeLS(LS_CUSTOM, state.customClubs);
    toast("Vereniging toegevoegd (lokaal).");
    state.ui.selectedId = id;
    state.ui.showAdd = false;
    state.rerender();
  });

  root.querySelector("#btnCancelAdd")?.addEventListener("click", ()=>{
    state.ui.showAdd = false;
    state.rerender();
  });
}

function row(v, state){
  const first = (v.contacten && v.contacten[0]) ? v.contacten[0] : null;
  const note = (state.notes && state.notes[v.id]) ? "✓" : "";
  const contactLabel = first ? `${first.rol || "Contact"}: ${first.naam || "—"}${first.email ? " • " + first.email : ""}${first.telefoon ? " • " + first.telefoon : ""}` : "—";
  const isSel = state.ui.selectedId === v.id;
  return `
    <tr data-select-id="${esc(v.id)}" style="cursor:pointer; ${isSel ? "background: rgba(82,232,232,0.06);" : ""}">
      <td><strong>${esc(v.naam || "")}</strong></td>
      <td>${esc(v.sport || "")}</td>
      <td>${esc(v.gemeente || "")}</td>
      <td>${esc(contactLabel)}</td>
      <td>${esc(note)}</td>
    </tr>
  `;
}

function emptyDetails(){
  return `
    <div class="muted" style="font-size:13px;">
      Selecteer een vereniging in de tabel, of kies <strong>+ Nieuwe vereniging</strong>.
    </div>
  `;
}

function details(state, id){
  const v = state.verenigingen.find(x=>x.id===id);
  if(!v) return emptyDetails();
  const note = state.notes?.[id] || "";
  const contacts = v.contacten || [];

  return `
    <div class="split">
      <div class="panel" style="background:transparent;border:none;box-shadow:none;">
        <div class="kv" style="margin-bottom:14px;">
          <div class="kv__k">Vereniging</div><div class="kv__v"><strong>${esc(v.naam||"")}</strong></div>
          <div class="kv__k">Sport</div><div class="kv__v">${esc(v.sport||"")}</div>
          <div class="kv__k">Gemeente</div><div class="kv__v">${esc(v.gemeente||"")}</div>
          <div class="kv__k">ID</div><div class="kv__v"><code>${esc(v.id)}</code></div>
        </div>

        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Contactpersonen</div>
            <div class="row" style="justify-content:flex-end;">
              <button class="btn btn--ghost" id="btnAddContact">+ Contact</button>
              <button class="btn" id="btnSaveContacts">Opslaan</button>
            </div>
          </div>
          <div class="panel__body">
            ${contacts.length ? contactsForm(contacts) : `<div class="muted" style="font-size:13px;">Nog geen contacten. Klik op + Contact.</div>`}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__header">
          <div class="panel__title">Wat speelt er?</div>
          <div class="row" style="justify-content:flex-end;">
            <button class="btn" id="btnSaveNote">Opslaan</button>
          </div>
        </div>
        <div class="panel__body">
          <textarea class="textarea" id="noteText" placeholder="Korte overdrachtsnotities: wat loopt er, wat is gevoelig, wat moet je collega weten…">${esc(note)}</textarea>
          <div class="muted" style="font-size:12px;margin-top:8px;line-height:1.35;">
            Deze notities staan in jouw browser (localStorage). Gebruik <strong>Export</strong> rechtsboven om ze overdraagbaar te maken.
          </div>
        </div>
      </div>
    </div>
  `;
}

function contactsForm(contacts){
  return `
    <div class="grid" style="gap:10px;">
      ${contacts.map((c, idx) => `
        <div class="panel" data-contact-row="1" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.08);">
          <div class="panel__header">
            <div class="panel__title" style="font-size:13px;">Contact ${idx+1}</div>
            <button class="btn btn--ghost" data-remove-contact="${idx}" title="Verwijder contact">Verwijder</button>
          </div>
          <div class="panel__body">
            <div class="row">
              <input class="input" data-f="rol" placeholder="Rol (bijv. voorzitter)" value="${esc(c.rol||"")}" />
              <input class="input" data-f="naam" placeholder="Naam" value="${esc(c.naam||"")}" />
            </div>
            <div class="row" style="margin-top:10px;">
              <input class="input" data-f="email" placeholder="E-mail" value="${esc(c.email||"")}" />
              <input class="input" data-f="telefoon" placeholder="Telefoon" value="${esc(c.telefoon||"")}" />
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function addForm(){
  return `
    <div class="panel" style="margin-bottom:14px;">
      <div class="panel__header">
        <div class="panel__title">Nieuwe vereniging (lokaal)</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelAdd">Annuleren</button>
          <button class="btn" id="btnCreateClub">Aanmaken</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="newNaam" placeholder="Verenigingsnaam *" />
          <input class="input" id="newSport" placeholder="Sport" />
          <input class="input" id="newGemeente" placeholder="Gemeente" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="newRol" placeholder="Contactrol (bijv. secretaris)" />
          <input class="input" id="newContactNaam" placeholder="Contactnaam" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="newEmail" placeholder="E-mail" />
          <input class="input" id="newTelefoon" placeholder="Telefoon" />
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px;">
          * Alleen lokaal toegevoegd. Zet later (optioneel) om naar repo-data door te exporteren en in <code>data/verenigingen.json</code> te plakken.
        </div>
      </div>
    </div>
  `;
}

function filter(list, q){
  q = (q||"").trim().toLowerCase();
  if(!q) return list;
  return list.filter(v=>{
    const c = (v.contacten||[]).map(x => `${x.rol||""} ${x.naam||""} ${x.email||""} ${x.telefoon||""}`).join(" ");
    const hay = `${v.naam||""} ${v.sport||""} ${v.gemeente||""} ${c}`.toLowerCase();
    return hay.includes(q);
  });
}

function persistClubOverride(state, club){
  // store club in custom list (insert/replace), even if it originally came from repo
  const idx = state.customClubs.findIndex(x=>x.id===club.id);
  if(idx >= 0) state.customClubs[idx] = club;
  else state.customClubs.unshift(club);
  writeLS(LS_CUSTOM, state.customClubs);
}

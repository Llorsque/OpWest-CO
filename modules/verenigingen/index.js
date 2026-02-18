import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Verenigingen", meta: "Clubs, contactpersonen en notities" };
}

export function render(state){
  const q = state.ui.q || "";
  const list = filter(state.verenigingen, q);
  const admin = state.isAdmin;

  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Verenigingen <span class="muted" style="font-weight:400;">(${state.verenigingen.length})</span></div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <input class="input" id="clubSearch" placeholder="Zoek op naam, sport, gemeente…" value="${esc(q)}" />
          ${admin ? `<button class="btn" id="btnAddClub">+ Nieuwe vereniging</button>` : ""}
        </div>
      </div>
      <div class="panel__body">
        <table class="table">
          <thead>
            <tr>
              <th style="width:30%;">Vereniging</th>
              <th style="width:14%;">Sport</th>
              <th style="width:14%;">Gemeente</th>
              <th>Contactpersoon</th>
              <th style="width:10%;">Notitie</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(v => tableRow(v, state)).join("")}
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
        ${state.ui.showAdd ? addForm() : (state.ui.selectedId ? details(state) : emptyDetails())}
      </div>
    </div>
  `;
}

export function bind(state, root){
  const search = root.querySelector("#clubSearch");
  if(search){
    search.addEventListener("input", e => { state.ui.q = e.target.value; state.rerender(); });
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  }

  // Select club
  root.querySelectorAll("[data-select-id]")?.forEach(tr => {
    tr.addEventListener("click", () => {
      state.ui.selectedId = tr.getAttribute("data-select-id");
      state.ui.showAdd = false;
      state.rerender();
    });
  });

  // Add club button
  root.querySelector("#btnAddClub")?.addEventListener("click", () => {
    state.ui.selectedId = null;
    state.ui.showAdd = true;
    state.rerender();
  });

  // Create club
  root.querySelector("#btnCreateClub")?.addEventListener("click", () => {
    const naam = root.querySelector("#newNaam")?.value?.trim();
    if(!naam){ toast("Vul minimaal een verenigingsnaam in."); return; }
    const club = {
      id: uid("club"),
      naam,
      sport:    root.querySelector("#newSport")?.value?.trim()    || "",
      gemeente: root.querySelector("#newGemeente")?.value?.trim() || "",
      contacten: [{
        rol:      root.querySelector("#newRol")?.value?.trim()         || "Contact",
        naam:     root.querySelector("#newContactNaam")?.value?.trim() || "",
        email:    root.querySelector("#newEmail")?.value?.trim()       || "",
        telefoon: root.querySelector("#newTelefoon")?.value?.trim()    || ""
      }],
      notitie: ""
    };
    state.verenigingen.unshift(club);
    state.ui.selectedId = club.id;
    state.ui.showAdd = false;
    toast("Vereniging toegevoegd. Klik Opslaan naar GitHub om te bewaren.");
    state.rerender();
  });

  root.querySelector("#btnCancelAdd")?.addEventListener("click", () => {
    state.ui.showAdd = false;
    state.rerender();
  });

  // Save note
  root.querySelector("#btnSaveNote")?.addEventListener("click", () => {
    const id = state.ui.selectedId;
    if(!id) return;
    const v = state.verenigingen.find(x => x.id === id);
    if(!v) return;
    v.notitie = (root.querySelector("#noteText")?.value || "").trim();
    toast("Notitie bijgewerkt. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // Save contacts
  root.querySelector("#btnSaveContacts")?.addEventListener("click", () => {
    const id = state.ui.selectedId;
    if(!id) return;
    const v = state.verenigingen.find(x => x.id === id);
    if(!v) return;
    const rows = Array.from(root.querySelectorAll("[data-contact-row]"));
    v.contacten = rows.map(r => ({
      rol:      r.querySelector("[data-f='rol']")?.value?.trim()      || "",
      naam:     r.querySelector("[data-f='naam']")?.value?.trim()     || "",
      email:    r.querySelector("[data-f='email']")?.value?.trim()    || "",
      telefoon: r.querySelector("[data-f='telefoon']")?.value?.trim() || ""
    })).filter(c => c.rol || c.naam || c.email || c.telefoon);
    toast("Contacten bijgewerkt. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // Add contact row
  root.querySelector("#btnAddContact")?.addEventListener("click", () => {
    const v = state.verenigingen.find(x => x.id === state.ui.selectedId);
    if(!v) return;
    v.contacten = v.contacten || [];
    v.contacten.push({ rol: "", naam: "", email: "", telefoon: "" });
    state.rerender();
  });

  // Remove contact
  root.querySelectorAll("[data-remove-contact]")?.forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = Number(btn.getAttribute("data-remove-contact"));
      const v = state.verenigingen.find(x => x.id === state.ui.selectedId);
      if(!v) return;
      v.contacten.splice(idx, 1);
      state.rerender();
    });
  });

  // Delete club
  root.querySelector("#btnDeleteClub")?.addEventListener("click", () => {
    const id = state.ui.selectedId;
    if(!id) return;
    if(!confirm("Weet je zeker dat je deze vereniging wilt verwijderen?")) return;
    state.verenigingen = state.verenigingen.filter(v => v.id !== id);
    state.ui.selectedId = null;
    toast("Vereniging verwijderd. Klik Opslaan naar GitHub.");
    state.rerender();
  });

  // SAVE TO GITHUB
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true;
    btn.textContent = "Bezig…";
    try {
      await saveData("verenigingen.json", state.verenigingen, "Update verenigingen");
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

function tableRow(v, state){
  const first = v.contacten?.[0];
  const hasNote = !!(v.notitie);
  const contactLabel = first
    ? `${first.rol || "Contact"}: ${first.naam || "—"}${first.email ? " • " + first.email : ""}${first.telefoon ? " • " + first.telefoon : ""}`
    : "—";
  const isSel = state.ui.selectedId === v.id;
  return `
    <tr data-select-id="${esc(v.id)}" style="cursor:pointer;${isSel ? "background:rgba(82,232,232,0.06);" : ""}">
      <td><strong>${esc(v.naam || "")}</strong></td>
      <td>${esc(v.sport || "")}</td>
      <td>${esc(v.gemeente || "")}</td>
      <td style="font-size:12px;">${esc(contactLabel)}</td>
      <td>${hasNote ? "✓" : ""}</td>
    </tr>
  `;
}

function emptyDetails(){
  return `<div class="muted" style="font-size:13px;">Selecteer een vereniging in de tabel.</div>`;
}

function details(state){
  const v = state.verenigingen.find(x => x.id === state.ui.selectedId);
  if(!v) return emptyDetails();
  const admin = state.isAdmin;
  const contacts = v.contacten || [];

  return `
    <div class="split">
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="kv" style="margin-bottom:4px;">
          <div class="kv__k">Vereniging</div><div class="kv__v"><strong>${esc(v.naam)}</strong></div>
          <div class="kv__k">Sport</div><div class="kv__v">${esc(v.sport || "—")}</div>
          <div class="kv__k">Gemeente</div><div class="kv__v">${esc(v.gemeente || "—")}</div>
          <div class="kv__k">ID</div><div class="kv__v"><code style="font-size:11px;">${esc(v.id)}</code></div>
        </div>

        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Contactpersonen</div>
            ${admin ? `
              <div class="row" style="justify-content:flex-end;">
                <button class="btn btn--ghost" id="btnAddContact">+ Contact</button>
                <button class="btn" id="btnSaveContacts">Bewaar contacten</button>
              </div>
            ` : ""}
          </div>
          <div class="panel__body">
            ${contacts.length
              ? (admin ? contactsFormEditable(contacts) : contactsReadOnly(contacts))
              : `<div class="muted" style="font-size:13px;">Nog geen contacten.${admin ? " Klik op + Contact." : ""}</div>`}
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Wat speelt er?</div>
            ${admin ? `<button class="btn" id="btnSaveNote">Bewaar notitie</button>` : ""}
          </div>
          <div class="panel__body">
            ${admin
              ? `<textarea class="textarea" id="noteText" placeholder="Korte overdrachtsnotities…">${esc(v.notitie || "")}</textarea>`
              : `<div style="font-size:13px;line-height:1.5;white-space:pre-wrap;">${esc(v.notitie || "Geen notities.")}</div>`
            }
          </div>
        </div>

        ${admin ? `
          <div class="row" style="gap:10px;">
            <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
            <button class="btn btn--ghost btn--danger" id="btnDeleteClub">Verwijder</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function contactsFormEditable(contacts){
  return `
    <div class="grid" style="gap:10px;">
      ${contacts.map((c, idx) => `
        <div class="panel" data-contact-row="1" style="background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.08);">
          <div class="panel__header" style="padding:10px 12px;">
            <div style="font-size:12px;font-weight:600;">Contact ${idx+1}</div>
            <button class="btn btn--ghost" data-remove-contact="${idx}" style="font-size:11px;padding:6px 8px;">Verwijder</button>
          </div>
          <div class="panel__body" style="padding:10px 12px;">
            <div class="row">
              <input class="input" data-f="rol" placeholder="Rol" value="${esc(c.rol || "")}" />
              <input class="input" data-f="naam" placeholder="Naam" value="${esc(c.naam || "")}" />
            </div>
            <div class="row" style="margin-top:8px;">
              <input class="input" data-f="email" placeholder="E-mail" value="${esc(c.email || "")}" />
              <input class="input" data-f="telefoon" placeholder="Telefoon" value="${esc(c.telefoon || "")}" />
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function contactsReadOnly(contacts){
  return `
    <table class="table">
      <thead><tr><th>Rol</th><th>Naam</th><th>E-mail</th><th>Telefoon</th></tr></thead>
      <tbody>
        ${contacts.map(c => `
          <tr>
            <td>${esc(c.rol || "—")}</td>
            <td>${esc(c.naam || "—")}</td>
            <td>${c.email ? `<a href="mailto:${esc(c.email)}" style="color:var(--accent);">${esc(c.email)}</a>` : "—"}</td>
            <td>${c.telefoon ? `<a href="tel:${esc(c.telefoon)}" style="color:var(--accent);">${esc(c.telefoon)}</a>` : "—"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function addForm(){
  return `
    <div class="panel" style="border-color:rgba(82,232,232,0.2);">
      <div class="panel__header">
        <div class="panel__title">Nieuwe vereniging</div>
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
          <input class="input" id="newRol" placeholder="Contactrol (bijv. voorzitter)" />
          <input class="input" id="newContactNaam" placeholder="Contactnaam" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="newEmail" placeholder="E-mail" />
          <input class="input" id="newTelefoon" placeholder="Telefoon" />
        </div>
      </div>
    </div>
  `;
}

function filter(list, q){
  q = (q || "").trim().toLowerCase();
  if(!q) return list;
  return list.filter(v => {
    const c = (v.contacten || []).map(x => `${x.rol} ${x.naam} ${x.email} ${x.telefoon}`).join(" ");
    return `${v.naam} ${v.sport} ${v.gemeente} ${c} ${v.notitie || ""}`.toLowerCase().includes(q);
  });
}

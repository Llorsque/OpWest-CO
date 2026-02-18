import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Aankomende zaken", meta: "Deadlines, afspraken en events" };
}

export function render(state){
  const list = (state.aankomend || []).slice().sort((a,b) => (a.datum || "").localeCompare(b.datum || ""));
  const admin = state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Aankomende zaken <span class="muted" style="font-weight:400;">(${list.length})</span></div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          ${admin ? `<button class="btn" id="btnAdd">+ Item</button>` : ""}
          ${admin ? `<button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>` : ""}
        </div>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead><tr>
              <th style="width:14%;">Datum</th>
              <th style="width:24%;">Titel</th>
              <th style="width:20%;">Betrokken</th>
              <th>Notitie</th>
              ${admin ? `<th style="width:9%;">Actie</th>` : ""}
            </tr></thead>
            <tbody>
              ${list.map(x => `
                <tr>
                  <td>${esc(formatDate(x.datum))}</td>
                  <td><strong>${esc(x.titel || "")}</strong></td>
                  <td>${esc(x.betrokken || "")}</td>
                  <td style="font-size:12px;">${esc(x.notitie || "")}</td>
                  ${admin ? `<td><button class="btn btn--ghost" data-del="${esc(x.id)}">Verwijder</button></td>` : ""}
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen items.${admin ? " Klik op + Item." : ""}</div>`}
      </div>
    </div>
    ${state.ui.showAddUpcoming ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", () => { state.ui.showAddUpcoming = true; state.rerender(); });
  root.querySelector("#btnCancelUpcoming")?.addEventListener("click", () => { state.ui.showAddUpcoming = false; state.rerender(); });
  root.querySelector("#btnCreateUpcoming")?.addEventListener("click", () => {
    const titel = root.querySelector("#uTitel")?.value?.trim();
    if(!titel){ toast("Titel is verplicht."); return; }
    state.aankomend.unshift({
      id: uid("up"),
      datum:     root.querySelector("#uDatum")?.value              || "",
      titel,
      betrokken: root.querySelector("#uBetrokken")?.value?.trim()  || "",
      notitie:   root.querySelector("#uNotitie")?.value?.trim()    || ""
    });
    state.ui.showAddUpcoming = false;
    toast("Item toegevoegd. Klik Opslaan naar GitHub.");
    state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn => {
    btn.addEventListener("click", () => {
      state.aankomend = state.aankomend.filter(x => x.id !== btn.getAttribute("data-del"));
      toast("Item verwijderd. Klik Opslaan naar GitHub.");
      state.rerender();
    });
  });
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("aankomend.json", state.aankomend, "Update aankomend");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;border-color:rgba(82,232,232,0.2);">
      <div class="panel__header">
        <div class="panel__title">Nieuw item</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelUpcoming">Annuleren</button>
          <button class="btn" id="btnCreateUpcoming">Opslaan</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="uDatum" type="date" />
          <input class="input" id="uTitel" placeholder="Titel *" />
          <input class="input" id="uBetrokken" placeholder="Betrokken (vereniging/persoon)" />
        </div>
        <div style="margin-top:10px;">
          <textarea class="textarea" id="uNotitie" placeholder="Notitie"></textarea>
        </div>
      </div>
    </div>
  `;
}

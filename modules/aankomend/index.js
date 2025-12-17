import { esc, uid, toast, readLS, writeLS } from "../../shared/utils.js";

const LS_UPCOMING = "ovt_upcoming_v1";

export function meta(){
  return { title: "Aankomende zaken", meta: "Belangrijke data en reminders (lokaal)" };
}

export function hydrate(state){
  state.aankomend = readLS(LS_UPCOMING, state.aankomend || []);
}

export function render(state){
  const list = (state.aankomend || []).slice().sort((a,b)=> (a.datum||"").localeCompare(b.datum||""));
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Aankomende zaken</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Voor deadlines, afspraken, events en terugbelacties.</div>
        </div>
        <button class="btn" id="btnAdd">+ Item</button>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead>
              <tr>
                <th style="width:16%;">Datum</th>
                <th style="width:26%;">Titel</th>
                <th style="width:22%;">Betrokken</th>
                <th>Notitie</th>
                <th style="width:9%;">Actie</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(x => `
                <tr>
                  <td>${esc(x.datum||"")}</td>
                  <td><strong>${esc(x.titel||"")}</strong></td>
                  <td>${esc(x.betrokken||"")}</td>
                  <td>${esc(x.notitie||"")}</td>
                  <td><button class="btn btn--ghost" data-del="${esc(x.id)}">Verwijder</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen items. Klik op + Item.</div>`}
      </div>
    </div>

    ${state.ui.showAddUpcoming ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", ()=>{
    state.ui.showAddUpcoming = true;
    state.rerender();
  });

  root.querySelector("#btnCancelUpcoming")?.addEventListener("click", ()=>{
    state.ui.showAddUpcoming = false;
    state.rerender();
  });

  root.querySelector("#btnCreateUpcoming")?.addEventListener("click", ()=>{
    const datum = root.querySelector("#uDatum")?.value || "";
    const titel = root.querySelector("#uTitel")?.value?.trim();
    if(!titel){ toast("Titel is verplicht."); return; }
    const item = {
      id: uid("up"),
      datum,
      titel,
      betrokken: root.querySelector("#uBetrokken")?.value?.trim() || "",
      notitie: root.querySelector("#uNotitie")?.value?.trim() || ""
    };
    state.aankomend = [item, ...(state.aankomend||[])];
    writeLS(LS_UPCOMING, state.aankomend);
    toast("Item toegevoegd.");
    state.ui.showAddUpcoming = false;
    state.rerender();
  });

  root.querySelectorAll("[data-del]")?.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      state.aankomend = (state.aankomend||[]).filter(x=>x.id!==id);
      writeLS(LS_UPCOMING, state.aankomend);
      toast("Item verwijderd.");
      state.rerender();
    });
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;">
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
          <input class="input" id="uBetrokken" placeholder="Betrokken (vereniging/partner/persoon)" />
        </div>
        <div style="margin-top:10px;">
          <textarea class="textarea" id="uNotitie" placeholder="Notitie"></textarea>
        </div>
      </div>
    </div>
  `;
}

import { esc, uid, readLS, writeLS, toast } from "../../shared/utils.js";

const LS_ACT = "ovt_activiteiten_v1";

export function meta(){
  return { title: "Activiteitenplan", meta: "Plan en reflectie per activiteit (lokaal)" };
}

export function hydrate(state){
  state.activiteiten = readLS(LS_ACT, state.activiteiten || []);
}

export function render(state){
  const list = state.activiteiten || [];
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Activiteitenplan</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Compact: activiteit • thema • impact • partners • status.</div>
        </div>
        <button class="btn" id="btnAdd">+ Activiteit</button>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead>
              <tr>
                <th style="width:28%;">Activiteit</th>
                <th style="width:18%;">Thema</th>
                <th style="width:18%;">Impact</th>
                <th style="width:18%;">Status</th>
                <th>Partners</th>
                <th style="width:9%;">Actie</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(a => `
                <tr>
                  <td><strong>${esc(a.titel||"")}</strong></td>
                  <td>${esc(a.thema||"")}</td>
                  <td>${esc(a.impact||"")}</td>
                  <td>${esc(a.status||"")}</td>
                  <td>${esc(a.partners||"")}</td>
                  <td><button class="btn btn--ghost" data-del="${esc(a.id)}">Verwijder</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen activiteiten. Klik op + Activiteit.</div>`}
      </div>
    </div>

    ${state.ui.showAddAct ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", ()=>{
    state.ui.showAddAct = true;
    state.rerender();
  });

  root.querySelector("#btnCancelAct")?.addEventListener("click", ()=>{
    state.ui.showAddAct = false;
    state.rerender();
  });

  root.querySelector("#btnCreateAct")?.addEventListener("click", ()=>{
    const titel = root.querySelector("#aTitel")?.value?.trim();
    if(!titel){ toast("Titel is verplicht."); return; }
    const a = {
      id: uid("act"),
      titel,
      thema: root.querySelector("#aThema")?.value?.trim() || "",
      impact: root.querySelector("#aImpact")?.value?.trim() || "",
      status: root.querySelector("#aStatus")?.value?.trim() || "Gepland",
      partners: root.querySelector("#aPartners")?.value?.trim() || ""
    };
    state.activiteiten = [a, ...(state.activiteiten||[])];
    writeLS(LS_ACT, state.activiteiten);
    toast("Activiteit toegevoegd.");
    state.ui.showAddAct = false;
    state.rerender();
  });

  root.querySelectorAll("[data-del]")?.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      state.activiteiten = (state.activiteiten||[]).filter(x=>x.id!==id);
      writeLS(LS_ACT, state.activiteiten);
      toast("Activiteit verwijderd.");
      state.rerender();
    });
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;">
      <div class="panel__header">
        <div class="panel__title">Nieuwe activiteit</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelAct">Annuleren</button>
          <button class="btn" id="btnCreateAct">Opslaan</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="aTitel" placeholder="Titel *" />
          <input class="input" id="aThema" placeholder="Thema" />
          <input class="input" id="aImpact" placeholder="Impact (Sociaal / Gezondheid / etc.)" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="aStatus" placeholder="Status (Gepland/Lopend/Afgerond)" />
          <input class="input" id="aPartners" placeholder="Partners" />
        </div>
      </div>
    </div>
  `;
}

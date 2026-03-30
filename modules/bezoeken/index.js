import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

const BEZOEK_TYPES=["Bezoek","Telefonisch","Online","E-mail"];

export function meta(){ return { title:"Contactmomenten", meta:"Contactmomenten per vereniging" }; }

export function render(state){
  const list=(state.bezoeken||[]).slice().sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const admin=state.isAdmin;
  const clubs=state.verenigingen||[];

  return `
    ${admin?`<div class="toolbar">
      <button class="btn" id="btnAddBezoek">+ Contactmoment registreren</button>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAddBezoek?`
    <div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
      <div class="panel__header"><div class="panel__title">Nieuw contactmoment</div>
        <button class="btn btn--ghost" id="btnCancelBezoek">Annuleren</button></div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="bzVereniging" placeholder="Vereniging *" list="clubList" autofocus/>
          <datalist id="clubList">${clubs.map(v=>`<option value="${esc(v.naam)}">`).join("")}</datalist>
          <input class="input" id="bzDatum" type="date" value="${new Date().toISOString().slice(0,10)}" style="flex:0 0 160px;"/>
          <select class="input" id="bzType" style="flex:0 0 140px;">
            ${BEZOEK_TYPES.map(t=>`<option>${esc(t)}</option>`).join("")}
          </select>
        </div>
        <textarea class="textarea" id="bzNotitie" placeholder="Notitie / gespreksonderwerp" style="margin-top:8px;min-height:60px;"></textarea>
        <div class="row" style="margin-top:8px;justify-content:flex-end;">
          <button class="btn btn--save" id="btnCreateBezoek">Registreren</button>
        </div>
      </div>
    </div>`:""}

    <div class="panel">
      <div class="panel__header">
        <div class="panel__title">Contactmomenten <span class="muted" style="font-weight:400;">(${list.length})</span></div>
      </div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table">
          <thead><tr><th style="width:12%;">Datum</th><th style="width:22%;">Vereniging</th><th style="width:12%;">Type</th><th>Notitie</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead>
          <tbody>${list.map(b=>{
            const club=clubs.find(v=>v.id===b.verenigingId);
            return `<tr>
              <td>${formatDate(b.datum)}</td>
              <td><strong>${esc(club?.naam||b.verenigingNaam||"Onbekend")}</strong></td>
              <td><span class="pill">${esc(b.type||"Bezoek")}</span></td>
              <td style="font-size:12px;">${esc(b.notitie||"")}</td>
              ${admin?`<td><button class="btn--icon-del" data-del="${esc(b.id)}">×</button></td>`:""}
            </tr>`;
          }).join("")}</tbody>
        </table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen contactmomenten geregistreerd.</div>`}
      </div>
    </div>
  `;
}

export function bind(state,root){
  root.querySelector("#btnAddBezoek")?.addEventListener("click",()=>{state.ui.showAddBezoek=true;state.rerender();});
  root.querySelector("#btnCancelBezoek")?.addEventListener("click",()=>{state.ui.showAddBezoek=false;state.rerender();});

  root.querySelector("#btnCreateBezoek")?.addEventListener("click",()=>{
    const naam=root.querySelector("#bzVereniging")?.value?.trim();
    if(!naam){toast("Selecteer een vereniging.");return;}
    const match=state.verenigingen.find(v=>v.naam.toLowerCase()===naam.toLowerCase());
    state.bezoeken.unshift({
      id:uid("bzk"),
      verenigingId:match?.id||"",
      verenigingNaam:match?.naam||naam,
      datum:root.querySelector("#bzDatum")?.value||new Date().toISOString().slice(0,10),
      type:root.querySelector("#bzType")?.value||"Bezoek",
      notitie:root.querySelector("#bzNotitie")?.value?.trim()||""
    });
    state.ui.showAddBezoek=false;
    toast("Contactmoment geregistreerd.");state.rerender();
  });

  root.querySelectorAll("[data-del]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.getAttribute("data-del");
      if(!confirm("Contactmoment verwijderen?"))return;
      state.bezoeken=state.bezoeken.filter(x=>x.id!==id);
      toast("Verwijderd.");state.rerender();
    });
  });

  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";
    try{await saveData("bezoeken.json",state.bezoeken,"Update bezoeken");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

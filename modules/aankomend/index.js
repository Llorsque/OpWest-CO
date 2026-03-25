import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
export function meta(){ return { title:"Aankomende zaken", meta:"Deadlines, afspraken en events" }; }
export function render(state){
  const list=(state.aankomend||[]).slice().sort((a,b)=>(a.datum||"").localeCompare(b.datum||"")); const admin=state.isAdmin;
  return `
    ${admin?`<div class="toolbar"><button class="btn" id="btnAdd">+ Item</button><button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button></div>`:""}
    ${state.ui.showAddUpcoming?`<div class="panel" style="margin-bottom:16px;border-color:var(--accent);"><div class="panel__header"><div class="panel__title">Nieuw item</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelUpcoming">Annuleren</button><button class="btn btn--save" id="btnCreateUpcoming">Toevoegen</button></div></div>
      <div class="panel__body"><div class="row"><input class="input" id="uDatum" type="date"/><input class="input" id="uTitel" placeholder="Titel *" autofocus/><input class="input" id="uBetrokken" placeholder="Betrokken"/></div>
      <textarea class="textarea" id="uNotitie" placeholder="Notitie" style="margin-top:8px;min-height:60px;"></textarea></div></div>`:""}
    <div class="panel"><div class="panel__header"><div class="panel__title">Aankomende zaken <span class="muted" style="font-weight:400;">(${list.length})</span></div></div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table"><thead><tr><th style="width:14%;">Datum</th><th style="width:24%;">Titel</th><th style="width:20%;">Betrokken</th><th>Notitie</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead><tbody>
          ${list.map(x=>`<tr><td>${esc(formatDate(x.datum))}</td><td><strong>${esc(x.titel)}</strong></td><td>${esc(x.betrokken)}</td><td style="font-size:12px;">${esc(x.notitie)}</td>${admin?`<td><button class="btn--icon-del" data-del="${esc(x.id)}" title="Verwijder">x</button></td>`:""}</tr>`).join("")}
        </tbody></table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen items.</div>`}</div></div>`;
}
export function bind(state,root){
  root.querySelector("#btnAdd")?.addEventListener("click",()=>{state.ui.showAddUpcoming=true;state.rerender();});
  root.querySelector("#btnCancelUpcoming")?.addEventListener("click",()=>{state.ui.showAddUpcoming=false;state.rerender();});
  root.querySelector("#btnCreateUpcoming")?.addEventListener("click",()=>{
    const titel=root.querySelector("#uTitel")?.value?.trim(); if(!titel){toast("Titel verplicht.");return;}
    state.aankomend.unshift({id:uid("up"),datum:root.querySelector("#uDatum")?.value||"",titel,betrokken:root.querySelector("#uBetrokken")?.value?.trim()||"",notitie:root.querySelector("#uNotitie")?.value?.trim()||""});
    state.ui.showAddUpcoming=false; toast("Item toegevoegd."); state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn=>{btn.addEventListener("click",(e)=>{e.stopPropagation();const id=btn.getAttribute("data-del");const x=state.aankomend.find(a=>a.id===id);if(!x||!confirm(x.titel+" verwijderen?"))return;state.aankomend=state.aankomend.filter(a=>a.id!==id);toast("Verwijderd.");state.rerender();});});
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";try{await saveData("aankomend.json",state.aankomend,"Update aankomend");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}btn.disabled=false;btn.textContent="Opslaan naar GitHub";});
}

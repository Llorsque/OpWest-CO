import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
export function meta(){ return { title:"Activiteitenplan", meta:"Activiteiten, thema, impact en partners" }; }
export function render(state){
  const list=state.activiteiten||[]; const admin=state.isAdmin;
  return `
    ${admin?`<div class="toolbar"><button class="btn" id="btnAdd">+ Activiteit</button><button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button></div>`:""}
    ${state.ui.showAddAct?`<div class="panel" style="margin-bottom:16px;border-color:var(--accent);"><div class="panel__header"><div class="panel__title">Nieuwe activiteit</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelAct">Annuleren</button><button class="btn btn--save" id="btnCreateAct">Toevoegen</button></div></div>
      <div class="panel__body"><div class="row"><input class="input" id="aTitel" placeholder="Titel *" autofocus/><input class="input" id="aThema" placeholder="Thema"/><input class="input" id="aImpact" placeholder="Impact"/></div>
      <div class="row" style="margin-top:8px;"><input class="input" id="aStatus" placeholder="Status"/><input class="input" id="aPartners" placeholder="Partners"/></div></div></div>`:""}
    <div class="panel"><div class="panel__header"><div class="panel__title">Activiteitenplan <span class="muted" style="font-weight:400;">(${list.length})</span></div></div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table"><thead><tr><th style="width:26%;">Activiteit</th><th style="width:14%;">Thema</th><th style="width:14%;">Impact</th><th style="width:12%;">Status</th><th>Partners</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead><tbody>
          ${list.map(a=>`<tr><td><strong>${esc(a.titel)}</strong></td><td>${esc(a.thema)}</td><td>${esc(a.impact)}</td><td><span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}">${esc(a.status)}</span></td><td style="font-size:12px;">${esc(a.partners)}</td>${admin?`<td><button class="btn--icon-del" data-del="${esc(a.id)}" title="Verwijder">x</button></td>`:""}</tr>`).join("")}
        </tbody></table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen activiteiten.</div>`}</div></div>`;
}
export function bind(state,root){
  root.querySelector("#btnAdd")?.addEventListener("click",()=>{state.ui.showAddAct=true;state.rerender();});
  root.querySelector("#btnCancelAct")?.addEventListener("click",()=>{state.ui.showAddAct=false;state.rerender();});
  root.querySelector("#btnCreateAct")?.addEventListener("click",()=>{
    const titel=root.querySelector("#aTitel")?.value?.trim(); if(!titel){toast("Titel verplicht.");return;}
    state.activiteiten.unshift({id:uid("act"),titel,thema:root.querySelector("#aThema")?.value?.trim()||"",impact:root.querySelector("#aImpact")?.value?.trim()||"",status:root.querySelector("#aStatus")?.value?.trim()||"Gepland",partners:root.querySelector("#aPartners")?.value?.trim()||""});
    state.ui.showAddAct=false; toast("Activiteit toegevoegd."); state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn=>{btn.addEventListener("click",(e)=>{e.stopPropagation();const id=btn.getAttribute("data-del");const a=state.activiteiten.find(x=>x.id===id);if(!a||!confirm(a.titel+" verwijderen?"))return;state.activiteiten=state.activiteiten.filter(x=>x.id!==id);toast("Verwijderd.");state.rerender();});});
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";try{await saveData("activiteiten.json",state.activiteiten,"Update activiteiten");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}btn.disabled=false;btn.textContent="Opslaan naar GitHub";});
}

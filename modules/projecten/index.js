import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
export function meta(){ return { title:"Lopende projecten", meta:"Status, eigenaar en deadlines" }; }
export function render(state){
  const list=state.projecten||[]; const admin=state.isAdmin;
  return `
    ${admin?`<div class="toolbar"><button class="btn" id="btnAdd">+ Project</button><button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button></div>`:""}
    ${state.ui.showAddProject?`<div class="panel" style="margin-bottom:16px;border-color:var(--accent);"><div class="panel__header"><div class="panel__title">Nieuw project</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelProject">Annuleren</button><button class="btn btn--save" id="btnCreateProject">Toevoegen</button></div></div>
      <div class="panel__body"><div class="row"><input class="input" id="pNaam" placeholder="Naam *" autofocus/><input class="input" id="pStatus" placeholder="Status"/><input class="input" id="pEigenaar" placeholder="Eigenaar"/><input class="input" id="pDeadline" type="date"/></div>
      <textarea class="textarea" id="pNotitie" placeholder="Notitie" style="margin-top:8px;min-height:60px;"></textarea></div></div>`:""}
    <div class="panel"><div class="panel__header"><div class="panel__title">Projecten <span class="muted" style="font-weight:400;">(${list.length})</span></div></div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table"><thead><tr><th style="width:26%;">Project</th><th style="width:12%;">Status</th><th style="width:16%;">Eigenaar</th><th style="width:14%;">Deadline</th><th>Notitie</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead><tbody>
          ${list.map(p=>`<tr><td><strong>${esc(p.naam)}</strong></td><td><span class="pill pill--status pill--${p.status==="Afgerond"?"done":p.status==="Lopend"?"active":"default"}">${esc(p.status)}</span></td><td>${esc(p.eigenaar)}</td><td>${esc(p.deadline)}</td><td style="font-size:12px;">${esc(p.notitie)}</td>${admin?`<td><button class="btn--icon-del" data-del="${esc(p.id)}" title="Verwijder">x</button></td>`:""}</tr>`).join("")}
        </tbody></table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen projecten.</div>`}</div></div>`;
}
export function bind(state,root){
  root.querySelector("#btnAdd")?.addEventListener("click",()=>{state.ui.showAddProject=true;state.rerender();});
  root.querySelector("#btnCancelProject")?.addEventListener("click",()=>{state.ui.showAddProject=false;state.rerender();});
  root.querySelector("#btnCreateProject")?.addEventListener("click",()=>{
    const naam=root.querySelector("#pNaam")?.value?.trim(); if(!naam){toast("Naam verplicht.");return;}
    state.projecten.unshift({id:uid("prj"),naam,status:root.querySelector("#pStatus")?.value?.trim()||"Open",eigenaar:root.querySelector("#pEigenaar")?.value?.trim()||"",deadline:root.querySelector("#pDeadline")?.value||"",notitie:root.querySelector("#pNotitie")?.value?.trim()||""});
    state.ui.showAddProject=false; toast("Project toegevoegd."); state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn=>{btn.addEventListener("click",(e)=>{e.stopPropagation();const id=btn.getAttribute("data-del");const p=state.projecten.find(x=>x.id===id);if(!p||!confirm(p.naam+" verwijderen?"))return;state.projecten=state.projecten.filter(x=>x.id!==id);toast("Verwijderd.");state.rerender();});});
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";try{await saveData("projecten.json",state.projecten,"Update projecten");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}btn.disabled=false;btn.textContent="Opslaan naar GitHub";});
}

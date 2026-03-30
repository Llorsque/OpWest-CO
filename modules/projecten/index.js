import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

const STATUS_OPTS=["Open","Lopend","Afgerond","On hold"];

export function meta(){ return { title:"Lopende projecten", meta:"Status, eigenaar, deadlines en notities" }; }

export function render(state){
  const list=state.projecten||[]; const admin=state.isAdmin;
  const sel=state.ui.selectedProjectId;

  return `
    ${admin?`<div class="toolbar">
      <button class="btn" id="btnAdd">+ Project</button>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAddProject?`
    <div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
      <div class="panel__header"><div class="panel__title">Nieuw project</div>
        <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelProject">Annuleren</button><button class="btn btn--save" id="btnCreateProject">Toevoegen</button></div></div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="pNaam" placeholder="Projectnaam *" autofocus style="flex:2;"/>
          <select class="input" id="pStatus" style="flex:0 0 130px;">${STATUS_OPTS.map(s=>`<option>${s}</option>`).join("")}</select>
          <input class="input" id="pEigenaar" placeholder="Eigenaar"/>
          <input class="input" id="pDeadline" type="date"/>
        </div>
        <textarea class="textarea" id="pNotitie" placeholder="Omschrijving / eerste notitie" style="margin-top:8px;min-height:60px;"></textarea>
      </div>
    </div>`:""}

    <div class="panel">
      <div class="panel__header"><div class="panel__title">Projecten <span class="muted" style="font-weight:400;">(${list.length})</span></div></div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table">
          <thead><tr>
            <th style="width:28%;">Project</th><th style="width:12%;">Status</th><th style="width:16%;">Eigenaar</th>
            <th style="width:14%;">Deadline</th><th style="width:8%;">Log</th>
            ${admin?`<th style="width:4%;"></th>`:""}
          </tr></thead>
          <tbody>${list.map(p=>{
            const isSel=sel===p.id;
            const logCount=(p.log||[]).length;
            return `<tr data-select-prj="${esc(p.id)}" style="cursor:pointer;${isSel?"background:var(--accent-light);":""}">
              <td><strong>${esc(p.naam)}</strong>${p.omschrijving?`<div class="muted" style="font-size:11px;">${esc(p.omschrijving).slice(0,60)}${p.omschrijving.length>60?"…":""}</div>`:""}</td>
              <td><span class="pill pill--status pill--${p.status==="Afgerond"?"done":p.status==="Lopend"?"active":p.status==="On hold"?"warning":"default"}">${esc(p.status||"Open")}</span></td>
              <td>${esc(p.eigenaar||"")}</td>
              <td>${formatDate(p.deadline)}</td>
              <td>${logCount?`<span class="pill">${logCount}</span>`:""}</td>
              ${admin?`<td><button class="btn--icon-del" data-del="${esc(p.id)}">×</button></td>`:""}
            </tr>`;
          }).join("")}</tbody>
        </table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen projecten.${admin?" Klik + Project.":""}</div>`}
      </div>
    </div>

    ${sel?`<div class="modal-overlay" id="prjModalOverlay"><div class="modal">${projectDetail(state)}</div></div>`:""}
  `;
}

export function bind(state,root){
  // Add
  root.querySelector("#btnAdd")?.addEventListener("click",()=>{state.ui.showAddProject=true;state.ui.selectedProjectId=null;state.rerender();});
  root.querySelector("#btnCancelProject")?.addEventListener("click",()=>{state.ui.showAddProject=false;state.rerender();});
  root.querySelector("#btnCreateProject")?.addEventListener("click",()=>{
    const naam=root.querySelector("#pNaam")?.value?.trim(); if(!naam){toast("Naam verplicht.");return;}
    const notitie=root.querySelector("#pNotitie")?.value?.trim()||"";
    const p={
      id:uid("prj"),naam,
      status:root.querySelector("#pStatus")?.value||"Open",
      eigenaar:root.querySelector("#pEigenaar")?.value?.trim()||"",
      deadline:root.querySelector("#pDeadline")?.value||"",
      omschrijving:notitie,
      log: notitie ? [{datum:new Date().toISOString().slice(0,10),tekst:notitie}] : []
    };
    state.projecten.unshift(p);
    state.ui.showAddProject=false; state.ui.selectedProjectId=p.id;
    toast("Project aangemaakt."); state.rerender();
  });

  // Select row → open modal
  root.querySelectorAll("[data-select-prj]")?.forEach(tr=>{tr.addEventListener("click",()=>{
    state.ui.selectedProjectId=tr.getAttribute("data-select-prj"); state.ui.showAddProject=false; state.rerender();
  });});

  // Delete from table
  root.querySelectorAll("[data-del]")?.forEach(btn=>{btn.addEventListener("click",(e)=>{
    e.stopPropagation(); const id=btn.getAttribute("data-del");
    const p=state.projecten.find(x=>x.id===id);
    if(!p||!confirm(`'${p.naam}' verwijderen?`))return;
    state.projecten=state.projecten.filter(x=>x.id!==id);
    if(state.ui.selectedProjectId===id) state.ui.selectedProjectId=null;
    toast("Verwijderd."); state.rerender();
  });});

  // Modal close
  root.querySelector("#prjModalOverlay")?.addEventListener("click",(e)=>{
    if(e.target.id==="prjModalOverlay"){state.ui.selectedProjectId=null;state.rerender();}
  });
  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedProjectId=null;state.rerender();});
  const escHandler=(e)=>{if(e.key==="Escape"&&state.ui.selectedProjectId){state.ui.selectedProjectId=null;state.rerender();}};
  document.addEventListener("keydown",escHandler);
  root._escCleanup?.(); root._escCleanup=()=>document.removeEventListener("keydown",escHandler);

  // Save fields
  root.querySelector("#btnSaveFields")?.addEventListener("click",()=>{
    const p=getP(state); if(!p)return;
    p.naam=root.querySelector("#editNaam")?.value?.trim()||p.naam;
    p.status=root.querySelector("#editStatus")?.value||p.status;
    p.eigenaar=root.querySelector("#editEigenaar")?.value?.trim()||"";
    p.deadline=root.querySelector("#editDeadline")?.value||"";
    p.omschrijving=root.querySelector("#editOmschrijving")?.value?.trim()||"";
    toast("Project bijgewerkt."); state.rerender();
  });

  // Add log entry
  root.querySelector("#btnAddLog")?.addEventListener("click",()=>{
    const p=getP(state); if(!p)return;
    const tekst=root.querySelector("#logTekst")?.value?.trim();
    if(!tekst){toast("Vul een notitie in.");return;}
    p.log=p.log||[];
    p.log.unshift({datum:new Date().toISOString().slice(0,10),tekst});
    toast("Notitie toegevoegd."); state.rerender();
  });

  // Delete log entry
  root.querySelectorAll("[data-del-log]")?.forEach(btn=>{btn.addEventListener("click",()=>{
    const p=getP(state); if(!p)return;
    p.log.splice(Number(btn.getAttribute("data-del-log")),1); state.rerender();
  });});

  // Toggle status from modal
  root.querySelector("#editStatus")?.addEventListener("change",(e)=>{
    const p=getP(state); if(p) p.status=e.target.value;
  });

  // Save to GitHub
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";
    try{await saveData("projecten.json",state.projecten,"Update projecten");toast("✓ Opgeslagen!");}catch(e){toast("✗ "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

function getP(state){ return state.projecten.find(x=>x.id===state.ui.selectedProjectId); }

/* ── MODAL DETAIL ──────────────────────────── */

function projectDetail(state){
  const p=getP(state); if(!p)return "";
  const admin=state.isAdmin;
  const log=p.log||[];
  // Backward compat: if old project has notitie but no log, show notitie
  const hasOldNotitie=p.notitie&&!log.length;

  return `
    <div class="panel__header">
      <div>
        <div class="panel__title">${esc(p.naam)}</div>
        <div class="muted" style="font-size:12px;">
          <span class="pill pill--status pill--${p.status==="Afgerond"?"done":p.status==="Lopend"?"active":p.status==="On hold"?"warning":"default"}" style="font-size:10px;">${esc(p.status||"Open")}</span>
          ${p.eigenaar?" · "+esc(p.eigenaar):""}${p.deadline?" · Deadline: "+formatDate(p.deadline):""}
        </div>
      </div>
      <button class="btn btn--ghost" id="btnCloseDetail">Sluiten</button>
    </div>
    <div class="panel__body">
      <div class="split">
        <div>
          ${admin?`
          <div class="subpanel">
            <div class="subpanel__header"><strong>Gegevens</strong>
              <button class="btn" id="btnSaveFields" style="font-size:12px;padding:5px 10px;">Bewaar</button></div>
            <div class="row">
              <input class="input" id="editNaam" placeholder="Projectnaam" value="${esc(p.naam||"")}"/>
              <select class="input" id="editStatus" style="flex:0 0 130px;">${STATUS_OPTS.map(s=>`<option ${s===p.status?"selected":""}>${s}</option>`).join("")}</select>
            </div>
            <div class="row" style="margin-top:8px;">
              <input class="input" id="editEigenaar" placeholder="Eigenaar" value="${esc(p.eigenaar||"")}"/>
              <input class="input" id="editDeadline" type="date" value="${esc(p.deadline||"")}" style="flex:0 0 160px;"/>
            </div>
            <div style="margin-top:8px;">
              <textarea class="textarea" id="editOmschrijving" placeholder="Omschrijving" style="min-height:60px;">${esc(p.omschrijving||"")}</textarea>
            </div>
          </div>
          `:`
          <div class="subpanel">
            <div class="subpanel__header"><strong>Gegevens</strong></div>
            <div class="kv">
              <div class="kv__k">Status</div><div class="kv__v"><span class="pill pill--status pill--${p.status==="Afgerond"?"done":p.status==="Lopend"?"active":"default"}">${esc(p.status)}</span></div>
              <div class="kv__k">Eigenaar</div><div class="kv__v">${esc(p.eigenaar||"—")}</div>
              <div class="kv__k">Deadline</div><div class="kv__v">${formatDate(p.deadline)}</div>
            </div>
            ${p.omschrijving?`<div style="margin-top:10px;font-size:13px;white-space:pre-wrap;">${esc(p.omschrijving)}</div>`:""}
          </div>
          `}
        </div>

        <div>
          <div class="subpanel">
            <div class="subpanel__header"><strong>Notities & logboek</strong> <span class="muted">(${log.length})</span></div>
            ${admin?`
            <div class="row" style="margin-bottom:10px;">
              <input class="input" id="logTekst" placeholder="Nieuwe notitie…"/>
              <button class="btn" id="btnAddLog" style="font-size:12px;padding:6px 12px;">+ Notitie</button>
            </div>`:""}

            ${hasOldNotitie?`
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
              <div style="color:var(--muted);min-width:68px;">Eerder</div>
              <div style="flex:1;">${esc(p.notitie)}</div>
            </div>`:""}

            ${log.length?log.map((entry,i)=>`
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">
              <div style="color:var(--accent);min-width:68px;">${formatDate(entry.datum)}</div>
              <div style="flex:1;">${esc(entry.tekst)}</div>
              ${admin?`<button class="btn--icon-del" data-del-log="${i}">×</button>`:""}
            </div>`).join(""):`
            ${!hasOldNotitie?`<div class="muted" style="font-size:13px;">Nog geen notities.${admin?" Voeg een notitie toe hierboven.":""}</div>`:""}`}
          </div>
        </div>
      </div>
    </div>`;
}

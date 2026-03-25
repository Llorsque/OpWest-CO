import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
const STATUS_OPTIONS=["Intake","Lopend","Afronding","Afgerond","Gepauzeerd"];
const TYPE_OPTIONS=["Bestuurlijk","Financieel","Ledenwerving","Accommodatie","Vrijwilligers","Fusie/samenwerking","Vitaliteitscan","Anders"];

export function meta(){ return { title:"Trajecten", meta:"Langdurige ondersteuning per vereniging" }; }

export function render(state){
  const list=state.trajecten||[]; const admin=state.isAdmin;
  const lopend=list.filter(t=>t.status==="Lopend"||t.status==="Intake");
  const afronding=list.filter(t=>t.status==="Afronding"||t.status==="Gepauzeerd");
  const afgerond=list.filter(t=>t.status==="Afgerond");

  return `
    ${admin?`<div class="toolbar">
      <button class="btn" id="btnAddTraject">+ Nieuw traject</button>
      <button class="btn btn--save" id="btnSaveGitHub">💾 Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAddTraject?addForm(state):""}

    <div class="panel">
      <div class="panel__header">
        <div class="panel__title">Trajecten <span class="muted" style="font-weight:400;">(${list.length})</span></div>
      </div>
      <div class="panel__body">
        ${!list.length?`<div class="muted" style="font-size:13px;text-align:center;padding:20px;">Nog geen trajecten.${admin?" Klik + Nieuw traject.":""}</div>`
          :`${trjGroup("Actief",lopend,state,admin)}${trjGroup("Afronding / Gepauzeerd",afronding,state,admin)}${trjGroup("Afgerond",afgerond,state,admin)}`}
      </div>
    </div>

    ${state.ui.selectedTrajectId&&!state.ui.showAddTraject?`<div class="panel" style="margin-top:16px;">${trjDetail(state)}</div>`:""}
  `;
}

export function bind(state,root){
  root.querySelector("#btnAddTraject")?.addEventListener("click",()=>{state.ui.showAddTraject=true;state.ui.selectedTrajectId=null;state.rerender();});
  root.querySelector("#btnCancelTraject")?.addEventListener("click",()=>{state.ui.showAddTraject=false;state.rerender();});

  root.querySelector("#btnCreateTraject")?.addEventListener("click",()=>{
    const naam=root.querySelector("#tVereniging")?.value?.trim(); if(!naam){toast("Verenigingsnaam verplicht.");return;}
    const match=state.verenigingen.find(v=>v.naam.toLowerCase()===naam.toLowerCase());
    state.trajecten.unshift({id:uid("trj"),verenigingId:match?.id||"",verenigingNaam:match?.naam||naam,
      type:root.querySelector("#tType")?.value||"",omschrijving:root.querySelector("#tOmschrijving")?.value?.trim()||"",
      startDatum:root.querySelector("#tStart")?.value||"",verwachtEinde:root.querySelector("#tEinde")?.value||"",
      status:root.querySelector("#tStatus")?.value||"Intake",coach:root.querySelector("#tCoach")?.value?.trim()||"",log:[]});
    state.ui.showAddTraject=false; state.ui.selectedTrajectId=state.trajecten[0].id;
    toast("Traject aangemaakt."); state.rerender();
  });

  // Select
  root.querySelectorAll("[data-select-trj]")?.forEach(el=>{el.addEventListener("click",()=>{state.ui.selectedTrajectId=el.getAttribute("data-select-trj");state.ui.showAddTraject=false;state.rerender();});});

  // DELETE directly from list
  root.querySelectorAll("[data-del-trj]")?.forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const id=btn.getAttribute("data-del-trj");
      const t=state.trajecten.find(x=>x.id===id);
      if(!t)return;
      if(!confirm(`Traject '${t.verenigingNaam} — ${t.type}' verwijderen?`))return;
      state.trajecten=state.trajecten.filter(x=>x.id!==id);
      if(state.ui.selectedTrajectId===id) state.ui.selectedTrajectId=null;
      toast("Traject verwijderd."); state.rerender();
    });
  });

  // Detail bindings
  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedTrajectId=null;state.rerender();});
  root.querySelector("#btnAddLog")?.addEventListener("click",()=>{
    const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId); if(!t)return;
    const tekst=root.querySelector("#logTekst")?.value?.trim(); if(!tekst){toast("Vul een logbericht in.");return;}
    t.log=t.log||[]; t.log.unshift({datum:root.querySelector("#logDatum")?.value||new Date().toISOString().slice(0,10),tekst});
    toast("Log toegevoegd."); state.rerender();
  });
  root.querySelector("#detailStatus")?.addEventListener("change",e=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.status=e.target.value;});
  root.querySelector("#detailType")?.addEventListener("change",e=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.type=e.target.value;});
  root.querySelector("#detailEinde")?.addEventListener("change",e=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.verwachtEinde=e.target.value;});
  root.querySelector("#detailOmschrijving")?.addEventListener("input",e=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.omschrijving=e.target.value;});
  root.querySelector("#detailCoach")?.addEventListener("input",e=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.coach=e.target.value?.trim();});
  root.querySelectorAll("[data-del-log]")?.forEach(btn=>{btn.addEventListener("click",()=>{const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId);if(t)t.log.splice(Number(btn.getAttribute("data-del-log")),1);state.rerender();});});

  // SAVE
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig…";
    try{await saveData("trajecten.json",state.trajecten,"Update trajecten");toast("✓ Opgeslagen!");}catch(e){toast("✗ "+e.message);}
    btn.disabled=false;btn.textContent="💾 Opslaan naar GitHub";
  });
}

/* ── Rendering ─────────────────────────────── */

function trjGroup(title,items,state,admin){
  if(!items.length)return "";
  return `<div style="margin-bottom:20px;">
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${esc(title)}</div>
    ${items.map(t=>{
      const isSel=state.ui.selectedTrajectId===t.id;
      return `<div class="trj-row ${isSel?"trj-row--active":""}" data-select-trj="${esc(t.id)}">
        <div class="trj-row__main">
          <div class="trj-row__title">${esc(t.verenigingNaam)}</div>
          <div class="trj-row__sub">${esc(t.type||"Onbepaald")}${t.coach?" · "+esc(t.coach):""}</div>
        </div>
        <div class="row" style="gap:6px;flex-shrink:0;">
          ${t.startDatum?`<span class="pill" style="font-size:10px;">Sinds ${formatDate(t.startDatum)}</span>`:""}
          ${t.log?.length?`<span class="pill" style="font-size:10px;">${t.log.length} log</span>`:""}
          <span class="pill pill--status pill--${t.status==="Lopend"||t.status==="Intake"?"active":t.status==="Afgerond"?"done":"warning"}">${esc(t.status)}</span>
          ${admin?`<button class="btn--icon-del" data-del-trj="${esc(t.id)}" title="Verwijder">×</button>`:""}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

function trjDetail(state){
  const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId); if(!t)return ""; const admin=state.isAdmin; const log=t.log||[];
  return `
    <div class="panel__header">
      <div><div class="panel__title">${esc(t.verenigingNaam)}</div>
        <div class="muted" style="font-size:12px;">${esc(t.type||"")} · ${esc(t.status)}</div></div>
      <button class="btn btn--ghost" id="btnCloseDetail">✕ Sluiten</button>
    </div>
    <div class="panel__body">
      <div class="split">
        <div>
          <div class="kv" style="margin-bottom:14px;">
            <div class="kv__k">Type</div><div class="kv__v">${admin?sel("detailType",TYPE_OPTIONS,t.type):esc(t.type||"—")}</div>
            <div class="kv__k">Status</div><div class="kv__v">${admin?sel("detailStatus",STATUS_OPTIONS,t.status):esc(t.status||"—")}</div>
            <div class="kv__k">Start</div><div class="kv__v">${formatDate(t.startDatum)}</div>
            <div class="kv__k">Verwacht einde</div><div class="kv__v">${admin?`<input class="input" id="detailEinde" type="date" value="${esc(t.verwachtEinde||"")}" style="flex:unset;width:160px;"/>`:formatDate(t.verwachtEinde)}</div>
            <div class="kv__k">Coach</div><div class="kv__v">${admin?`<input class="input" id="detailCoach" value="${esc(t.coach||"")}" placeholder="Naam" style="flex:unset;width:200px;"/>`:esc(t.coach||"—")}</div>
          </div>
          <div class="label">Omschrijving</div>
          ${admin?`<textarea class="textarea" id="detailOmschrijving" placeholder="Wat houdt het traject in?">${esc(t.omschrijving||"")}</textarea>`
            :`<div class="readblock">${esc(t.omschrijving||"Geen omschrijving.")}</div>`}
        </div>
        <div>
          <div class="subpanel">
            <div class="subpanel__header"><strong>Logboek</strong> <span class="muted">(${log.length})</span></div>
            ${admin?`<div class="row" style="margin-bottom:10px;">
              <input class="input" id="logDatum" type="date" value="${new Date().toISOString().slice(0,10)}" style="flex:0 0 150px;"/>
              <input class="input" id="logTekst" placeholder="Wat is er gebeurd?"/>
              <button class="btn" id="btnAddLog" style="font-size:12px;padding:6px 12px;">+ Log</button></div>`:""}
            ${log.length?log.map((e,i)=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
              <div style="font-size:11px;color:var(--accent);min-width:68px;">${formatDate(e.datum)}</div>
              <div style="font-size:13px;flex:1;">${esc(e.tekst)}</div>
              ${admin?`<button class="btn--icon-del" data-del-log="${i}">×</button>`:""}</div>`).join("")
              :`<div class="muted" style="font-size:13px;">Nog geen logboek.</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

function addForm(state){
  const clubs=state.verenigingen||[];
  return `<div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
    <div class="panel__header"><div class="panel__title">Nieuw traject</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelTraject">Annuleren</button><button class="btn btn--save" id="btnCreateTraject">Aanmaken</button></div></div>
    <div class="panel__body">
      <div class="row">
        <input class="input" id="tVereniging" placeholder="Verenigingsnaam *" list="clubList" autofocus/>
        <datalist id="clubList">${clubs.map(v=>`<option value="${esc(v.naam)}">`).join("")}</datalist>
        ${selId("tType",TYPE_OPTIONS,"","Type")} ${selId("tStatus",STATUS_OPTIONS,"Intake","Status")}</div>
      <div class="row" style="margin-top:8px;">
        <input class="input" id="tStart" type="date" title="Start"/><input class="input" id="tEinde" type="date" title="Einde"/>
        <input class="input" id="tCoach" placeholder="Coach"/></div>
      <textarea class="textarea" id="tOmschrijving" placeholder="Omschrijving" style="margin-top:8px;min-height:60px;"></textarea>
    </div></div>`;
}

function sel(id,opts,cur){return `<select class="input" id="${id}" style="flex:unset;width:180px;">${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;}
function selId(id,opts,cur,ph){return `<select class="input" id="${id}"><option value="" disabled ${!cur?"selected":""}>${esc(ph)}</option>${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;}

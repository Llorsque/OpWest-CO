import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
const STATUS_OPTIONS=["Intake","Lopend","Afronding","Afgerond","Gepauzeerd"];
const PROGRAMMA_FALLBACK=["Rabo ClubSupport","Overig"];

function getProgrammaOpties(state){ return state.settings?.programmaOpties?.length ? state.settings.programmaOpties : PROGRAMMA_FALLBACK; }

export function meta(){ return { title:"Trajecten", meta:"Langdurige ondersteuning per vereniging" }; }

export function render(state){
  const list=state.trajecten||[]; const admin=state.isAdmin;
  const lopend=list.filter(t=>t.status==="Lopend"||t.status==="Intake");
  const afronding=list.filter(t=>t.status==="Afronding"||t.status==="Gepauzeerd");
  const afgerond=list.filter(t=>t.status==="Afgerond");

  return `
    ${admin?`<div class="toolbar"><button class="btn" id="btnAddTraject">+ Nieuw traject</button><button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button></div>`:""}
    ${state.ui.showAddTraject?addForm(state):""}
    <div class="panel"><div class="panel__header"><div class="panel__title">Trajecten <span class="muted" style="font-weight:400;">(${list.length})</span></div></div>
      <div class="panel__body">
        ${!list.length?`<div class="muted" style="font-size:13px;text-align:center;padding:20px;">Nog geen trajecten.${admin?" Klik + Nieuw traject.":""}</div>`
          :`${trjGroup("Actief",lopend,state,admin)}${trjGroup("Afronding / Gepauzeerd",afronding,state,admin)}${trjGroup("Afgerond",afgerond,state,admin)}`}
      </div></div>
    ${state.ui.selectedTrajectId&&!state.ui.showAddTraject?`<div class="modal-overlay" id="trjModalOverlay">
      <div class="modal">${trjDetail(state)}</div>
    </div>`:""}
  `;
}

export function bind(state,root){
  root.querySelector("#btnAddTraject")?.addEventListener("click",()=>{state.ui.showAddTraject=true;state.ui.selectedTrajectId=null;state.rerender();});
  root.querySelector("#btnCancelTraject")?.addEventListener("click",()=>{state.ui.showAddTraject=false;state.rerender();});
  root.querySelector("#btnCreateTraject")?.addEventListener("click",()=>{
    const naam=root.querySelector("#tVereniging")?.value?.trim(); if(!naam){toast("Verenigingsnaam verplicht.");return;}
    const match=state.verenigingen.find(v=>v.naam.toLowerCase()===naam.toLowerCase());
    const finTotaal=parseFloat(root.querySelector("#tFinTotaal")?.value)||0;
    const bronnen=[];
    const bron1=root.querySelector("#tFinBron1")?.value; const bedrag1=parseFloat(root.querySelector("#tFinBedrag1")?.value)||0;
    if(bron1&&bedrag1) bronnen.push({bron:bron1,bedrag:bedrag1,percentage:finTotaal>0?Math.round((bedrag1/finTotaal)*100):0});
    const bron2=root.querySelector("#tFinBron2")?.value; const bedrag2=parseFloat(root.querySelector("#tFinBedrag2")?.value)||0;
    if(bron2&&bedrag2) bronnen.push({bron:bron2,bedrag:bedrag2,percentage:finTotaal>0?Math.round((bedrag2/finTotaal)*100):0});
    state.trajecten.unshift({
      id:uid("trj"),verenigingId:match?.id||"",verenigingNaam:match?.naam||naam,
      type:root.querySelector("#tType")?.value||"",
      thema:root.querySelector("#tThema")?.value||"",
      programma:root.querySelector("#tProgramma")?.value||"Overig",
      omschrijving:root.querySelector("#tOmschrijving")?.value?.trim()||"",
      startDatum:root.querySelector("#tStart")?.value||"",verwachtEinde:root.querySelector("#tEinde")?.value||"",
      status:root.querySelector("#tStatus")?.value||"Intake",coach:root.querySelector("#tCoach")?.value?.trim()||"",
      financien:{totaal:finTotaal,bronnen},
      log:[]
    });
    state.ui.showAddTraject=false; state.ui.selectedTrajectId=state.trajecten[0].id;
    toast("Traject aangemaakt."); state.rerender();
  });

  root.querySelectorAll("[data-select-trj]")?.forEach(el=>{el.addEventListener("click",()=>{
    state.ui.selectedTrajectId=el.getAttribute("data-select-trj");state.ui.showAddTraject=false;state.rerender();
  });});

  // Close modal on overlay click
  root.querySelector("#trjModalOverlay")?.addEventListener("click",(e)=>{
    if(e.target.id==="trjModalOverlay"){state.ui.selectedTrajectId=null;state.rerender();}
  });
  const escHandler=(e)=>{if(e.key==="Escape"&&state.ui.selectedTrajectId){state.ui.selectedTrajectId=null;state.rerender();}};
  document.addEventListener("keydown",escHandler);
  root._escCleanup?.(); root._escCleanup=()=>document.removeEventListener("keydown",escHandler);
  root.querySelectorAll("[data-del-trj]")?.forEach(btn=>{
    btn.addEventListener("click",(e)=>{e.stopPropagation();const id=btn.getAttribute("data-del-trj");const t=state.trajecten.find(x=>x.id===id);
      if(!t||!confirm(`Traject '${t.verenigingNaam}' verwijderen?`))return;
      state.trajecten=state.trajecten.filter(x=>x.id!==id);if(state.ui.selectedTrajectId===id)state.ui.selectedTrajectId=null;
      toast("Verwijderd.");state.rerender();});
  });

  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedTrajectId=null;state.rerender();});

  // Log
  root.querySelector("#btnAddLog")?.addEventListener("click",()=>{
    const t=state.trajecten.find(x=>x.id===state.ui.selectedTrajectId); if(!t)return;
    const tekst=root.querySelector("#logTekst")?.value?.trim(); if(!tekst){toast("Vul een logbericht in.");return;}
    t.log=t.log||[]; t.log.unshift({datum:root.querySelector("#logDatum")?.value||new Date().toISOString().slice(0,10),tekst});
    toast("Log toegevoegd."); state.rerender();
  });

  // Detail field changes
  root.querySelector("#detailStatus")?.addEventListener("change",e=>{const t=getTrj(state);if(t)t.status=e.target.value;});
  root.querySelector("#detailType")?.addEventListener("change",e=>{const t=getTrj(state);if(t)t.type=e.target.value;});
  root.querySelector("#detailThema")?.addEventListener("change",e=>{const t=getTrj(state);if(t)t.thema=e.target.value;});
  root.querySelector("#detailProgramma")?.addEventListener("change",e=>{const t=getTrj(state);if(t)t.programma=e.target.value;});
  root.querySelector("#detailEinde")?.addEventListener("change",e=>{const t=getTrj(state);if(t)t.verwachtEinde=e.target.value;});
  root.querySelector("#detailOmschrijving")?.addEventListener("input",e=>{const t=getTrj(state);if(t)t.omschrijving=e.target.value;});
  root.querySelector("#detailCoach")?.addEventListener("input",e=>{const t=getTrj(state);if(t)t.coach=e.target.value?.trim();});
  root.querySelectorAll("[data-del-log]")?.forEach(btn=>{btn.addEventListener("click",()=>{const t=getTrj(state);if(t)t.log.splice(Number(btn.getAttribute("data-del-log")),1);state.rerender();});});

  // Financiën — totaalbedrag
  root.querySelector("#finTotaal")?.addEventListener("input",e=>{
    const t=getTrj(state);if(!t)return;
    t.financien=t.financien||{totaal:0,bronnen:[]};
    t.financien.totaal=parseFloat(e.target.value)||0;
    updateFinOverzicht(root,t);
  });

  // Financiën — add bron
  root.querySelector("#btnAddBron")?.addEventListener("click",()=>{
    const t=getTrj(state);if(!t)return;
    t.financien=t.financien||{totaal:0,bronnen:[]};
    t.financien.bronnen.push({bron:"",bedrag:0,percentage:0});
    state.rerender();
  });

  // Financiën — delete bron
  root.querySelectorAll("[data-del-bron]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const t=getTrj(state);if(!t)return;
      t.financien.bronnen.splice(Number(btn.getAttribute("data-del-bron")),1);
      state.rerender();
    });
  });

  // Financiën — bron field changes (live update percentage/bedrag)
  root.querySelectorAll("[data-bron-idx]")?.forEach(input=>{
    input.addEventListener("input",()=>{
      const t=getTrj(state);if(!t)return;
      const idx=Number(input.getAttribute("data-bron-idx"));
      const field=input.getAttribute("data-bron-field");
      const bron=t.financien.bronnen[idx];if(!bron)return;

      if(field==="bron") bron.bron=input.value;
      else if(field==="bedrag"){
        bron.bedrag=parseFloat(input.value)||0;
        const totaal=t.financien.totaal||0;
        bron.percentage=totaal>0?Math.round((bron.bedrag/totaal)*100):0;
        const pctEl=root.querySelector(`[data-bron-idx="${idx}"][data-bron-field="percentage"]`);
        if(pctEl)pctEl.value=bron.percentage;
      } else if(field==="percentage"){
        bron.percentage=parseFloat(input.value)||0;
        const totaal=t.financien.totaal||0;
        bron.bedrag=Math.round(totaal*(bron.percentage/100)*100)/100;
        const bedragEl=root.querySelector(`[data-bron-idx="${idx}"][data-bron-field="bedrag"]`);
        if(bedragEl)bedragEl.value=bron.bedrag;
      }
      updateFinOverzicht(root,t);
    });
  });

  // Save
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";
    try{await saveData("trajecten.json",state.trajecten,"Update trajecten");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

function getTrj(state){ return state.trajecten.find(x=>x.id===state.ui.selectedTrajectId); }

function updateFinOverzicht(root,t){
  const el=root.querySelector("#finOverzicht");if(!el)return;
  const fin=t.financien||{totaal:0,bronnen:[]};
  const totSub=fin.bronnen.reduce((s,b)=>s+(b.bedrag||0),0);
  const pctSub=fin.totaal>0?Math.round((totSub/fin.totaal)*100):0;
  const eigen=Math.max(0,fin.totaal-totSub);
  el.innerHTML=`Totaal gesubsidieerd: <strong>€${totSub.toLocaleString("nl-NL")}</strong> (${pctSub}%) · Eigen bijdrage: <strong>€${eigen.toLocaleString("nl-NL")}</strong> (${100-pctSub}%)`;
}

/* ── LIST ──────────────────────────────────── */

function trjGroup(title,items,state,admin){
  if(!items.length)return "";
  return `<div style="margin-bottom:20px;">
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">${esc(title)}</div>
    ${items.map(t=>{const isSel=state.ui.selectedTrajectId===t.id;
      const isRabo=t.programma==="Rabo ClubSupport";
      return `<div class="trj-row ${isSel?"trj-row--active":""}" data-select-trj="${esc(t.id)}">
        <div class="trj-row__main">
          <div class="trj-row__title">${esc(t.verenigingNaam)} <span style="font-weight:400;color:var(--muted);">— ${esc(t.type||"Onbepaald")}</span></div>
          <div class="trj-row__sub">
            ${isRabo?`<span class="pill pill--rabo" style="font-size:10px;margin-right:4px;">Rabo</span>`:""}
            ${t.thema?`<span class="pill pill--thema" style="font-size:10px;margin-right:4px;">${esc(t.thema)}</span>`:""}
            ${t.coach?esc(t.coach):""}
            ${t.financien?.totaal?` · €${t.financien.totaal.toLocaleString("nl-NL")}`:""}
          </div>
        </div>
        <div class="row" style="gap:6px;flex-shrink:0;">
          ${t.startDatum?`<span class="pill" style="font-size:10px;">Sinds ${formatDate(t.startDatum)}</span>`:""}
          ${t.log?.length?`<span class="pill" style="font-size:10px;">${t.log.length} log</span>`:""}
          <span class="pill pill--status pill--${t.status==="Lopend"||t.status==="Intake"?"active":t.status==="Afgerond"?"done":"warning"}">${esc(t.status)}</span>
          ${admin?`<button class="btn--icon-del" data-del-trj="${esc(t.id)}" title="Verwijder">×</button>`:""}
        </div>
      </div>`;}).join("")}
  </div>`;
}

/* ── DETAIL ────────────────────────────────── */

function trjDetail(state){
  const t=getTrj(state); if(!t)return ""; const admin=state.isAdmin; const log=t.log||[];
  const types=state.settings?.trajectTypes||[];
  const themas=state.settings?.themas||[];
  const bronOpties=state.settings?.subsidiebronnen||["Rabo ClubSupport","Gemeente","Provincie","Sportfonds","Eigen middelen","Anders"];
  const fin=t.financien||{totaal:0,bronnen:[]};
  const totSub=fin.bronnen.reduce((s,b)=>s+(b.bedrag||0),0);
  const pctSub=fin.totaal>0?Math.round((totSub/fin.totaal)*100):0;
  const eigen=Math.max(0,fin.totaal-totSub);

  return `
    <div class="panel__header">
      <div><div class="panel__title">${esc(t.verenigingNaam)}
        ${t.programma==="Rabo ClubSupport"?`<span class="pill pill--rabo" style="font-size:10px;vertical-align:middle;margin-left:6px;">Rabo ClubSupport</span>`:""}
      </div>
        <div class="muted" style="font-size:12px;">${esc(t.type||"")}${t.thema?" · "+esc(t.thema):""} · ${esc(t.status)}</div></div>
      <button class="btn btn--ghost" id="btnCloseDetail">Sluiten</button>
    </div>
    <div class="panel__body">
      <div class="split">
        <div>
          <div class="kv" style="margin-bottom:14px;">
            <div class="kv__k">Type</div><div class="kv__v">${admin?sel("detailType",types,t.type,"Kies type"):esc(t.type||"—")}</div>
            <div class="kv__k">Thema</div><div class="kv__v">${admin?sel("detailThema",themas,t.thema,"Kies thema"):esc(t.thema||"—")}</div>
            <div class="kv__k">Programma</div><div class="kv__v">${admin?sel("detailProgramma",getProgrammaOpties(state),t.programma||"Overig"):esc(t.programma||"Overig")}</div>
            <div class="kv__k">Status</div><div class="kv__v">${admin?sel("detailStatus",STATUS_OPTIONS,t.status):esc(t.status||"—")}</div>
            <div class="kv__k">Start</div><div class="kv__v">${formatDate(t.startDatum)}</div>
            <div class="kv__k">Verwacht einde</div><div class="kv__v">${admin?`<input class="input" id="detailEinde" type="date" value="${esc(t.verwachtEinde||"")}" style="flex:unset;width:160px;"/>`:formatDate(t.verwachtEinde)}</div>
            <div class="kv__k">Coach</div><div class="kv__v">${admin?`<input class="input" id="detailCoach" value="${esc(t.coach||"")}" placeholder="Naam" style="flex:unset;width:200px;"/>`:esc(t.coach||"—")}</div>
          </div>
          <div class="label">Omschrijving</div>
          ${admin?`<textarea class="textarea" id="detailOmschrijving" placeholder="Wat houdt het traject in?">${esc(t.omschrijving||"")}</textarea>`
            :`<div class="readblock">${esc(t.omschrijving||"Geen omschrijving.")}</div>`}

          <!-- FINANCIËN -->
          <div class="subpanel" style="margin-top:14px;">
            <div class="subpanel__header"><strong>Financiën</strong>
              ${admin?`<button class="btn btn--ghost" id="btnAddBron" style="font-size:12px;padding:5px 10px;">+ Financieringsbron</button>`:""}</div>

            ${admin?`<div class="row" style="margin-bottom:10px;">
              <div class="label" style="margin:0;line-height:36px;">Totaalbedrag €</div>
              <input class="input" id="finTotaal" type="number" min="0" step="100" value="${fin.totaal||0}" style="flex:0 0 150px;"/>
            </div>`:`<div class="kv" style="margin-bottom:10px;"><div class="kv__k">Totaalbedrag</div><div class="kv__v">€${(fin.totaal||0).toLocaleString("nl-NL")}</div></div>`}

            ${fin.bronnen.length?`
              <table class="table" style="margin-bottom:10px;">
                <thead><tr><th>Bron</th><th style="width:18%;">Bedrag €</th><th style="width:14%;">%</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead>
                <tbody>${fin.bronnen.map((b,i)=>`<tr>
                  <td>${admin?`<select class="input" data-bron-idx="${i}" data-bron-field="bron" style="min-width:100px;">
                    <option value="">Kies bron</option>${bronOpties.map(o=>`<option ${o===b.bron?"selected":""}>${esc(o)}</option>`).join("")}
                    </select>`:`${esc(b.bron||"—")}`}</td>
                  <td>${admin?`<input class="input" type="number" min="0" step="50" value="${b.bedrag||0}" data-bron-idx="${i}" data-bron-field="bedrag" style="min-width:80px;"/>`:`€${(b.bedrag||0).toLocaleString("nl-NL")}`}</td>
                  <td>${admin?`<input class="input" type="number" min="0" max="100" value="${b.percentage||0}" data-bron-idx="${i}" data-bron-field="percentage" style="min-width:60px;"/>%`:`${b.percentage||0}%`}</td>
                  ${admin?`<td><button class="btn--icon-del" data-del-bron="${i}">×</button></td>`:""}
                </tr>`).join("")}</tbody>
              </table>
            `:""}

            <div id="finOverzicht" style="font-size:12px;color:var(--text2);padding:8px 0;border-top:1px solid var(--border);">
              Totaal gesubsidieerd: <strong>€${totSub.toLocaleString("nl-NL")}</strong> (${pctSub}%) · Eigen bijdrage: <strong>€${eigen.toLocaleString("nl-NL")}</strong> (${fin.totaal>0?100-pctSub:0}%)
            </div>
          </div>
        </div>

        <div>
          <!-- LOGBOEK -->
          <div class="subpanel"><div class="subpanel__header"><strong>Logboek</strong> <span class="muted">(${log.length})</span></div>
            ${admin?`<div class="row" style="margin-bottom:10px;"><input class="input" id="logDatum" type="date" value="${new Date().toISOString().slice(0,10)}" style="flex:0 0 150px;"/>
              <input class="input" id="logTekst" placeholder="Wat is er gebeurd?"/><button class="btn" id="btnAddLog" style="font-size:12px;padding:6px 12px;">+ Log</button></div>`:""}
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

/* ── ADD FORM ──────────────────────────────── */

function addForm(state){
  const clubs=state.verenigingen||[];
  const types=state.settings?.trajectTypes||[];
  const themas=state.settings?.themas||[];
  const progOpties=getProgrammaOpties(state);
  const bronOpties=state.settings?.subsidiebronnen||["Rabo ClubSupport","Gemeente","Provincie","Eigen middelen","Anders"];
  return `<div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
    <div class="panel__header"><div class="panel__title">Nieuw traject</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelTraject">Annuleren</button><button class="btn btn--save" id="btnCreateTraject">Aanmaken</button></div></div>
    <div class="panel__body">
      <div class="row"><input class="input" id="tVereniging" placeholder="Verenigingsnaam *" list="clubList" autofocus/>
        <datalist id="clubList">${clubs.map(v=>`<option value="${esc(v.naam)}">`).join("")}</datalist>
        ${selId("tType",types,"","Type ondersteuning")}
        ${selId("tThema",themas,"","Thema")}
        ${selId("tProgramma",progOpties,"Overig","Programma")}
        ${selId("tStatus",STATUS_OPTIONS,"Intake","Status")}</div>
      <div class="row" style="margin-top:8px;"><input class="input" id="tStart" type="date" title="Start"/><input class="input" id="tEinde" type="date" title="Einde"/><input class="input" id="tCoach" placeholder="Coach"/></div>
      <textarea class="textarea" id="tOmschrijving" placeholder="Omschrijving" style="margin-top:8px;min-height:60px;"></textarea>

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div class="label">Financiën</div>
        <div class="row" style="margin-bottom:8px;">
          <div style="font-size:13px;min-width:100px;">Totaalbedrag €</div>
          <input class="input" id="tFinTotaal" type="number" min="0" step="100" value="0" style="flex:0 0 150px;"/>
        </div>
        <div class="row">
          <div style="font-size:13px;min-width:100px;">Subsidie 1</div>
          <select class="input" id="tFinBron1" style="flex:0 0 180px;"><option value="">Geen</option>${bronOpties.map(o=>`<option>${esc(o)}</option>`).join("")}</select>
          <input class="input" id="tFinBedrag1" type="number" min="0" step="50" placeholder="Bedrag €" style="flex:0 0 120px;"/>
        </div>
        <div class="row" style="margin-top:6px;">
          <div style="font-size:13px;min-width:100px;">Subsidie 2</div>
          <select class="input" id="tFinBron2" style="flex:0 0 180px;"><option value="">Geen</option>${bronOpties.map(o=>`<option>${esc(o)}</option>`).join("")}</select>
          <input class="input" id="tFinBedrag2" type="number" min="0" step="50" placeholder="Bedrag €" style="flex:0 0 120px;"/>
        </div>
        <div class="muted" style="font-size:11px;margin-top:6px;">Meer bronnen kun je toevoegen in het detail-panel na aanmaken.</div>
      </div>
    </div></div>`;
}

/* ── HELPERS ───────────────────────────────── */

function sel(id,opts,cur,ph){
  return `<select class="input" id="${id}" style="flex:unset;width:220px;">
    ${ph?`<option value="" ${!cur?"selected":""}>${esc(ph)}</option>`:""}
    ${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
}
function selId(id,opts,cur,ph){
  return `<select class="input" id="${id}"><option value="" disabled ${!cur?"selected":""}>${esc(ph)}</option>${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
}

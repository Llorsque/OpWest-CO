import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

const BIJ_TYPES=["Bijeenkomst","Cursus","Workshop","Training","Netwerkdag","Anders"];

export function meta(){ return { title:"Bijeenkomsten & Cursussen", meta:"Events aanmaken en clubs koppelen" }; }

export function render(state){
  const list=(state.bijeenkomsten||[]).slice().sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const admin=state.isAdmin;
  const sel=state.ui.selectedBijeenkomstId;

  return `
    ${admin?`<div class="toolbar">
      <button class="btn" id="btnAddBij">+ Nieuwe bijeenkomst</button>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAddBijeenkomst?addForm(state):""}

    <div class="panel">
      <div class="panel__header">
        <div class="panel__title">Bijeenkomsten & Cursussen <span class="muted" style="font-weight:400;">(${list.length})</span></div>
      </div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table">
          <thead><tr><th style="width:12%;">Datum</th><th style="width:25%;">Titel</th><th style="width:12%;">Type</th><th style="width:10%;">Clubs</th><th>Locatie</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead>
          <tbody>${list.map(b=>{
            const isSel=sel===b.id;
            const deelnemers=b.deelnemers||[];
            return `<tr data-select-bij="${esc(b.id)}" style="cursor:pointer;${isSel?"background:var(--accent-light);":""}">
              <td>${formatDate(b.datum)}</td>
              <td><strong>${esc(b.titel)}</strong></td>
              <td><span class="pill">${esc(b.type||"")}</span></td>
              <td><span class="pill pill--active">${deelnemers.length}</span></td>
              <td style="font-size:12px;">${esc(b.locatie||"")}</td>
              ${admin?`<td><button class="btn--icon-del" data-del-bij="${esc(b.id)}">×</button></td>`:""}
            </tr>`;
          }).join("")}</tbody>
        </table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen bijeenkomsten.</div>`}
      </div>
    </div>

    ${sel&&!state.ui.showAddBijeenkomst?bijDetail(state):""}
  `;
}

export function bind(state,root){
  root.querySelector("#btnAddBij")?.addEventListener("click",()=>{state.ui.showAddBijeenkomst=true;state.ui.selectedBijeenkomstId=null;state.rerender();});
  root.querySelector("#btnCancelBij")?.addEventListener("click",()=>{state.ui.showAddBijeenkomst=false;state.rerender();});

  root.querySelector("#btnCreateBij")?.addEventListener("click",()=>{
    const titel=root.querySelector("#bijTitel")?.value?.trim();
    if(!titel){toast("Titel verplicht.");return;}
    state.bijeenkomsten.unshift({
      id:uid("bij"),titel,
      type:root.querySelector("#bijType")?.value||"Bijeenkomst",
      datum:root.querySelector("#bijDatum")?.value||"",
      locatie:root.querySelector("#bijLocatie")?.value?.trim()||"",
      notitie:root.querySelector("#bijNotitie")?.value?.trim()||"",
      deelnemers:[]
    });
    state.ui.showAddBijeenkomst=false;state.ui.selectedBijeenkomstId=state.bijeenkomsten[0].id;
    toast("Bijeenkomst aangemaakt. Voeg nu deelnemende clubs toe.");state.rerender();
  });

  // Select
  root.querySelectorAll("[data-select-bij]")?.forEach(el=>{
    el.addEventListener("click",()=>{state.ui.selectedBijeenkomstId=el.getAttribute("data-select-bij");state.ui.showAddBijeenkomst=false;state.rerender();});
  });

  // Delete bijeenkomst
  root.querySelectorAll("[data-del-bij]")?.forEach(btn=>{
    btn.addEventListener("click",(e)=>{e.stopPropagation();const id=btn.getAttribute("data-del-bij");
      if(!confirm("Bijeenkomst verwijderen?"))return;
      state.bijeenkomsten=state.bijeenkomsten.filter(x=>x.id!==id);
      if(state.ui.selectedBijeenkomstId===id)state.ui.selectedBijeenkomstId=null;
      toast("Verwijderd.");state.rerender();});
  });

  // Close detail
  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedBijeenkomstId=null;state.rerender();});

  // Add deelnemer
  root.querySelector("#btnAddDeelnemer")?.addEventListener("click",()=>{
    const bij=state.bijeenkomsten.find(x=>x.id===state.ui.selectedBijeenkomstId);if(!bij)return;
    const naam=root.querySelector("#dlVereniging")?.value?.trim();
    if(!naam){toast("Selecteer een vereniging.");return;}
    const match=state.verenigingen.find(v=>v.naam.toLowerCase()===naam.toLowerCase());
    const aantal=parseInt(root.querySelector("#dlAantal")?.value)||1;
    bij.deelnemers=bij.deelnemers||[];
    // Check duplicate
    if(bij.deelnemers.find(d=>d.verenigingNaam?.toLowerCase()===naam.toLowerCase())){
      toast("Deze club staat al in de lijst.");return;
    }
    bij.deelnemers.push({verenigingId:match?.id||"",verenigingNaam:match?.naam||naam,aantalPersonen:aantal});
    toast(`${naam} toegevoegd.`);state.rerender();
  });

  // Remove deelnemer
  root.querySelectorAll("[data-del-deelnemer]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const bij=state.bijeenkomsten.find(x=>x.id===state.ui.selectedBijeenkomstId);if(!bij)return;
      const idx=Number(btn.getAttribute("data-del-deelnemer"));
      bij.deelnemers.splice(idx,1);state.rerender();
    });
  });

  // Save
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";
    try{await saveData("bijeenkomsten.json",state.bijeenkomsten,"Update bijeenkomsten");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

function addForm(state){
  return `<div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
    <div class="panel__header"><div class="panel__title">Nieuwe bijeenkomst / cursus</div>
      <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelBij">Annuleren</button><button class="btn btn--save" id="btnCreateBij">Aanmaken</button></div></div>
    <div class="panel__body">
      <div class="row">
        <input class="input" id="bijTitel" placeholder="Titel *" autofocus/>
        <select class="input" id="bijType" style="flex:0 0 150px;">${BIJ_TYPES.map(t=>`<option>${esc(t)}</option>`).join("")}</select>
        <input class="input" id="bijDatum" type="date" style="flex:0 0 160px;"/>
        <input class="input" id="bijLocatie" placeholder="Locatie"/>
      </div>
      <textarea class="textarea" id="bijNotitie" placeholder="Omschrijving / notitie" style="margin-top:8px;min-height:50px;"></textarea>
    </div></div>`;
}

function bijDetail(state){
  const b=state.bijeenkomsten.find(x=>x.id===state.ui.selectedBijeenkomstId);if(!b)return "";
  const admin=state.isAdmin;
  const deelnemers=b.deelnemers||[];
  const totaalPersonen=deelnemers.reduce((s,d)=>s+(d.aantalPersonen||0),0);
  const clubs=state.verenigingen||[];

  return `<div class="panel" style="margin-top:16px;">
    <div class="panel__header">
      <div><div class="panel__title">${esc(b.titel)}</div>
        <div class="muted" style="font-size:12px;">${esc(b.type||"")} · ${formatDate(b.datum)}${b.locatie?" · "+esc(b.locatie):""}</div></div>
      <button class="btn btn--ghost" id="btnCloseDetail">Sluiten</button>
    </div>
    <div class="panel__body">
      ${b.notitie?`<div style="font-size:13px;margin-bottom:14px;color:var(--text2);">${esc(b.notitie)}</div>`:""}

      <div class="subpanel">
        <div class="subpanel__header">
          <strong>Deelnemende clubs</strong>
          <span class="muted">${deelnemers.length} clubs · ${totaalPersonen} personen</span>
        </div>

        ${admin?`<div class="row" style="margin-bottom:10px;">
          <input class="input" id="dlVereniging" placeholder="Vereniging zoeken…" list="dlClubList"/>
          <datalist id="dlClubList">${clubs.map(v=>`<option value="${esc(v.naam)}">`).join("")}</datalist>
          <input class="input" id="dlAantal" type="number" min="1" value="1" placeholder="Aantal" style="flex:0 0 100px;"/>
          <button class="btn" id="btnAddDeelnemer" style="font-size:12px;padding:6px 12px;">+ Toevoegen</button>
        </div>`:""}

        ${deelnemers.length?`<table class="table">
          <thead><tr><th>Vereniging</th><th style="width:15%;">Aantal personen</th>${admin?`<th style="width:4%;"></th>`:""}</tr></thead>
          <tbody>${deelnemers.map((d,i)=>`<tr>
            <td><strong>${esc(d.verenigingNaam)}</strong></td>
            <td>${d.aantalPersonen||0}</td>
            ${admin?`<td><button class="btn--icon-del" data-del-deelnemer="${i}">×</button></td>`:""}
          </tr>`).join("")}</tbody>
        </table>`:`<div class="muted" style="font-size:13px;">Nog geen clubs gekoppeld. ${admin?"Zoek en voeg clubs toe hierboven.":""}</div>`}
      </div>
    </div>
  </div>`;
}

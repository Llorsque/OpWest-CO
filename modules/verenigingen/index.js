import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
import { downloadTemplate, parseCSV } from "../../shared/csv.js";
import { fetchAirtableRecords, mergeAirtableRecords, getAirtableToken } from "../../shared/airtable.js";

export function meta(){ return { title:"Verenigingen", meta:"Clubs, dossiers en overzichten" }; }

// Normalize text for fuzzy search: strip dots, dashes, extra spaces, lowercase
function norm(str){ return (str||"").toLowerCase().replace(/[.\-_'"/\\]/g,"").replace(/\s+/g," ").trim(); }

export function render(state){
  const q=state.ui.q||""; const admin=state.isAdmin;
  const fSport=state.ui.fSport||""; const fPlaats=state.ui.fPlaats||""; const fGemeente=state.ui.fGemeente||"";
  const sortCol=state.ui.sortCol||"naam"; const sortDir=state.ui.sortDir||"asc";
  let list=filter(state.verenigingen,q,fSport,fPlaats,fGemeente);
  list=sortList(list,sortCol,sortDir,state);
  const total=state.verenigingen.length;
  const actief=state.verenigingen.filter(v=>v.actief!==false).length;

  // Collect unique values for filters
  const sporten=[...new Set(state.verenigingen.map(v=>v.sport).filter(Boolean))].sort();
  const plaatsen=[...new Set(state.verenigingen.map(v=>v.plaats).filter(Boolean))].sort();
  const gemeenten=[...new Set(state.verenigingen.map(v=>v.gemeente).filter(Boolean))].sort();

  return `
    ${admin?`<div class="toolbar">
      <div class="row" style="gap:8px;flex:1;">
        <button class="btn" id="btnAddClub">+ Nieuwe club</button>
        <button class="btn btn--ghost" id="btnDownloadCSV">📥 Sjabloon</button>
        <label class="btn btn--ghost filelabel">📤 CSV<input type="file" id="fileCSV" accept=".csv" hidden/></label>
        ${getAirtableToken()&&state.settings?.airtable?.baseId?`<button class="btn btn--ghost" id="btnSyncAirtable">🔄 Sync Airtable</button>`:""}
      </div>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAdd?`
    <div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
      <div class="panel__header"><div class="panel__title">Nieuwe club</div>
        <button class="btn btn--ghost" id="btnCancelAdd">Annuleren</button></div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="newNaam" placeholder="Naam *" autofocus/>
          <input class="input" id="newSport" placeholder="Sport"/>
          <input class="input" id="newPlaats" placeholder="Plaats"/>
          <input class="input" id="newGemeente" placeholder="Gemeente"/>
          <input class="input" id="newContact" placeholder="Contactpersoon"/>
          <select class="input" id="newActief" style="flex:0 0 100px;"><option value="true">Actief</option><option value="false">Inactief</option></select>
          <button class="btn btn--save" id="btnCreateClub">Toevoegen</button>
        </div>
      </div>
    </div>`:""}

    <div class="panel">
      <div class="panel__header" style="flex-wrap:wrap;gap:8px;">
        <div class="panel__title">Clubs <span class="muted" style="font-weight:400;">(${list.length}${list.length!==total?" van "+total:""} · ${actief} actief)</span></div>
        <div class="row" style="gap:6px;">
          <input class="input" id="clubSearch" placeholder="Zoeken…" value="${esc(q)}" style="max-width:180px;flex:unset;"/>
          <select class="input filter-select" id="fSport"><option value="">Alle sporten</option>${sporten.map(s=>`<option ${s===fSport?"selected":""}>${esc(s)}</option>`).join("")}</select>
          <select class="input filter-select" id="fPlaats"><option value="">Alle plaatsen</option>${plaatsen.map(p=>`<option ${p===fPlaats?"selected":""}>${esc(p)}</option>`).join("")}</select>
          <select class="input filter-select" id="fGemeente"><option value="">Alle gemeenten</option>${gemeenten.map(g=>`<option ${g===fGemeente?"selected":""}>${esc(g)}</option>`).join("")}</select>
          ${(fSport||fPlaats||fGemeente)?`<button class="btn btn--ghost" id="btnClearFilters" style="font-size:11px;padding:6px 8px;">✕ Reset</button>`:""}
        </div>
      </div>
      <div class="panel__body" style="padding:0;">
        <table class="table">
          <thead><tr>
            ${sortTh("naam","Naam",sortCol,sortDir,"20%")}
            ${sortTh("sport","Sport",sortCol,sortDir,"9%")}
            ${sortTh("plaats","Plaats",sortCol,sortDir,"9%")}
            ${sortTh("gemeente","Gemeente",sortCol,sortDir,"9%")}
            ${sortTh("contact","Contact",sortCol,sortDir)}
            ${sortTh("swg","SWG",sortCol,sortDir,"5%")}
            ${sortTh("actief","Actief",sortCol,sortDir,"5%")}
            ${sortTh("cnt","Cnt",sortCol,sortDir,"5%")}
            ${admin?`<th style="width:4%;"></th>`:""}
          </tr></thead>
          <tbody>${list.map(v=>tableRow(v,state)).join("")}</tbody>
        </table>
        ${!list.length?`<div class="muted" style="padding:20px;text-align:center;">Geen clubs gevonden.</div>`:""}
      </div>
    </div>

    ${state.ui.selectedId?`<div class="modal-overlay" id="modalOverlay">
      <div class="modal">${dossier(state)}</div>
    </div>`:""}
  `;
}

export function bind(state,root){
  // SEARCH — preserve cursor position
  const search=root.querySelector("#clubSearch");
  if(search){
    search.addEventListener("input",e=>{
      state.ui.q=e.target.value;
      const pos=e.target.selectionStart;
      state.rerender();
      // Restore focus and cursor after DOM rebuild
      requestAnimationFrame(()=>{
        const el=document.querySelector("#clubSearch");
        if(el){el.focus();el.setSelectionRange(pos,pos);}
      });
    });
    // If we have a query, keep focus (e.g. after filter change triggered rerender)
    if(state.ui.q && document.activeElement?.id!=="clubSearch"){
      // Don't steal focus from filters
    }
  }

  // COLUMN FILTERS
  ["fSport","fPlaats","fGemeente"].forEach(id=>{
    root.querySelector("#"+id)?.addEventListener("change",e=>{
      state.ui[id]=e.target.value;state.rerender();
    });
  });
  root.querySelector("#btnClearFilters")?.addEventListener("click",()=>{
    state.ui.fSport="";state.ui.fPlaats="";state.ui.fGemeente="";state.rerender();
  });

  // COLUMN SORTING
  root.querySelectorAll("[data-sort]")?.forEach(th=>{
    th.addEventListener("click",()=>{
      const col=th.getAttribute("data-sort");
      if(state.ui.sortCol===col) state.ui.sortDir=state.ui.sortDir==="asc"?"desc":"asc";
      else { state.ui.sortCol=col; state.ui.sortDir="asc"; }
      state.rerender();
    });
  });

  root.querySelectorAll("[data-select-id]")?.forEach(tr=>{tr.addEventListener("click",()=>{
    state.ui.selectedId=tr.getAttribute("data-select-id");state.ui.showAdd=false;state.rerender();
  });});

  // Close modal on overlay click
  root.querySelector("#modalOverlay")?.addEventListener("click",(e)=>{
    if(e.target.id==="modalOverlay"){state.ui.selectedId=null;state.rerender();}
  });
  // Close on Escape
  const escHandler=(e)=>{if(e.key==="Escape"&&state.ui.selectedId){state.ui.selectedId=null;state.rerender();}};
  document.addEventListener("keydown",escHandler);
  // Cleanup on next render (bind is called each render)
  root._escCleanup?.(); root._escCleanup=()=>document.removeEventListener("keydown",escHandler);

  root.querySelector("#btnDownloadCSV")?.addEventListener("click",()=>downloadTemplate());
  root.querySelector("#fileCSV")?.addEventListener("change",async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const result=parseCSV(await file.text());
    if(!result.ok){toast("CSV fout: "+result.error);return;}
    const existing=new Set(state.verenigingen.map(v=>v.naam.toLowerCase()));
    let added=0;for(const c of result.clubs){if(!existing.has(c.naam.toLowerCase())){state.verenigingen.push(c);existing.add(c.naam.toLowerCase());added++;}}
    toast(`${added} clubs toegevoegd.`);e.target.value="";state.rerender();
  });

  // Airtable sync
  root.querySelector("#btnSyncAirtable")?.addEventListener("click",async()=>{
    if(!confirm("Airtable sync vervangt de clublijst met de actuele data uit Airtable.\n\nJe handmatige gegevens (SWG, actief, contacten, notities, acties) blijven behouden voor bestaande clubs.\n\nClubs die niet meer in Airtable staan worden verwijderd.\n\nDoorgaan?")) return;
    const btn=root.querySelector("#btnSyncAirtable");
    btn.disabled=true; btn.textContent="Synchroniseren...";
    const at=state.settings?.airtable||{};
    const fields=Object.values(at.fieldMap||{}).filter(Boolean);
    const result=await fetchAirtableRecords({baseId:at.baseId,table:at.table,filterFormula:at.filterFormula,fields});
    if(!result.ok){
      toast("✗ Airtable fout: "+result.error);
      btn.disabled=false; btn.textContent="🔄 Sync Airtable"; return;
    }
    const stats=mergeAirtableRecords(result.records,state.verenigingen,at.fieldMap||{});
    state.verenigingen=stats.newList;
    toast(`✓ Sync: ${stats.added} nieuw, ${stats.updated} bijgewerkt, ${stats.removed} verwijderd. Klik Opslaan naar GitHub.`);
    btn.disabled=false; btn.textContent="🔄 Sync Airtable";
    state.rerender();
  });

  root.querySelector("#btnAddClub")?.addEventListener("click",()=>{state.ui.showAdd=true;state.ui.selectedId=null;state.rerender();});
  root.querySelector("#btnCancelAdd")?.addEventListener("click",()=>{state.ui.showAdd=false;state.rerender();});
  root.querySelector("#btnCreateClub")?.addEventListener("click",()=>{
    const naam=root.querySelector("#newNaam")?.value?.trim();if(!naam){toast("Naam verplicht.");return;}
    const contact=root.querySelector("#newContact")?.value?.trim();
    state.verenigingen.unshift({id:uid("club"),naam,sport:root.querySelector("#newSport")?.value?.trim()||"",
      plaats:root.querySelector("#newPlaats")?.value?.trim()||"",gemeente:root.querySelector("#newGemeente")?.value?.trim()||"",
      contacten:contact?[{rol:"Contact",naam:contact,email:"",telefoon:""}]:[],
      actief:root.querySelector("#newActief")?.value!=="false",swg:false,afdelingen:"",notitie:""});
    state.ui.showAdd=false;state.ui.selectedId=state.verenigingen[0].id;toast("Club toegevoegd.");state.rerender();
  });

  root.querySelectorAll("[data-toggle-actief]")?.forEach(btn=>{btn.addEventListener("click",e=>{e.stopPropagation();const v=state.verenigingen.find(x=>x.id===btn.getAttribute("data-toggle-actief"));if(v)v.actief=v.actief===false?true:false;state.rerender();});});
  root.querySelectorAll("[data-toggle-swg]")?.forEach(btn=>{btn.addEventListener("click",e=>{e.stopPropagation();const v=state.verenigingen.find(x=>x.id===btn.getAttribute("data-toggle-swg"));if(v)v.swg=!v.swg;state.rerender();});});
  root.querySelectorAll("[data-del-club]")?.forEach(btn=>{btn.addEventListener("click",e=>{e.stopPropagation();const id=btn.getAttribute("data-del-club");const v=state.verenigingen.find(x=>x.id===id);if(!v||!confirm(`'${v.naam}' verwijderen?`))return;state.verenigingen=state.verenigingen.filter(x=>x.id!==id);state.acties=(state.acties||[]).filter(a=>a.verenigingId!==id);if(state.ui.selectedId===id)state.ui.selectedId=null;toast("Verwijderd.");state.rerender();});});

  bindDossier(state,root);

  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig…";
    try{await saveData("verenigingen.json",state.verenigingen,"Update verenigingen");
      await saveData("acties.json",state.acties||[],"Update acties");
      toast("✓ Opgeslagen!");
    }catch(e){toast("✗ "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

function bindDossier(state,root){
  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedId=null;state.rerender();});
  root.querySelector("#btnSaveFields")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;
    v.sport=root.querySelector("#editSport")?.value?.trim()||"";
    v.plaats=root.querySelector("#editPlaats")?.value?.trim()||"";
    v.gemeente=root.querySelector("#editGemeente")?.value?.trim()||"";
    v.actief=root.querySelector("#editActief")?.value!=="false";
    v.swg=root.querySelector("#editSwg")?.checked||false;
    v.afdelingen=root.querySelector("#editAfdelingen")?.value?.trim()||"";
    toast("Gegevens bijgewerkt.");state.rerender();
  });
  root.querySelector("#btnSaveContacts")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;
    v.contacten=Array.from(root.querySelectorAll("[data-contact-row]")).map(r=>({
      rol:r.querySelector("[data-f='rol']")?.value?.trim()||"",naam:r.querySelector("[data-f='naam']")?.value?.trim()||"",
      email:r.querySelector("[data-f='email']")?.value?.trim()||"",telefoon:r.querySelector("[data-f='telefoon']")?.value?.trim()||""
    })).filter(c=>c.rol||c.naam||c.email||c.telefoon);
    toast("Contacten bijgewerkt.");state.rerender();
  });
  root.querySelector("#btnAddContact")?.addEventListener("click",()=>{const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;v.contacten=v.contacten||[];v.contacten.push({rol:"",naam:"",email:"",telefoon:""});state.rerender();});
  root.querySelectorAll("[data-remove-contact]")?.forEach(btn=>{btn.addEventListener("click",e=>{e.stopPropagation();const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;v.contacten.splice(Number(btn.getAttribute("data-remove-contact")),1);state.rerender();});});
  root.querySelector("#btnSaveNote")?.addEventListener("click",()=>{const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;v.notitie=(root.querySelector("#noteText")?.value||"").trim();toast("Notitie bijgewerkt.");state.rerender();});
  root.querySelector("#btnAddNotitie")?.addEventListener("click",()=>{const tekst=root.querySelector("#notitieTekst")?.value?.trim();if(!tekst){toast("Vul een notitie in.");return;}(state.acties=state.acties||[]).unshift({id:uid("note"),verenigingId:state.ui.selectedId,type:"notitie",datum:new Date().toISOString().slice(0,10),tekst});toast("Toegevoegd.");state.rerender();});
  root.querySelector("#btnAddActie")?.addEventListener("click",()=>{const titel=root.querySelector("#actieTitel")?.value?.trim();if(!titel){toast("Titel verplicht.");return;}(state.acties=state.acties||[]).unshift({id:uid("act"),verenigingId:state.ui.selectedId,type:"actie",titel,status:root.querySelector("#actieStatus")?.value||"Open",deadline:root.querySelector("#actieDeadline")?.value||"",verantwoordelijke:root.querySelector("#actieWie")?.value?.trim()||"",notitie:root.querySelector("#actieNotitie")?.value?.trim()||"",datum:new Date().toISOString().slice(0,10)});toast("Actie toegevoegd.");state.rerender();});
  root.querySelectorAll("[data-toggle-actie]")?.forEach(btn=>{btn.addEventListener("click",()=>{const a=(state.acties||[]).find(x=>x.id===btn.getAttribute("data-toggle-actie"));if(!a)return;const o=["Open","Lopend","Afgerond"];a.status=o[(o.indexOf(a.status)+1)%o.length];state.rerender();});});
  root.querySelectorAll("[data-del-actie]")?.forEach(btn=>{btn.addEventListener("click",()=>{state.acties=(state.acties||[]).filter(x=>x.id!==btn.getAttribute("data-del-actie"));state.rerender();});});
}

/* ── TABLE ROW ─────────────────────────────── */

function tableRow(v,state){
  const first=v.contacten?.[0]; const admin=state.isAdmin;
  const bzk=(state.bezoeken||[]).filter(b=>b.verenigingId===v.id).length;
  const isActief=v.actief!==false; const isSel=state.ui.selectedId===v.id;
  return `<tr data-select-id="${esc(v.id)}" style="cursor:pointer;${isSel?"background:var(--accent-light);":""}${!isActief?"opacity:0.5;":""}">
    <td><strong>${esc(v.naam)}</strong>${v.afdelingen?`<div class="muted" style="font-size:11px;">${esc(v.afdelingen)}</div>`:""}</td>
    <td>${esc(v.sport||"")}</td><td>${esc(v.plaats||"")}</td><td>${esc(v.gemeente||"")}</td>
    <td style="font-size:12px;">${first?.naam||first?.rol||"—"}</td>
    <td>${admin?`<button class="pill pill--status ${v.swg?"pill--active":"pill--paused"}" data-toggle-swg="${esc(v.id)}" style="cursor:pointer;">${v.swg?"Ja":"Nee"}</button>`:`<span class="pill pill--status ${v.swg?"pill--active":"pill--paused"}">${v.swg?"Ja":"Nee"}</span>`}</td>
    <td>${admin?`<button class="pill pill--status ${isActief?"pill--active":"pill--paused"}" data-toggle-actief="${esc(v.id)}" style="cursor:pointer;">${isActief?"Ja":"Nee"}</button>`:`<span class="pill pill--status ${isActief?"pill--active":"pill--paused"}">${isActief?"Ja":"Nee"}</span>`}</td>
    <td>${bzk?`<span class="pill">${bzk}</span>`:""}</td>
    ${admin?`<td><button class="btn--icon-del" data-del-club="${esc(v.id)}">×</button></td>`:""}
  </tr>`;
}

/* ── DOSSIER VIEW ──────────────────────────── */

function dossier(state){
  const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return "";
  const admin=state.isAdmin;
  const contacts=v.contacten||[];
  const clubActies=(state.acties||[]).filter(a=>a.verenigingId===v.id);
  const notities=clubActies.filter(a=>a.type==="notitie");
  const acties=clubActies.filter(a=>a.type==="actie");
  const bezoeken=(state.bezoeken||[]).filter(b=>b.verenigingId===v.id).sort((a,b)=>(b.datum||"").localeCompare(a.datum||""));
  const deelnames=(state.bijeenkomsten||[]).filter(b=>(b.deelnemers||[]).some(d=>d.verenigingId===v.id));
  const trajecten=(state.trajecten||[]).filter(t=>t.verenigingId===v.id);

  return `
    <div class="panel__header">
      <div>
        <div class="panel__title">${esc(v.naam)}
          ${v.swg?`<span class="pill pill--active" style="font-size:10px;vertical-align:middle;margin-left:6px;">SWG</span>`:""}
          ${v.actief===false?`<span class="pill pill--paused" style="font-size:10px;vertical-align:middle;margin-left:6px;">Inactief</span>`:""}
        </div>
        <div class="muted" style="font-size:12px;">${[v.sport,v.plaats,v.gemeente].filter(Boolean).join(" · ")}${v.sportbond?" · "+esc(v.sportbond):""}${v.afdelingen?" · Afd: "+esc(v.afdelingen):""}</div>
      </div>
      <button class="btn btn--ghost" id="btnCloseDetail">Sluiten</button>
    </div>
    <div class="panel__body">
      ${admin?`<div class="subpanel">
        <div class="subpanel__header"><strong>Gegevens</strong><button class="btn" id="btnSaveFields" style="font-size:12px;padding:5px 10px;">Bewaar</button></div>
        <div class="row">
          <input class="input" id="editSport" placeholder="Sport" value="${esc(v.sport||"")}"/>
          <input class="input" id="editPlaats" placeholder="Plaats" value="${esc(v.plaats||"")}"/>
          <input class="input" id="editGemeente" placeholder="Gemeente" value="${esc(v.gemeente||"")}"/>
          <select class="input" id="editActief" style="flex:0 0 110px;"><option value="true" ${v.actief!==false?"selected":""}>Actief</option><option value="false" ${v.actief===false?"selected":""}>Inactief</option></select>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="checkbox" id="editSwg" ${v.swg?"checked":""}/> SWG</label>
        </div>
        <div class="row" style="margin-top:8px;"><input class="input" id="editAfdelingen" placeholder="Afdelingen (bijv. Voetbal, Tennis, Turnen)" value="${esc(v.afdelingen||"")}"/></div>
      </div>`:""}
      <div class="split">
        <div style="display:flex;flex-direction:column;gap:0;">
          <div class="subpanel"><div class="subpanel__header"><strong>Contactpersonen</strong>
            ${admin?`<div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnAddContact" style="font-size:12px;padding:5px 10px;">+ Contact</button><button class="btn" id="btnSaveContacts" style="font-size:12px;padding:5px 10px;">Bewaar</button></div>`:""}</div>
            ${contacts.length?(admin?contacts.map((c,i)=>`<div class="row" data-contact-row="1" style="padding:4px 0;"><input class="input" data-f="rol" placeholder="Rol" value="${esc(c.rol||"")}" style="flex:0 0 100px;"/><input class="input" data-f="naam" placeholder="Naam" value="${esc(c.naam||"")}"/><input class="input" data-f="email" placeholder="E-mail" value="${esc(c.email||"")}"/><input class="input" data-f="telefoon" placeholder="Tel" value="${esc(c.telefoon||"")}" style="flex:0 0 120px;"/><button class="btn--icon-del" data-remove-contact="${i}">×</button></div>`).join("")
              :`<table class="table"><thead><tr><th>Rol</th><th>Naam</th><th>E-mail</th><th>Telefoon</th></tr></thead><tbody>${contacts.map(c=>`<tr><td>${esc(c.rol||"—")}</td><td>${esc(c.naam||"—")}</td><td>${c.email?`<a href="mailto:${esc(c.email)}" style="color:var(--accent);">${esc(c.email)}</a>`:"—"}</td><td>${c.telefoon?`<a href="tel:${esc(c.telefoon)}" style="color:var(--accent);">${esc(c.telefoon)}</a>`:"—"}</td></tr>`).join("")}</tbody></table>`)
              :`<div class="muted" style="font-size:13px;">Geen contacten.</div>`}
          </div>
          <div class="subpanel"><div class="subpanel__header"><strong>Wat speelt er?</strong>${admin?`<button class="btn" id="btnSaveNote" style="font-size:12px;padding:5px 10px;">Bewaar</button>`:""}</div>
            ${admin?`<textarea class="textarea" id="noteText" style="min-height:60px;">${esc(v.notitie||"")}</textarea>`:`<div style="font-size:13px;white-space:pre-wrap;">${esc(v.notitie||"Geen notities.")}</div>`}</div>
          <div class="subpanel"><div class="subpanel__header"><strong>Contactmomenten</strong><span class="muted">(${bezoeken.length})</span></div>
            ${bezoeken.length?bezoeken.slice(0,10).map(b=>`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
              <div style="color:var(--accent);min-width:68px;">${formatDate(b.datum)}</div><span class="pill" style="font-size:10px;">${esc(b.type||"Bezoek")}</span><div style="flex:1;">${esc(b.notitie||"")}</div></div>`).join("")
              :`<div class="muted" style="font-size:13px;">Geen contactmomenten. <a href="#/bezoeken" style="color:var(--accent);">Registreer</a></div>`}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0;">
          <div class="subpanel"><div class="subpanel__header"><strong>Acties</strong><span class="muted">(${acties.filter(a=>a.status!=="Afgerond").length} open)</span></div>
            ${admin?`<div class="actie-form" style="margin-bottom:8px;">
              <div class="row"><input class="input" id="actieTitel" placeholder="Actie *" style="flex:2;"/><select class="input" id="actieStatus" style="flex:0 0 100px;"><option>Open</option><option>Lopend</option><option>Afgerond</option></select></div>
              <div class="row" style="margin-top:6px;"><input class="input" id="actieDeadline" type="date" style="flex:0 0 140px;"/><input class="input" id="actieWie" placeholder="Wie?"/><button class="btn" id="btnAddActie" style="font-size:12px;padding:5px 10px;">+ Actie</button></div>
              <textarea class="textarea" id="actieNotitie" placeholder="Toelichting" style="min-height:35px;margin-top:6px;"></textarea></div>`:""}
            ${acties.length?acties.map(a=>`<div class="actie-item"><div class="actie-item__header"><div style="flex:1;"><div class="actie-item__title">${esc(a.titel)}</div>${a.notitie?`<div class="actie-item__desc">${esc(a.notitie)}</div>`:""}</div>
              <div class="row" style="gap:4px;flex-shrink:0;">${a.deadline?`<span class="pill" style="font-size:10px;">${formatDate(a.deadline)}</span>`:""}<span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}" ${admin?`data-toggle-actie="${esc(a.id)}" style="cursor:pointer;"`:""} title="${admin?"Klik om te wisselen":""}">${esc(a.status)}</span>${admin?`<button class="btn--icon-del" data-del-actie="${esc(a.id)}">×</button>`:""}</div></div></div>`).join("")
              :`<div class="muted" style="font-size:13px;">Geen acties.</div>`}</div>
          <div class="subpanel"><div class="subpanel__header"><strong>Bijeenkomsten</strong><span class="muted">(${deelnames.length})</span></div>
            ${deelnames.length?deelnames.map(b=>{const d=(b.deelnemers||[]).find(x=>x.verenigingId===v.id);
              return `<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;"><div style="color:var(--accent);min-width:68px;">${formatDate(b.datum)}</div><div style="flex:1;"><strong>${esc(b.titel)}</strong> <span class="pill" style="font-size:10px;">${esc(b.type)}</span></div><div>${d?.aantalPersonen||0} pers.</div></div>`;}).join("")
              :`<div class="muted" style="font-size:13px;">Geen deelnames. <a href="#/bijeenkomsten" style="color:var(--accent);">Bijeenkomsten</a></div>`}</div>
          <div class="subpanel"><div class="subpanel__header"><strong>Trajecten</strong><span class="muted">(${trajecten.length})</span></div>
            ${trajecten.length?trajecten.map(t=>`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;align-items:center;"><div style="flex:1;"><strong>${esc(t.type||"Onbepaald")}</strong>${t.thema?" · "+esc(t.thema):""}</div>
              <span class="pill pill--status pill--${t.status==="Lopend"||t.status==="Intake"?"active":t.status==="Afgerond"?"done":"warning"}" style="font-size:10px;">${esc(t.status)}</span></div>`).join("")
              :`<div class="muted" style="font-size:13px;">Geen trajecten. <a href="#/trajecten" style="color:var(--accent);">Trajecten</a></div>`}</div>
          <div class="subpanel"><div class="subpanel__header"><strong>Logboek</strong><span class="muted">(${notities.length})</span></div>
            ${admin?`<div class="row" style="margin-bottom:8px;"><input class="input" id="notitieTekst" placeholder="Snelle notitie…"/><button class="btn" id="btnAddNotitie" style="font-size:12px;padding:5px 10px;">+ Log</button></div>`:""}
            ${notities.length?notities.map(n=>`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;"><div style="color:var(--accent);min-width:68px;">${formatDate(n.datum)}</div><div style="flex:1;">${esc(n.tekst)}</div>
              ${admin?`<button class="btn--icon-del" data-del-actie="${esc(n.id)}">×</button>`:""}</div>`).join("")
              :`<div class="muted" style="font-size:13px;">Geen logboek.</div>`}</div>
        </div>
      </div>
    </div>`;
}

/* ── FILTER — fuzzy + column filters ───────── */

function filter(list,q,fSport,fPlaats,fGemeente){
  let result=list;
  if(fSport) result=result.filter(v=>v.sport===fSport);
  if(fPlaats) result=result.filter(v=>v.plaats===fPlaats);
  if(fGemeente) result=result.filter(v=>v.gemeente===fGemeente);
  if(!q?.trim()) return result;

  const nq=norm(q);
  return result.filter(v=>{
    const c=(v.contacten||[]).map(x=>`${x.rol} ${x.naam} ${x.email} ${x.telefoon}`).join(" ");
    const hay=norm(`${v.naam} ${v.sport} ${v.plaats} ${v.gemeente} ${v.afdelingen||""} ${c} ${v.notitie||""}`);
    return hay.includes(nq);
  });
}

/* ── SORT ──────────────────────────────────── */

function sortList(list,col,dir,state){
  const mod=dir==="asc"?1:-1;
  return [...list].sort((a,b)=>{
    let va,vb;
    switch(col){
      case "naam": va=a.naam||""; vb=b.naam||""; break;
      case "sport": va=a.sport||""; vb=b.sport||""; break;
      case "plaats": va=a.plaats||""; vb=b.plaats||""; break;
      case "gemeente": va=a.gemeente||""; vb=b.gemeente||""; break;
      case "contact": va=a.contacten?.[0]?.naam||a.contacten?.[0]?.rol||""; vb=b.contacten?.[0]?.naam||b.contacten?.[0]?.rol||""; break;
      case "swg": va=a.swg?1:0; vb=b.swg?1:0; return (va-vb)*mod;
      case "actief": va=a.actief!==false?1:0; vb=b.actief!==false?1:0; return (va-vb)*mod;
      case "cnt":
        va=(state.bezoeken||[]).filter(x=>x.verenigingId===a.id).length;
        vb=(state.bezoeken||[]).filter(x=>x.verenigingId===b.id).length;
        return (va-vb)*mod;
      default: va=a.naam||""; vb=b.naam||"";
    }
    return va.toString().localeCompare(vb.toString(),"nl")*mod;
  });
}

function sortTh(col,label,activeCol,activeDir,width){
  const isActive=activeCol===col;
  const arrow=isActive?(activeDir==="asc"?" ↑":" ↓"):"";
  const w=width?`width:${width};`:"";
  return `<th data-sort="${col}" style="${w}cursor:pointer;user-select:none;" class="${isActive?"th--sorted":""}">${esc(label)}${arrow}</th>`;
}

import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
import { downloadTemplate, parseCSV } from "../../shared/csv.js";

export function meta(){ return { title:"Verenigingen", meta:"Clubs, contacten, acties en dossiers" }; }

export function render(state){
  const q=state.ui.q||""; const list=filter(state.verenigingen,q); const admin=state.isAdmin;
  const total=state.verenigingen.length;
  const actief=state.verenigingen.filter(v=>v.actief!==false).length;

  return `
    ${admin?`<div class="toolbar">
      <div class="row" style="gap:8px;flex:1;">
        <button class="btn" id="btnAddClub">+ Nieuwe club</button>
        <button class="btn btn--ghost" id="btnDownloadCSV">📥 Sjabloon</button>
        <label class="btn btn--ghost filelabel">📤 CSV uploaden<input type="file" id="fileCSV" accept=".csv" hidden/></label>
      </div>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    ${state.ui.showAdd?`
    <div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
      <div class="panel__header"><div class="panel__title">Nieuwe club toevoegen</div>
        <button class="btn btn--ghost" id="btnCancelAdd">Annuleren</button></div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="newNaam" placeholder="Naam *" autofocus/>
          <input class="input" id="newSport" placeholder="Sport"/>
          <input class="input" id="newPlaats" placeholder="Plaats"/>
          <input class="input" id="newGemeente" placeholder="Gemeente"/>
          <input class="input" id="newContact" placeholder="Contactpersoon"/>
          <select class="input" id="newActief" style="flex:0 0 100px;"><option value="true" selected>Actief</option><option value="false">Inactief</option></select>
          <button class="btn btn--save" id="btnCreateClub">Toevoegen</button>
        </div>
      </div>
    </div>`:""}

    <div class="panel">
      <div class="panel__header">
        <div class="panel__title">Clubs <span class="muted" style="font-weight:400;">(${actief} actief van ${total})</span></div>
        <input class="input" id="clubSearch" placeholder="Zoeken…" value="${esc(q)}" style="max-width:220px;flex:unset;"/>
      </div>
      <div class="panel__body" style="padding:0;">
        <table class="table">
          <thead><tr>
            <th style="width:22%;">Naam</th><th style="width:10%;">Sport</th><th style="width:10%;">Plaats</th><th style="width:10%;">Gemeente</th>
            <th>Contact</th><th style="width:7%;">Actief</th><th style="width:6%;">Acties</th>
            ${admin?`<th style="width:4%;"></th>`:""}
          </tr></thead>
          <tbody>${list.map(v=>tableRow(v,state)).join("")}</tbody>
        </table>
        ${!list.length?`<div class="muted" style="padding:20px;text-align:center;">Geen clubs gevonden.</div>`:""}
      </div>
    </div>

    ${state.ui.selectedId?`<div class="panel" style="margin-top:16px;">${details(state)}</div>`:""}
  `;
}

export function bind(state,root){
  const search=root.querySelector("#clubSearch");
  if(search) search.addEventListener("input",e=>{state.ui.q=e.target.value;state.rerender();});

  root.querySelectorAll("[data-select-id]")?.forEach(tr=>{tr.addEventListener("click",()=>{state.ui.selectedId=tr.getAttribute("data-select-id");state.ui.showAdd=false;state.rerender();});});

  // CSV
  root.querySelector("#btnDownloadCSV")?.addEventListener("click",()=>downloadTemplate());
  root.querySelector("#fileCSV")?.addEventListener("change",async(e)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const text=await file.text(); const result=parseCSV(text);
    if(!result.ok){toast("CSV fout: "+result.error);return;}
    const existing=new Set(state.verenigingen.map(v=>v.naam.toLowerCase()));
    let added=0;
    for(const club of result.clubs){if(!existing.has(club.naam.toLowerCase())){state.verenigingen.push(club);existing.add(club.naam.toLowerCase());added++;}}
    toast(`${added} clubs toegevoegd, ${result.count-added} overgeslagen.`);
    e.target.value=""; state.rerender();
  });

  // Add club
  root.querySelector("#btnAddClub")?.addEventListener("click",()=>{state.ui.showAdd=true;state.ui.selectedId=null;state.rerender();});
  root.querySelector("#btnCancelAdd")?.addEventListener("click",()=>{state.ui.showAdd=false;state.rerender();});
  root.querySelector("#btnCreateClub")?.addEventListener("click",()=>{
    const naam=root.querySelector("#newNaam")?.value?.trim(); if(!naam){toast("Vul een naam in.");return;}
    const contact=root.querySelector("#newContact")?.value?.trim();
    const club={id:uid("club"),naam,
      sport:root.querySelector("#newSport")?.value?.trim()||"",
      plaats:root.querySelector("#newPlaats")?.value?.trim()||"",
      gemeente:root.querySelector("#newGemeente")?.value?.trim()||"",
      contacten:contact?[{rol:"Contact",naam:contact,email:"",telefoon:""}]:[],
      actief:root.querySelector("#newActief")?.value!=="false",
      notitie:""};
    state.verenigingen.unshift(club); state.ui.showAdd=false; state.ui.selectedId=club.id;
    toast("Club toegevoegd."); state.rerender();
  });

  // Toggle actief directly in table
  root.querySelectorAll("[data-toggle-actief]")?.forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const id=btn.getAttribute("data-toggle-actief");
      const v=state.verenigingen.find(x=>x.id===id); if(!v)return;
      v.actief=v.actief===false?true:false;
      state.rerender();
    });
  });

  // Delete from table
  root.querySelectorAll("[data-del-club]")?.forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      e.stopPropagation();const id=btn.getAttribute("data-del-club");
      const v=state.verenigingen.find(x=>x.id===id); if(!v)return;
      if(!confirm(`'${v.naam}' verwijderen?`))return;
      state.verenigingen=state.verenigingen.filter(x=>x.id!==id);
      state.acties=(state.acties||[]).filter(a=>a.verenigingId!==id);
      if(state.ui.selectedId===id) state.ui.selectedId=null;
      toast(`${v.naam} verwijderd.`); state.rerender();
    });
  });

  // Detail bindings
  bindDetail(state,root);

  // SAVE
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub"); btn.disabled=true; btn.textContent="Bezig…";
    try{
      await saveData("verenigingen.json",state.verenigingen,"Update verenigingen");
      await saveData("acties.json",state.acties||[],"Update acties");
      toast("✓ Opgeslagen naar GitHub!");
    }catch(e){toast("✗ Fout: "+e.message);}
    btn.disabled=false; btn.textContent="Opslaan naar GitHub";
  });
}

function bindDetail(state,root){
  root.querySelector("#btnCloseDetail")?.addEventListener("click",()=>{state.ui.selectedId=null;state.rerender();});
  root.querySelector("#btnSaveContacts")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.contacten=Array.from(root.querySelectorAll("[data-contact-row]")).map(r=>({
      rol:r.querySelector("[data-f='rol']")?.value?.trim()||"",naam:r.querySelector("[data-f='naam']")?.value?.trim()||"",
      email:r.querySelector("[data-f='email']")?.value?.trim()||"",telefoon:r.querySelector("[data-f='telefoon']")?.value?.trim()||""
    })).filter(c=>c.rol||c.naam||c.email||c.telefoon);
    toast("Contacten bijgewerkt."); state.rerender();
  });
  root.querySelector("#btnAddContact")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.contacten=v.contacten||[]; v.contacten.push({rol:"",naam:"",email:"",telefoon:""}); state.rerender();
  });
  root.querySelectorAll("[data-remove-contact]")?.forEach(btn=>{
    btn.addEventListener("click",e=>{e.stopPropagation();const v=state.verenigingen.find(x=>x.id===state.ui.selectedId);if(!v)return;v.contacten.splice(Number(btn.getAttribute("data-remove-contact")),1);state.rerender();});
  });
  root.querySelector("#btnSaveNote")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.notitie=(root.querySelector("#noteText")?.value||"").trim(); toast("Notitie bijgewerkt."); state.rerender();
  });
  root.querySelector("#btnSaveFields")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.sport=root.querySelector("#editSport")?.value?.trim()||"";
    v.plaats=root.querySelector("#editPlaats")?.value?.trim()||"";
    v.gemeente=root.querySelector("#editGemeente")?.value?.trim()||"";
    v.actief=root.querySelector("#editActief")?.value!=="false";
    toast("Gegevens bijgewerkt."); state.rerender();
  });
  root.querySelector("#btnAddNotitie")?.addEventListener("click",()=>{
    const tekst=root.querySelector("#notitieTekst")?.value?.trim(); if(!tekst){toast("Vul een notitie in.");return;}
    (state.acties=state.acties||[]).unshift({id:uid("note"),verenigingId:state.ui.selectedId,type:"notitie",datum:new Date().toISOString().slice(0,10),tekst});
    toast("Notitie toegevoegd."); state.rerender();
  });
  root.querySelector("#btnAddActie")?.addEventListener("click",()=>{
    const titel=root.querySelector("#actieTitel")?.value?.trim(); if(!titel){toast("Vul een titel in.");return;}
    (state.acties=state.acties||[]).unshift({id:uid("act"),verenigingId:state.ui.selectedId,type:"actie",
      titel,status:root.querySelector("#actieStatus")?.value||"Open",
      deadline:root.querySelector("#actieDeadline")?.value||"",
      verantwoordelijke:root.querySelector("#actieWie")?.value?.trim()||"",
      notitie:root.querySelector("#actieNotitie")?.value?.trim()||"",
      datum:new Date().toISOString().slice(0,10)});
    toast("Actie toegevoegd."); state.rerender();
  });
  root.querySelectorAll("[data-toggle-actie]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{const a=(state.acties||[]).find(x=>x.id===btn.getAttribute("data-toggle-actie"));if(!a)return;
      const o=["Open","Lopend","Afgerond"];a.status=o[(o.indexOf(a.status)+1)%o.length];state.rerender();});
  });
  root.querySelectorAll("[data-del-actie]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{state.acties=(state.acties||[]).filter(x=>x.id!==btn.getAttribute("data-del-actie"));state.rerender();});
  });
}

/* ── Rendering ─────────────────────────────── */

function tableRow(v,state){
  const first=v.contacten?.[0];
  const actieCount=(state.acties||[]).filter(a=>a.verenigingId===v.id&&a.type==="actie"&&a.status!=="Afgerond").length;
  const contactLabel=first&&(first.naam||first.rol)?`${first.naam||first.rol}`:"—";
  const isSel=state.ui.selectedId===v.id;
  const admin=state.isAdmin;
  const isActief=v.actief!==false;
  return `<tr data-select-id="${esc(v.id)}" style="cursor:pointer;${isSel?"background:var(--accent-light);":""}${!isActief?"opacity:0.55;":""}">
    <td><strong>${esc(v.naam)}</strong></td>
    <td>${esc(v.sport||"")}</td>
    <td>${esc(v.plaats||"")}</td>
    <td>${esc(v.gemeente||"")}</td>
    <td style="font-size:12px;">${esc(contactLabel)}</td>
    <td>${admin
      ?`<button class="pill pill--status ${isActief?"pill--active":"pill--paused"}" data-toggle-actief="${esc(v.id)}" style="cursor:pointer;border:1px solid;" title="Klik om te wisselen">${isActief?"Ja":"Nee"}</button>`
      :`<span class="pill pill--status ${isActief?"pill--active":"pill--paused"}">${isActief?"Ja":"Nee"}</span>`}</td>
    <td>${actieCount?`<span class="pill pill--active">${actieCount}</span>`:""}</td>
    ${admin?`<td><button class="btn--icon-del" data-del-club="${esc(v.id)}" title="Verwijder">×</button></td>`:""}
  </tr>`;
}

function details(state){
  const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return ""; const admin=state.isAdmin;
  const contacts=v.contacten||[];
  const clubActies=(state.acties||[]).filter(a=>a.verenigingId===v.id);
  const notities=clubActies.filter(a=>a.type==="notitie");
  const acties=clubActies.filter(a=>a.type==="actie");

  return `
    <div class="panel__header">
      <div class="row" style="gap:14px;align-items:center;">
        <div><div class="panel__title">${esc(v.naam)} ${v.actief===false?`<span class="pill pill--paused" style="font-size:10px;vertical-align:middle;">Inactief</span>`:""}</div>
          <div class="muted" style="font-size:12px;">${[v.sport,v.plaats,v.gemeente].filter(Boolean).join(" · ")}</div></div>
      </div>
      <button class="btn btn--ghost" id="btnCloseDetail">Sluiten</button>
    </div>
    <div class="panel__body">
      ${admin?`<div class="subpanel">
        <div class="subpanel__header"><strong>Gegevens bewerken</strong>
          <button class="btn" id="btnSaveFields" style="font-size:12px;padding:5px 10px;">Bewaar</button></div>
        <div class="row">
          <input class="input" id="editSport" placeholder="Sport" value="${esc(v.sport||"")}"/>
          <input class="input" id="editPlaats" placeholder="Plaats" value="${esc(v.plaats||"")}"/>
          <input class="input" id="editGemeente" placeholder="Gemeente" value="${esc(v.gemeente||"")}"/>
          <select class="input" id="editActief" style="flex:0 0 110px;">
            <option value="true" ${v.actief!==false?"selected":""}>Actief</option>
            <option value="false" ${v.actief===false?"selected":""}>Inactief</option>
          </select>
        </div>
      </div>`:""}

      <div class="split">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="subpanel">
            <div class="subpanel__header"><strong>Contactpersonen</strong>
              ${admin?`<div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnAddContact" style="font-size:12px;padding:5px 10px;">+ Contact</button><button class="btn" id="btnSaveContacts" style="font-size:12px;padding:5px 10px;">Bewaar</button></div>`:""}</div>
            ${contacts.length?(admin?contactsEdit(contacts):contactsRead(contacts)):`<div class="muted" style="font-size:13px;">Geen contacten.${admin?" Klik + Contact.":""}</div>`}
          </div>
          <div class="subpanel">
            <div class="subpanel__header"><strong>Wat speelt er?</strong>
              ${admin?`<button class="btn" id="btnSaveNote" style="font-size:12px;padding:5px 10px;">Bewaar</button>`:""}</div>
            ${admin?`<textarea class="textarea" id="noteText" placeholder="Korte overdrachtsnotities…" style="min-height:70px;">${esc(v.notitie||"")}</textarea>`
              :`<div style="font-size:13px;line-height:1.5;white-space:pre-wrap;">${esc(v.notitie||"Geen notities.")}</div>`}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="subpanel">
            <div class="subpanel__header"><strong>Acties</strong> <span class="muted">(${acties.filter(a=>a.status!=="Afgerond").length} open)</span></div>
            ${admin?`<div class="actie-form" style="margin-bottom:10px;">
              <div class="row"><input class="input" id="actieTitel" placeholder="Actie titel *" style="flex:2;"/>
                <select class="input" id="actieStatus" style="flex:0 0 110px;"><option>Open</option><option>Lopend</option><option>Afgerond</option></select></div>
              <div class="row" style="margin-top:6px;"><input class="input" id="actieDeadline" type="date" style="flex:0 0 150px;"/>
                <input class="input" id="actieWie" placeholder="Wie?"/>
                <button class="btn" id="btnAddActie" style="font-size:12px;padding:6px 12px;">+ Actie</button></div>
              <textarea class="textarea" id="actieNotitie" placeholder="Toelichting (optioneel)" style="min-height:40px;margin-top:6px;"></textarea>
            </div>`:""}
            ${acties.length?acties.map(a=>`<div class="actie-item"><div class="actie-item__header">
              <div style="flex:1;"><div class="actie-item__title">${esc(a.titel)}</div>
                ${a.notitie?`<div class="actie-item__desc">${esc(a.notitie)}</div>`:""}</div>
              <div class="row" style="gap:4px;flex-shrink:0;">
                ${a.deadline?`<span class="pill" style="font-size:10px;">${formatDate(a.deadline)}</span>`:""}
                ${a.verantwoordelijke?`<span class="pill" style="font-size:10px;">${esc(a.verantwoordelijke)}</span>`:""}
                <span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}" ${admin?`data-toggle-actie="${esc(a.id)}" style="cursor:pointer;" title="Klik om status te wisselen"`:""}>${esc(a.status)}</span>
                ${admin?`<button class="btn--icon-del" data-del-actie="${esc(a.id)}">×</button>`:""}</div>
            </div></div>`).join(""):`<div class="muted" style="font-size:13px;">Nog geen acties.</div>`}
          </div>
          <div class="subpanel">
            <div class="subpanel__header"><strong>Logboek</strong> <span class="muted">(${notities.length})</span></div>
            ${admin?`<div class="row" style="margin-bottom:8px;">
              <input class="input" id="notitieTekst" placeholder="Snelle notitie…"/>
              <button class="btn" id="btnAddNotitie" style="font-size:12px;padding:6px 12px;">+ Log</button></div>`:""}
            ${notities.length?notities.map(n=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);align-items:flex-start;">
              <div style="font-size:11px;color:var(--accent);min-width:68px;">${formatDate(n.datum)}</div>
              <div style="font-size:13px;flex:1;">${esc(n.tekst)}</div>
              ${admin?`<button class="btn--icon-del" data-del-actie="${esc(n.id)}">×</button>`:""}</div>`).join("")
              :`<div class="muted" style="font-size:13px;">Nog geen logboek.</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

function contactsEdit(contacts){
  return contacts.map((c,i)=>`
    <div class="row" data-contact-row="1" style="padding:6px 0;border-bottom:1px solid var(--border);">
      <input class="input" data-f="rol" placeholder="Rol" value="${esc(c.rol||"")}" style="flex:0 0 110px;"/>
      <input class="input" data-f="naam" placeholder="Naam" value="${esc(c.naam||"")}"/>
      <input class="input" data-f="email" placeholder="E-mail" value="${esc(c.email||"")}"/>
      <input class="input" data-f="telefoon" placeholder="Telefoon" value="${esc(c.telefoon||"")}" style="flex:0 0 130px;"/>
      <button class="btn--icon-del" data-remove-contact="${i}">×</button>
    </div>`).join("");
}

function contactsRead(contacts){
  return `<table class="table" style="margin-top:4px;"><thead><tr><th>Rol</th><th>Naam</th><th>E-mail</th><th>Telefoon</th></tr></thead><tbody>
    ${contacts.map(c=>`<tr><td>${esc(c.rol||"—")}</td><td>${esc(c.naam||"—")}</td>
      <td>${c.email?`<a href="mailto:${esc(c.email)}" style="color:var(--accent);">${esc(c.email)}</a>`:"—"}</td>
      <td>${c.telefoon?`<a href="tel:${esc(c.telefoon)}" style="color:var(--accent);">${esc(c.telefoon)}</a>`:"—"}</td></tr>`).join("")}
  </tbody></table>`;
}

function filter(list,q){
  q=(q||"").trim().toLowerCase(); if(!q)return list;
  return list.filter(v=>{
    const c=(v.contacten||[]).map(x=>`${x.rol} ${x.naam} ${x.email} ${x.telefoon}`).join(" ");
    return `${v.naam} ${v.sport} ${v.plaats} ${v.gemeente} ${c} ${v.notitie||""}`.toLowerCase().includes(q);
  });
}

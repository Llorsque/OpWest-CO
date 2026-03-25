import { esc, uid, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";
import { downloadTemplate, parseCSV } from "../../shared/csv.js";

const ACTIE_STATUS = ["Open","Lopend","Afgerond"];

export function meta(){ return { title:"Verenigingen", meta:"Clubs, contacten, acties en dossiers" }; }

export function render(state){
  const q=state.ui.q||""; const list=filter(state.verenigingen,q); const admin=state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div><div class="panel__title">Verenigingen <span class="muted" style="font-weight:400;">(${state.verenigingen.length})</span></div></div>
        <div class="row" style="justify-content:flex-end;flex-wrap:wrap;">
          <input class="input" id="clubSearch" placeholder="Zoek op naam, sport, gemeente…" value="${esc(q)}" style="max-width:260px;" />
          ${admin?`
            <button class="btn btn--ghost" id="btnDownloadCSV" title="Download CSV-sjabloon">📥 Sjabloon</button>
            <label class="btn btn--ghost filelabel" title="Upload CSV met verenigingen">📤 CSV uploaden<input type="file" id="fileCSV" accept=".csv" hidden/></label>
            <button class="btn" id="btnAddClub">+ Nieuwe club</button>
          `:""}
        </div>
      </div>
      <div class="panel__body" id="csvFeedback">
        <table class="table">
          <thead><tr>
            <th style="width:28%;">Vereniging</th><th style="width:13%;">Sport</th><th style="width:13%;">Gemeente</th>
            <th>Contact</th><th style="width:8%;">Acties</th><th style="width:8%;">Notitie</th>
          </tr></thead>
          <tbody>${list.map(v=>tableRow(v,state)).join("")}</tbody>
        </table>
      </div>
    </div>
    <div class="panel" style="margin-top:14px;">
      <div class="panel__header">
        <div class="panel__title">Details & dossier</div>
        <div class="muted" style="font-size:12px;">Selecteer een vereniging</div>
      </div>
      <div class="panel__body" id="clubDetails">
        ${state.ui.showAdd ? addForm() : (state.ui.selectedId ? details(state) : `<div class="muted" style="font-size:13px;">Selecteer een vereniging in de tabel.</div>`)}
      </div>
    </div>`;
}

export function bind(state,root){
  const search=root.querySelector("#clubSearch");
  if(search){ search.addEventListener("input",e=>{state.ui.q=e.target.value;state.rerender();}); search.focus(); search.setSelectionRange(search.value.length,search.value.length); }

  root.querySelectorAll("[data-select-id]")?.forEach(tr=>{ tr.addEventListener("click",()=>{ state.ui.selectedId=tr.getAttribute("data-select-id"); state.ui.showAdd=false; state.rerender(); }); });

  // CSV
  root.querySelector("#btnDownloadCSV")?.addEventListener("click", ()=> downloadTemplate());
  root.querySelector("#fileCSV")?.addEventListener("change", async(e)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const text=await file.text(); const result=parseCSV(text);
    if(!result.ok){ toast("CSV fout: "+result.error); return; }
    // Merge: skip duplicates by name
    const existing=new Set(state.verenigingen.map(v=>v.naam.toLowerCase()));
    let added=0;
    for(const club of result.clubs){ if(!existing.has(club.naam.toLowerCase())){ state.verenigingen.push(club); existing.add(club.naam.toLowerCase()); added++; } }
    toast(`${added} nieuwe clubs toegevoegd (${result.count - added} overgeslagen). Klik Opslaan naar GitHub.`);
    e.target.value=""; state.rerender();
  });

  // Add club
  root.querySelector("#btnAddClub")?.addEventListener("click",()=>{state.ui.selectedId=null;state.ui.showAdd=true;state.rerender();});
  root.querySelector("#btnCancelAdd")?.addEventListener("click",()=>{state.ui.showAdd=false;state.rerender();});
  root.querySelector("#btnCreateClub")?.addEventListener("click",()=>{
    const naam=root.querySelector("#newNaam")?.value?.trim(); if(!naam){toast("Vul een naam in.");return;}
    const club={id:uid("club"),naam,sport:root.querySelector("#newSport")?.value?.trim()||"",gemeente:root.querySelector("#newGemeente")?.value?.trim()||"",
      contacten:[{rol:root.querySelector("#newRol")?.value?.trim()||"Contact",naam:root.querySelector("#newContactNaam")?.value?.trim()||"",email:root.querySelector("#newEmail")?.value?.trim()||"",telefoon:root.querySelector("#newTelefoon")?.value?.trim()||""}],notitie:""};
    state.verenigingen.unshift(club); state.ui.selectedId=club.id; state.ui.showAdd=false;
    toast("Club toegevoegd. Klik Opslaan naar GitHub."); state.rerender();
  });

  // Contacts
  root.querySelector("#btnSaveContacts")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.contacten=Array.from(root.querySelectorAll("[data-contact-row]")).map(r=>({
      rol:r.querySelector("[data-f='rol']")?.value?.trim()||"", naam:r.querySelector("[data-f='naam']")?.value?.trim()||"",
      email:r.querySelector("[data-f='email']")?.value?.trim()||"", telefoon:r.querySelector("[data-f='telefoon']")?.value?.trim()||""
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

  // Note
  root.querySelector("#btnSaveNote")?.addEventListener("click",()=>{
    const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return;
    v.notitie=(root.querySelector("#noteText")?.value||"").trim(); toast("Notitie bijgewerkt."); state.rerender();
  });

  // Acties - add notitie
  root.querySelector("#btnAddNotitie")?.addEventListener("click",()=>{
    const tekst=root.querySelector("#notitieTekst")?.value?.trim(); if(!tekst){toast("Vul een notitie in.");return;}
    state.acties.unshift({id:uid("note"),verenigingId:state.ui.selectedId,type:"notitie",datum:new Date().toISOString().slice(0,10),tekst});
    toast("Notitie toegevoegd."); state.rerender();
  });

  // Acties - add actie
  root.querySelector("#btnAddActie")?.addEventListener("click",()=>{
    const titel=root.querySelector("#actieTitel")?.value?.trim(); if(!titel){toast("Vul een titel in.");return;}
    state.acties.unshift({id:uid("act"),verenigingId:state.ui.selectedId,type:"actie",
      titel,status:root.querySelector("#actieStatus")?.value||"Open",
      deadline:root.querySelector("#actieDeadline")?.value||"",
      verantwoordelijke:root.querySelector("#actieWie")?.value?.trim()||"",
      notitie:root.querySelector("#actieNotitie")?.value?.trim()||"",
      datum:new Date().toISOString().slice(0,10)});
    toast("Actie toegevoegd."); state.rerender();
  });

  // Acties - toggle status
  root.querySelectorAll("[data-toggle-actie]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const a=state.acties.find(x=>x.id===btn.getAttribute("data-toggle-actie"));
      if(!a)return;
      const order=["Open","Lopend","Afgerond"];
      a.status=order[(order.indexOf(a.status)+1)%order.length];
      state.rerender();
    });
  });

  // Acties - delete
  root.querySelectorAll("[data-del-actie]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      state.acties=state.acties.filter(x=>x.id!==btn.getAttribute("data-del-actie"));
      state.rerender();
    });
  });

  // Delete club
  root.querySelector("#btnDeleteClub")?.addEventListener("click",()=>{
    if(!confirm("Weet je zeker dat je deze club wilt verwijderen?"))return;
    state.verenigingen=state.verenigingen.filter(v=>v.id!==state.ui.selectedId);
    state.acties=state.acties.filter(a=>a.verenigingId!==state.ui.selectedId);
    state.ui.selectedId=null; toast("Club verwijderd."); state.rerender();
  });

  // SAVE TO GITHUB (saves both vereinigingen + acties)
  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub"); btn.disabled=true; btn.textContent="Bezig…";
    try{
      await saveData("verenigingen.json",state.verenigingen,"Update verenigingen");
      await saveData("acties.json",state.acties,"Update acties");
      toast("✓ Opgeslagen naar GitHub!");
    }catch(e){toast("✗ Fout: "+e.message);}
    btn.disabled=false; btn.textContent="Opslaan naar GitHub";
  });
}

/* ── Helpers ──────────────────────────────── */

function tableRow(v,state){
  const first=v.contacten?.[0];
  const hasNote=!!v.notitie;
  const actieCount=(state.acties||[]).filter(a=>a.verenigingId===v.id).length;
  const contactLabel=first?`${first.rol||"Contact"}: ${first.naam||"—"}`:"—";
  const isSel=state.ui.selectedId===v.id;
  return `<tr data-select-id="${esc(v.id)}" style="cursor:pointer;${isSel?"background:rgba(82,232,232,0.06);":""}">
    <td><strong>${esc(v.naam)}</strong></td><td>${esc(v.sport||"")}</td><td>${esc(v.gemeente||"")}</td>
    <td style="font-size:12px;">${esc(contactLabel)}</td>
    <td>${actieCount?`<span class="pill pill--status pill--active">${actieCount}</span>`:""}</td>
    <td>${hasNote?"✓":""}</td></tr>`;
}

function details(state){
  const v=state.verenigingen.find(x=>x.id===state.ui.selectedId); if(!v)return ""; const admin=state.isAdmin;
  const contacts=v.contacten||[];
  const clubActies=(state.acties||[]).filter(a=>a.verenigingId===v.id);
  const notities=clubActies.filter(a=>a.type==="notitie");
  const acties=clubActies.filter(a=>a.type==="actie");

  return `
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap;">
      <div class="kv" style="flex:1;min-width:300px;">
        <div class="kv__k">Vereniging</div><div class="kv__v"><strong>${esc(v.naam)}</strong></div>
        <div class="kv__k">Sport</div><div class="kv__v">${esc(v.sport||"—")}</div>
        <div class="kv__k">Gemeente</div><div class="kv__v">${esc(v.gemeente||"—")}</div>
      </div>
      ${admin?`<div class="row" style="gap:8px;">
        <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
        <button class="btn btn--ghost btn--danger" id="btnDeleteClub">Verwijder</button>
      </div>`:""}
    </div>

    <div class="split">
      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Contacten -->
        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Contactpersonen</div>
            ${admin?`<div class="row" style="justify-content:flex-end;"><button class="btn btn--ghost" id="btnAddContact">+ Contact</button><button class="btn" id="btnSaveContacts">Bewaar</button></div>`:""}
          </div>
          <div class="panel__body">
            ${contacts.length?(admin?contactsEdit(contacts):contactsRead(contacts)):`<div class="muted" style="font-size:13px;">Geen contacten.${admin?" Klik + Contact.":""}</div>`}
          </div>
        </div>

        <!-- Wat speelt er -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Wat speelt er?</div>
            ${admin?`<button class="btn" id="btnSaveNote">Bewaar</button>`:""}</div>
          <div class="panel__body">
            ${admin?`<textarea class="textarea" id="noteText" placeholder="Korte overdrachtsnotities…" style="min-height:80px;">${esc(v.notitie||"")}</textarea>`
              :`<div style="font-size:13px;line-height:1.5;white-space:pre-wrap;">${esc(v.notitie||"Geen notities.")}</div>`}
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Acties -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Acties <span class="muted" style="font-weight:400;">(${acties.length} open/lopend)</span></div></div>
          <div class="panel__body">
            ${admin?`
              <div class="actie-form">
                <div class="row"><input class="input" id="actieTitel" placeholder="Actie titel *" style="flex:2;" />
                  <select class="input" id="actieStatus" style="flex:0 0 120px;"><option>Open</option><option>Lopend</option><option>Afgerond</option></select></div>
                <div class="row" style="margin-top:8px;">
                  <input class="input" id="actieDeadline" type="date" style="flex:0 0 160px;" title="Deadline" />
                  <input class="input" id="actieWie" placeholder="Verantwoordelijke" />
                  <button class="btn" id="btnAddActie">+ Actie</button>
                </div>
                <textarea class="textarea" id="actieNotitie" placeholder="Toelichting (optioneel)" style="min-height:50px;margin-top:8px;"></textarea>
              </div>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:12px 0;">
            `:""}
            ${acties.length?acties.map(a=>`
              <div class="actie-item">
                <div class="actie-item__header">
                  <div style="flex:1;">
                    <div class="actie-item__title">${esc(a.titel)}</div>
                    ${a.notitie?`<div class="actie-item__desc">${esc(a.notitie)}</div>`:""}
                  </div>
                  <div class="row" style="gap:6px;flex-shrink:0;">
                    ${a.deadline?`<span class="pill" style="font-size:11px;">${formatDate(a.deadline)}</span>`:""}
                    ${a.verantwoordelijke?`<span class="pill" style="font-size:11px;">${esc(a.verantwoordelijke)}</span>`:""}
                    <span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}" ${admin?`data-toggle-actie="${esc(a.id)}" style="cursor:pointer;" title="Klik om status te wijzigen"`:""}>${esc(a.status)}</span>
                    ${admin?`<button class="btn btn--ghost" data-del-actie="${esc(a.id)}" style="font-size:10px;padding:4px 6px;">✕</button>`:""}
                  </div>
                </div>
              </div>
            `).join(""):`<div class="muted" style="font-size:13px;">Nog geen acties.</div>`}
          </div>
        </div>

        <!-- Snelle notities / logboek -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Logboek <span class="muted" style="font-weight:400;">(${notities.length})</span></div></div>
          <div class="panel__body">
            ${admin?`
              <div class="row" style="margin-bottom:10px;">
                <input class="input" id="notitieTekst" placeholder="Snelle notitie…" />
                <button class="btn" id="btnAddNotitie">+ Log</button>
              </div>
            `:""}
            ${notities.length?notities.map(n=>`
              <div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);align-items:flex-start;">
                <div style="font-size:11px;color:var(--accent);min-width:72px;">${formatDate(n.datum)}</div>
                <div style="font-size:13px;flex:1;">${esc(n.tekst)}</div>
                ${admin?`<button class="btn btn--ghost" data-del-actie="${esc(n.id)}" style="font-size:10px;padding:4px 6px;">✕</button>`:""}
              </div>
            `).join(""):`<div class="muted" style="font-size:13px;">Nog geen logboek-items.</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

function contactsEdit(contacts){
  return `<div class="grid" style="gap:8px;">${contacts.map((c,i)=>`
    <div class="panel" data-contact-row="1" style="background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.08);">
      <div class="panel__body" style="padding:10px 12px;">
        <div class="row"><input class="input" data-f="rol" placeholder="Rol" value="${esc(c.rol||"")}" /><input class="input" data-f="naam" placeholder="Naam" value="${esc(c.naam||"")}" />
          <button class="btn btn--ghost" data-remove-contact="${i}" style="font-size:11px;padding:6px 8px;">✕</button></div>
        <div class="row" style="margin-top:6px;"><input class="input" data-f="email" placeholder="E-mail" value="${esc(c.email||"")}" /><input class="input" data-f="telefoon" placeholder="Telefoon" value="${esc(c.telefoon||"")}" /></div>
      </div>
    </div>`).join("")}</div>`;
}

function contactsRead(contacts){
  return `<table class="table"><thead><tr><th>Rol</th><th>Naam</th><th>E-mail</th><th>Telefoon</th></tr></thead><tbody>
    ${contacts.map(c=>`<tr><td>${esc(c.rol||"—")}</td><td>${esc(c.naam||"—")}</td>
      <td>${c.email?`<a href="mailto:${esc(c.email)}" style="color:var(--accent);">${esc(c.email)}</a>`:"—"}</td>
      <td>${c.telefoon?`<a href="tel:${esc(c.telefoon)}" style="color:var(--accent);">${esc(c.telefoon)}</a>`:"—"}</td></tr>`).join("")}
  </tbody></table>`;
}

function addForm(){
  return `<div class="panel" style="border-color:rgba(82,232,232,0.2);">
    <div class="panel__header"><div class="panel__title">Nieuwe vereniging</div>
      <div class="row" style="justify-content:flex-end;"><button class="btn btn--ghost" id="btnCancelAdd">Annuleren</button><button class="btn" id="btnCreateClub">Aanmaken</button></div></div>
    <div class="panel__body">
      <div class="row"><input class="input" id="newNaam" placeholder="Naam *"/><input class="input" id="newSport" placeholder="Sport"/><input class="input" id="newGemeente" placeholder="Gemeente"/></div>
      <div class="row" style="margin-top:10px;"><input class="input" id="newRol" placeholder="Contactrol"/><input class="input" id="newContactNaam" placeholder="Contactnaam"/></div>
      <div class="row" style="margin-top:10px;"><input class="input" id="newEmail" placeholder="E-mail"/><input class="input" id="newTelefoon" placeholder="Telefoon"/></div>
    </div></div>`;
}

function filter(list,q){
  q=(q||"").trim().toLowerCase(); if(!q)return list;
  return list.filter(v=>{
    const c=(v.contacten||[]).map(x=>`${x.rol} ${x.naam} ${x.email} ${x.telefoon}`).join(" ");
    return `${v.naam} ${v.sport} ${v.gemeente} ${c} ${v.notitie||""}`.toLowerCase().includes(q);
  });
}

import { esc, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){ return { title:"Gemeente overzicht", meta:"Cockpit: wat speelt er in de gemeente?" }; }

export function render(state){
  const admin=state.isAdmin; const g=state.gemeente||{};
  const total=state.verenigingen.length;
  const actief=state.verenigingen.filter(v=>v.actief!==false).length;
  const inactief=total-actief;
  const trajectenActief=state.trajecten.filter(t=>t.status==="Lopend"||t.status==="Intake").length;
  const actiesOpen=(state.acties||[]).filter(a=>a.type==="actie"&&a.status==="Open").length;
  const actiesLopend=(state.acties||[]).filter(a=>a.type==="actie"&&a.status==="Lopend").length;
  const projectenOpen=state.projecten.filter(p=>p.status!=="Afgerond").length;

  const recenteActies=(state.acties||[]).slice().sort((a,b)=>(b.datum||"").localeCompare(a.datum||"")).slice(0,10);
  const aankomend=(state.aankomend||[]).slice().sort((a,b)=>(a.datum||"").localeCompare(b.datum||"")).slice(0,5);

  const sportCount={};
  state.verenigingen.filter(v=>v.actief!==false).forEach(v=>{const s=v.sport||"Onbekend";sportCount[s]=(sportCount[s]||0)+1;});
  const sportEntries=Object.entries(sportCount).sort((a,b)=>b[1]-a[1]);

  const gemCount={};
  state.verenigingen.filter(v=>v.actief!==false).forEach(v=>{const g=v.gemeente||"Onbekend";gemCount[g]=(gemCount[g]||0)+1;});
  const gemEntries=Object.entries(gemCount).sort((a,b)=>b[1]-a[1]);

  const plaatsCount={};
  state.verenigingen.filter(v=>v.actief!==false).forEach(v=>{const p=v.plaats||"Onbekend";plaatsCount[p]=(plaatsCount[p]||0)+1;});
  const plaatsEntries=Object.entries(plaatsCount).sort((a,b)=>b[1]-a[1]);

      const actPlan=state.activiteiten||[];
  const actTotal=actPlan.length;
  const actAvg=actTotal?Math.round(actPlan.reduce((s,a)=>s+(a.voortgang||0),0)/actTotal):0;
  const actDone=actPlan.filter(a=>(a.voortgang||0)>=100).length;

  return `
    <div class="dash-grid">
      ${dashTile("👥","Actieve clubs",actief,`${inactief} inactief van ${total}`,"#/verenigingen")}
      ${dashTile("🎯","Trajecten actief",trajectenActief,`van ${state.trajecten.length} totaal`,"#/trajecten")}
      ${dashTile("⚡","Open acties",actiesOpen+actiesLopend,`${actiesOpen} open, ${actiesLopend} lopend`,"#/verenigingen")}
      ${dashTile("🧩","Projecten",projectenOpen,`openstaand van ${state.projecten.length}`,"#/projecten")}
      ${dashTile("🗓️","Aankomend",state.aankomend.length,"items gepland","#/aankomend")}
      ${dashTile("📌","Activiteitenplan",`${actAvg}%`,`${actDone}/${actTotal} afgerond`,"#/activiteiten")}
    </div>

    <div class="split" style="margin-top:16px;">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="panel"><div class="panel__header"><div class="panel__title">Recente activiteit</div></div>
          <div class="panel__body">
            ${recenteActies.length?recenteActies.map(a=>{const club=state.verenigingen.find(v=>v.id===a.verenigingId);
              return `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);min-width:68px;">${formatDate(a.datum)}</div>
                <div style="font-size:12px;flex:1;"><strong>${esc(club?.naam||"Onbekend")}</strong> — ${a.type==="actie"?`${esc(a.titel)} <span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}" style="font-size:10px;">${esc(a.status)}</span>`:esc(a.tekst)}</div>
              </div>`;}).join(""):`<div class="muted" style="font-size:13px;">Nog geen activiteit.</div>`}
          </div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Actieve clubs per sport</div></div>
          <div class="panel__body">${sportEntries.length?`<div class="bar-chart">${sportEntries.map(([s,c])=>{const pct=Math.round((c/actief)*100);
            return `<div class="bar-row"><div class="bar-label">${esc(s)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div><div class="bar-val">${c}</div></div>`;}).join("")}</div>`:""}</div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Actieve clubs per gemeente</div></div>
          <div class="panel__body">${gemEntries.length?`<div class="bar-chart">${gemEntries.map(([g,c])=>{const pct=Math.round((c/actief)*100);
            return `<div class="bar-row"><div class="bar-label">${esc(g)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div><div class="bar-val">${c}</div></div>`;}).join("")}</div>`:""}</div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Actieve clubs per plaats</div></div>
          <div class="panel__body">${plaatsEntries.length?`<div class="bar-chart">${plaatsEntries.slice(0,15).map(([p,c])=>{const pct=Math.round((c/actief)*100);
            return `<div class="bar-row"><div class="bar-label">${esc(p)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div><div class="bar-val">${c}</div></div>`;}).join("")}</div>`:""}
            ${plaatsEntries.length>15?`<div class="muted" style="font-size:12px;margin-top:8px;">+ ${plaatsEntries.length-15} meer</div>`:""}
          </div></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="panel"><div class="panel__header"><div class="panel__title">Eerstvolgende afspraken</div>
          <a href="#/aankomend" class="btn btn--ghost" style="font-size:11px;padding:6px 10px;">Alles</a></div>
          <div class="panel__body">${aankomend.length?aankomend.map(x=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
            <div style="font-size:11px;color:var(--accent);min-width:68px;">${formatDate(x.datum)}</div>
            <div style="font-size:12px;flex:1;"><strong>${esc(x.titel)}</strong>${x.betrokken?" — "+esc(x.betrokken):""}</div>
          </div>`).join(""):`<div class="muted" style="font-size:13px;">Geen aankomende zaken.</div>`}</div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Kaders & spelregels</div>
          ${admin?`<button class="btn btn--save" id="btnSaveGem">Opslaan naar GitHub</button>`:""}</div>
          <div class="panel__body">${admin?`<textarea class="textarea" id="gKaders" placeholder="Subsidieproces, beleid, rollen…">${esc(g.kaders||"")}</textarea>`:`<div class="readblock">${esc(g.kaders||"Niet ingevuld.")}</div>`}</div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Contacten gemeente</div></div>
          <div class="panel__body">${admin?`<textarea class="textarea" id="gContacten" placeholder="Naam, rol, e-mail, telefoon…">${esc(g.contacten||"")}</textarea>`:`<div class="readblock">${esc(g.contacten||"Niet ingevuld.")}</div>`}</div></div>

        <div class="panel"><div class="panel__header"><div class="panel__title">Links & documenten</div></div>
          <div class="panel__body">${admin?`<textarea class="textarea" id="gLinks" placeholder="SharePoint, templates…">${esc(g.links||"")}</textarea>`:`<div class="readblock">${esc(g.links||"Niet ingevuld.")}</div>`}</div></div>
      </div>
    </div>`;
}

export function bind(state,root){
  root.querySelector("#btnSaveGem")?.addEventListener("click",async()=>{
    state.gemeente={kaders:root.querySelector("#gKaders")?.value||"",contacten:root.querySelector("#gContacten")?.value||"",links:root.querySelector("#gLinks")?.value||""};
    const btn=root.querySelector("#btnSaveGem");btn.disabled=true;btn.textContent="Bezig…";
    try{await saveData("gemeente.json",state.gemeente,"Update gemeente");toast("✓ Opgeslagen!");}catch(e){toast("✗ "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

function dashTile(icon,label,value,sub,href){
  return `<a class="dash-tile" href="${href}"><div class="dash-tile__icon">${icon}</div><div class="dash-tile__value">${value}</div><div class="dash-tile__label">${esc(label)}</div><div class="dash-tile__sub">${esc(sub)}</div></a>`;
}

import { esc } from "../shared/utils.js";

export function meta(){ return { title:"Dashboard", meta:"Overzicht van alle modules" }; }

export function render(state){
  const total=state.verenigingen.length;
  const actief=state.verenigingen.filter(v=>v.actief!==false).length;
  const actPlan=state.activiteiten||[];
  const actAvg=actPlan.length?Math.round(actPlan.reduce((s,a)=>s+(a.voortgang||0),0)/actPlan.length):0;
  const actDone=actPlan.filter(a=>(a.voortgang||0)>=100).length;
  const c={ver:total,actief,trj:state.trajecten.length,prj:state.projecten.length,aan:state.aankomend.length,
    actOpen:(state.acties||[]).filter(a=>a.type==="actie"&&a.status!=="Afgerond").length};
  return `
    <div class="grid grid--cards">
      ${card("Verenigingen",`${c.actief} actief van ${c.ver} clubs — contacten, acties en dossiers.`,["Actief",`${c.actief}/${c.ver}`],"#/verenigingen")}
      ${card("Trajecten",`${c.trj} trajecten — langdurige ondersteuning.`,["Ondersteuning",`${c.trj}`],"#/trajecten")}
      ${card("Lopende projecten",`${c.prj} projecten — status en deadlines.`,["Roadmap",`${c.prj}`],"#/projecten")}
      ${card("Aankomende zaken",`${c.aan} items — afspraken en events.`,["Planning",`${c.aan}`],"#/aankomend")}
      ${card("Gemeente overzicht","Cockpit: statistieken, kaders, contacten.",["Cockpit","Live"],"#/gemeente")}
      ${card("Activiteitenplan",`${actAvg}% gerealiseerd — ${actDone} van ${actPlan.length} doelen afgerond.`,["Voortgang",`${actAvg}%`],"#/activiteiten")}
      ${card("Documenten & contacten","Overige documenten, partners en tools.",["Bibliotheek","Netwerk"],"#/resources")}
      <div class="card card--wide"><div class="card__inner">
        <div class="card__title"><span>Aan de slag</span><span class="pill">${state.isAdmin?"Admin":"Viewer"}</span></div>
        <div class="card__subtitle">${state.isAdmin
          ?`Je bent ingelogd als admin.${c.actOpen?` Er staan <strong>${c.actOpen} open acties</strong>.`:""}`
          :`Je bekijkt de tool als alleen-lezen.`}</div>
      </div></div>
    </div>`;
}

function card(title,subtitle,pills,href){
  return `<a class="card" href="${href}"><div class="card__inner">
    <div class="card__title"><span>${esc(title)}</span><span class="pill">Open</span></div>
    <div class="card__subtitle">${subtitle}</div>
    <div class="card__meta">${pills.map(p=>`<span class="pill">${esc(p)}</span>`).join("")}</div>
  </div></a>`;
}

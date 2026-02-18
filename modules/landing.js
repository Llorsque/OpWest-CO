import { esc } from "../shared/utils.js";

export function meta(){
  return { title: "Dashboard", meta: "Overzicht van alle modules" };
}

export function render(state){
  const c = {
    ver: state.verenigingen.length,
    trj: state.trajecten.length,
    prj: state.projecten.length,
    aan: state.aankomend.length,
    act: state.activiteiten.length
  };

  return `
    <div class="grid grid--cards">
      ${card("Verenigingen", `${c.ver} clubs — contactpersonen, sport, gemeente en notities.`, ["Database",`${c.ver}`], "#/verenigingen")}
      ${card("Trajecten", `${c.trj} trajecten — langdurige ondersteuning per club.`, ["Ondersteuning",`${c.trj}`], "#/trajecten")}
      ${card("Lopende projecten", `${c.prj} projecten — status, eigenaar, deadlines.`, ["Roadmap",`${c.prj}`], "#/projecten")}
      ${card("Aankomende zaken", `${c.aan} items — afspraken, deadlines en events.`, ["Planning",`${c.aan}`], "#/aankomend")}
      ${card("Gemeentelijke info", "Kaders, beleidslijnen, contactpersonen gemeente.", ["Kaders","Links"], "#/gemeente")}
      ${card("Activiteitenplan", `${c.act} activiteiten — thema, impact, partners.`, ["Plan","Impact"], "#/activiteiten")}
      ${card("Documenten & contacten", "Overige documenten, vaste partners en tools.", ["Bibliotheek","Netwerk"], "#/resources")}

      <div class="card card--wide">
        <div class="card__inner">
          <div class="card__title">
            <span>Aan de slag</span>
            <span class="pill">${state.isAdmin ? "Admin" : "Viewer"}</span>
          </div>
          <div class="card__subtitle">
            ${state.isAdmin
              ? `Je bent ingelogd als admin. Bewerk data in de modules en klik <strong>Opslaan</strong> — wijzigingen worden direct naar GitHub gepusht.`
              : `Je bekijkt de tool als alleen-lezen. Wil je bewerken? Ga naar <a href="#/instellingen" style="color:var(--accent);">Instellingen</a> en koppel je GitHub-account.`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function card(title, subtitle, pills, href){
  return `
    <a class="card" href="${href}">
      <div class="card__inner">
        <div class="card__title">
          <span>${esc(title)}</span>
          <span class="pill">Open</span>
        </div>
        <div class="card__subtitle">${subtitle}</div>
        <div class="card__meta">
          ${pills.map(p => `<span class="pill">${esc(p)}</span>`).join("")}
        </div>
      </div>
    </a>
  `;
}

import { esc } from "../shared/utils.js";

export function meta(){
  return { title: "Landing", meta: "Overzicht van modules en snelkoppelingen" };
}

export function render(state){
  const counts = {
    verenigingen: state.verenigingen.length,
    projecten: state.projecten.length,
    aankomend: state.aankomend.length
  };

  return `
    <div class="grid grid--cards">
      ${card("Verenigingen", "Overzicht van alle verenigingen en contactpersonen. Voeg per vereniging ‘wat speelt er?’ toe.", ["Database", `${counts.verenigingen} items`], "#/verenigingen")}
      ${card("Lopende projecten", "Houd lopende trajecten bij (status, eigenaar, deadlines).", ["Roadmap", `${counts.projecten} items`], "#/projecten")}
      ${card("Aankomende zaken", "Belangrijke data, afspraken en deadlines die eraan komen.", ["Planning", `${counts.aankomend} items`], "#/aankomend")}
      ${card("Gemeentelijke info", "Kaders, beleidslijnen, contactpersonen gemeente, relevante links.", ["Kaders", "Links"], "#/gemeente")}
      ${card("Activiteitenplan", "Jaarplan/activiteiten per thema, impact en partners.", ["Plan", "Impact"], "#/activiteiten")}
      ${card("Documenten & contacten", "Overige documenten, vaste partners, telefoonnummers en tools.", ["Bibliotheek", "Netwerk"], "#/resources")}
      <div class="card card--wide">
        <div class="card__inner">
          <div class="card__title">
            <span>Start hier (aanbevolen)</span>
            <span class="pill">MVP</span>
          </div>
          <div class="card__subtitle">
            1) Ga naar <strong>Verenigingen</strong> en vul ‘wat speelt er?’ in. <br/>
            2) Exporteer jouw aanvullingen voor je collega (knop rechtsboven). <br/>
            3) Bewaar exports in de repo onder <code>exports/</code> (optioneel).
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
        <div class="card__subtitle">${esc(subtitle)}</div>
        <div class="card__meta">
          ${pills.map(p => `<span class="pill">${esc(p)}</span>`).join("")}
        </div>
      </div>
    </a>
  `;
}

import { esc, readLS, writeLS, toast } from "../../shared/utils.js";

const LS_MUNICIPAL = "ovt_municipal_v1";

export function meta(){
  return { title: "Gemeentelijke info", meta: "Kaders, contactpersonen en links (lokaal)" };
}

export function hydrate(state){
  state.gemeente = readLS(LS_MUNICIPAL, state.gemeente || {
    kaders: "",
    contacten: "",
    links: ""
  });
}

export function render(state){
  const g = state.gemeente || {};
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Gemeentelijke informatie</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Bewaar hier wat je collega écht nodig heeft: beleid, routes, afspraken, ‘zo werkt het hier’.</div>
        </div>
        <button class="btn" id="btnSave">Opslaan</button>
      </div>
      <div class="panel__body">
        <div class="grid">
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Kaders / spelregels</div>
            <textarea class="textarea" id="gKaders" placeholder="Bijv. subsidieproces, LSA afspraken, veiligheid, rollen…">${esc(g.kaders||"")}</textarea>
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Contacten gemeente</div>
            <textarea class="textarea" id="gContacten" placeholder="Naam • rol • e-mail • telefoon • voorkeur contactmoment…">${esc(g.contacten||"")}</textarea>
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Links / documenten</div>
            <textarea class="textarea" id="gLinks" placeholder="Plak hier links naar SharePoint, templates, beleidsstukken…">${esc(g.links||"")}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bind(state, root){
  root.querySelector("#btnSave")?.addEventListener("click", ()=>{
    state.gemeente = {
      kaders: root.querySelector("#gKaders")?.value || "",
      contacten: root.querySelector("#gContacten")?.value || "",
      links: root.querySelector("#gLinks")?.value || ""
    };
    writeLS(LS_MUNICIPAL, state.gemeente);
    toast("Gemeentelijke info opgeslagen.");
  });
}

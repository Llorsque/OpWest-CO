import { esc, readLS, writeLS, toast } from "../../shared/utils.js";

const LS_RES = "ovt_resources_v1";

export function meta(){
  return { title: "Documenten & contacten", meta: "Links, afspraken, vaste partners en tools (lokaal)" };
}

export function hydrate(state){
  state.resources = readLS(LS_RES, state.resources || {
    documenten: "",
    partners: "",
    tools: ""
  });
}

export function render(state){
  const r = state.resources || {};
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Documenten & contacten</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Alles wat ‘los’ is, maar wél cruciaal voor overdracht.</div>
        </div>
        <button class="btn" id="btnSave">Opslaan</button>
      </div>
      <div class="panel__body">
        <div class="grid">
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Documenten (links/locaties)</div>
            <textarea class="textarea" id="rDocs" placeholder="SharePoint mappen, templates, handleidingen…">${esc(r.documenten||"")}</textarea>
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Overige contacten (partners)</div>
            <textarea class="textarea" id="rPartners" placeholder="Naam • organisatie • rol • e-mail/telefoon…">${esc(r.partners||"")}</textarea>
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px;">Tools / accounts / toegang</div>
            <textarea class="textarea" id="rTools" placeholder="GitHub repo’s, accounts, toegangsroutes, wachtwoordkluizen (geen wachtwoorden plakken)…">${esc(r.tools||"")}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bind(state, root){
  root.querySelector("#btnSave")?.addEventListener("click", ()=>{
    state.resources = {
      documenten: root.querySelector("#rDocs")?.value || "",
      partners: root.querySelector("#rPartners")?.value || "",
      tools: root.querySelector("#rTools")?.value || ""
    };
    writeLS(LS_RES, state.resources);
    toast("Opgeslagen.");
  });
}

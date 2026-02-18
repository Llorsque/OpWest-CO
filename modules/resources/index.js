import { esc, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Documenten & contacten", meta: "Links, partners en tools" };
}

export function render(state){
  const r = state.resources || {};
  const admin = state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Documenten & contacten</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Alles wat cruciaal is voor overdracht maar nergens anders past.</div>
        </div>
        ${admin ? `<button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>` : ""}
      </div>
      <div class="panel__body">
        <div class="grid" style="gap:16px;">
          <div>
            <div class="label">Documenten (links/locaties)</div>
            ${admin
              ? `<textarea class="textarea" id="rDocs" placeholder="SharePoint mappen, templates, handleidingen…">${esc(r.documenten || "")}</textarea>`
              : `<div class="readblock">${esc(r.documenten || "Niet ingevuld.")}</div>`
            }
          </div>
          <div>
            <div class="label">Overige contacten (partners)</div>
            ${admin
              ? `<textarea class="textarea" id="rPartners" placeholder="Naam • organisatie • rol • e-mail/telefoon…">${esc(r.partners || "")}</textarea>`
              : `<div class="readblock">${esc(r.partners || "Niet ingevuld.")}</div>`
            }
          </div>
          <div>
            <div class="label">Tools / accounts / toegang</div>
            ${admin
              ? `<textarea class="textarea" id="rTools" placeholder="GitHub, accounts, toegangsroutes…">${esc(r.tools || "")}</textarea>`
              : `<div class="readblock">${esc(r.tools || "Niet ingevuld.")}</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bind(state, root){
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    state.resources = {
      documenten: root.querySelector("#rDocs")?.value     || "",
      partners:   root.querySelector("#rPartners")?.value || "",
      tools:      root.querySelector("#rTools")?.value    || ""
    };
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("resources.json", state.resources, "Update resources");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

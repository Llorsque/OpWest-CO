import { esc, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Gemeentelijke info", meta: "Kaders, contactpersonen en links" };
}

export function render(state){
  const g = state.gemeente || {};
  const admin = state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Gemeentelijke informatie</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Beleid, routes, afspraken — alles wat je collega nodig heeft.</div>
        </div>
        ${admin ? `<button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>` : ""}
      </div>
      <div class="panel__body">
        <div class="grid" style="gap:16px;">
          <div>
            <div class="label">Kaders / spelregels</div>
            ${admin
              ? `<textarea class="textarea" id="gKaders" placeholder="Subsidieproces, LSA afspraken, veiligheid, rollen…">${esc(g.kaders || "")}</textarea>`
              : `<div class="readblock">${esc(g.kaders || "Niet ingevuld.")}</div>`
            }
          </div>
          <div>
            <div class="label">Contacten gemeente</div>
            ${admin
              ? `<textarea class="textarea" id="gContacten" placeholder="Naam • rol • e-mail • telefoon…">${esc(g.contacten || "")}</textarea>`
              : `<div class="readblock">${esc(g.contacten || "Niet ingevuld.")}</div>`
            }
          </div>
          <div>
            <div class="label">Links / documenten</div>
            ${admin
              ? `<textarea class="textarea" id="gLinks" placeholder="SharePoint, templates, beleidsstukken…">${esc(g.links || "")}</textarea>`
              : `<div class="readblock">${esc(g.links || "Niet ingevuld.")}</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bind(state, root){
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    state.gemeente = {
      kaders:    root.querySelector("#gKaders")?.value    || "",
      contacten: root.querySelector("#gContacten")?.value || "",
      links:     root.querySelector("#gLinks")?.value     || ""
    };
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("gemeente.json", state.gemeente, "Update gemeente info");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

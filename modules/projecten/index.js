import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Lopende projecten", meta: "Status, eigenaar en deadlines" };
}

export function render(state){
  const list = state.projecten || [];
  const admin = state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Lopende projecten <span class="muted" style="font-weight:400;">(${list.length})</span></div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          ${admin ? `<button class="btn" id="btnAdd">+ Project</button>` : ""}
          ${admin ? `<button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>` : ""}
        </div>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead>
              <tr>
                <th style="width:26%;">Project</th>
                <th style="width:12%;">Status</th>
                <th style="width:16%;">Eigenaar</th>
                <th style="width:14%;">Deadline</th>
                <th>Notitie</th>
                ${admin ? `<th style="width:9%;">Actie</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${list.map(p => `
                <tr>
                  <td><strong>${esc(p.naam || "")}</strong></td>
                  <td><span class="pill pill--status pill--${p.status === "Afgerond" ? "done" : p.status === "Lopend" ? "active" : "default"}">${esc(p.status || "")}</span></td>
                  <td>${esc(p.eigenaar || "")}</td>
                  <td>${esc(p.deadline || "")}</td>
                  <td style="font-size:12px;">${esc(p.notitie || "")}</td>
                  ${admin ? `<td><button class="btn btn--ghost" data-del="${esc(p.id)}">Verwijder</button></td>` : ""}
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen projecten.${admin ? " Klik op + Project." : ""}</div>`}
      </div>
    </div>
    ${state.ui.showAddProject ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", () => {
    state.ui.showAddProject = true;
    state.rerender();
  });
  root.querySelector("#btnCancelProject")?.addEventListener("click", () => {
    state.ui.showAddProject = false;
    state.rerender();
  });
  root.querySelector("#btnCreateProject")?.addEventListener("click", () => {
    const naam = root.querySelector("#pNaam")?.value?.trim();
    if(!naam){ toast("Projectnaam is verplicht."); return; }
    state.projecten.unshift({
      id: uid("prj"),
      naam,
      status:   root.querySelector("#pStatus")?.value?.trim()   || "Open",
      eigenaar: root.querySelector("#pEigenaar")?.value?.trim() || "",
      deadline: root.querySelector("#pDeadline")?.value          || "",
      notitie:  root.querySelector("#pNotitie")?.value?.trim()  || ""
    });
    state.ui.showAddProject = false;
    toast("Project toegevoegd. Klik Opslaan naar GitHub.");
    state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn => {
    btn.addEventListener("click", () => {
      state.projecten = state.projecten.filter(p => p.id !== btn.getAttribute("data-del"));
      toast("Project verwijderd. Klik Opslaan naar GitHub.");
      state.rerender();
    });
  });
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("projecten.json", state.projecten, "Update projecten");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;border-color:rgba(82,232,232,0.2);">
      <div class="panel__header">
        <div class="panel__title">Nieuw project</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelProject">Annuleren</button>
          <button class="btn" id="btnCreateProject">Opslaan</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="pNaam" placeholder="Projectnaam *" />
          <input class="input" id="pStatus" placeholder="Status (Open / Lopend / Afgerond)" />
          <input class="input" id="pEigenaar" placeholder="Eigenaar" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="pDeadline" type="date" />
        </div>
        <div style="margin-top:10px;">
          <textarea class="textarea" id="pNotitie" placeholder="Korte notitie"></textarea>
        </div>
      </div>
    </div>
  `;
}

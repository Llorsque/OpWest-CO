import { esc, uid, toast, readLS, writeLS } from "../../shared/utils.js";

const LS_PROJECTS = "ovt_projects_v1";

export function meta(){
  return { title: "Lopende projecten", meta: "Mini-tracker: status, eigenaar en deadline (lokaal)" };
}

export function hydrate(state){
  state.projecten = readLS(LS_PROJECTS, state.projecten || []);
}

export function render(state){
  const list = state.projecten || [];
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Lopende projecten</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">Alles lokaal. Export om te delen.</div>
        </div>
        <button class="btn" id="btnAdd">+ Project</button>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead>
              <tr>
                <th style="width:28%;">Project</th>
                <th style="width:14%;">Status</th>
                <th style="width:18%;">Eigenaar</th>
                <th style="width:16%;">Deadline</th>
                <th>Notitie</th>
                <th style="width:9%;">Actie</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(p => `
                <tr>
                  <td><strong>${esc(p.naam||"")}</strong></td>
                  <td>${esc(p.status||"")}</td>
                  <td>${esc(p.eigenaar||"")}</td>
                  <td>${esc(p.deadline||"")}</td>
                  <td>${esc(p.notitie||"")}</td>
                  <td><button class="btn btn--ghost" data-del="${esc(p.id)}">Verwijder</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen projecten. Klik op + Project.</div>`}
      </div>
    </div>

    ${state.ui.showAddProject ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", ()=>{
    state.ui.showAddProject = true;
    state.rerender();
  });

  root.querySelector("#btnCancelProject")?.addEventListener("click", ()=>{
    state.ui.showAddProject = false;
    state.rerender();
  });

  root.querySelector("#btnCreateProject")?.addEventListener("click", ()=>{
    const naam = root.querySelector("#pNaam")?.value?.trim();
    if(!naam){ toast("Projectnaam is verplicht."); return; }
    const p = {
      id: uid("prj"),
      naam,
      status: root.querySelector("#pStatus")?.value?.trim() || "Open",
      eigenaar: root.querySelector("#pEigenaar")?.value?.trim() || "",
      deadline: root.querySelector("#pDeadline")?.value || "",
      notitie: root.querySelector("#pNotitie")?.value?.trim() || ""
    };
    state.projecten = [p, ...(state.projecten||[])];
    writeLS(LS_PROJECTS, state.projecten);
    toast("Project toegevoegd.");
    state.ui.showAddProject = false;
    state.rerender();
  });

  root.querySelectorAll("[data-del]")?.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      state.projecten = (state.projecten||[]).filter(p=>p.id!==id);
      writeLS(LS_PROJECTS, state.projecten);
      toast("Project verwijderd.");
      state.rerender();
    });
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;">
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

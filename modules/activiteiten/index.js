import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){
  return { title: "Activiteitenplan", meta: "Activiteiten, thema, impact en partners" };
}

export function render(state){
  const list = state.activiteiten || [];
  const admin = state.isAdmin;
  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">Activiteitenplan <span class="muted" style="font-weight:400;">(${list.length})</span></div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          ${admin ? `<button class="btn" id="btnAdd">+ Activiteit</button>` : ""}
          ${admin ? `<button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>` : ""}
        </div>
      </div>
      <div class="panel__body">
        ${list.length ? `
          <table class="table">
            <thead><tr>
              <th style="width:26%;">Activiteit</th>
              <th style="width:16%;">Thema</th>
              <th style="width:16%;">Impact</th>
              <th style="width:14%;">Status</th>
              <th>Partners</th>
              ${admin ? `<th style="width:9%;">Actie</th>` : ""}
            </tr></thead>
            <tbody>
              ${list.map(a => `
                <tr>
                  <td><strong>${esc(a.titel || "")}</strong></td>
                  <td>${esc(a.thema || "")}</td>
                  <td>${esc(a.impact || "")}</td>
                  <td><span class="pill pill--status pill--${a.status === "Afgerond" ? "done" : a.status === "Lopend" ? "active" : "default"}">${esc(a.status || "")}</span></td>
                  <td style="font-size:12px;">${esc(a.partners || "")}</td>
                  ${admin ? `<td><button class="btn btn--ghost" data-del="${esc(a.id)}">Verwijder</button></td>` : ""}
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : `<div class="muted" style="font-size:13px;">Nog geen activiteiten.${admin ? " Klik op + Activiteit." : ""}</div>`}
      </div>
    </div>
    ${state.ui.showAddAct ? addForm() : ""}
  `;
}

export function bind(state, root){
  root.querySelector("#btnAdd")?.addEventListener("click", () => { state.ui.showAddAct = true; state.rerender(); });
  root.querySelector("#btnCancelAct")?.addEventListener("click", () => { state.ui.showAddAct = false; state.rerender(); });
  root.querySelector("#btnCreateAct")?.addEventListener("click", () => {
    const titel = root.querySelector("#aTitel")?.value?.trim();
    if(!titel){ toast("Titel is verplicht."); return; }
    state.activiteiten.unshift({
      id: uid("act"),
      titel,
      thema:    root.querySelector("#aThema")?.value?.trim()    || "",
      impact:   root.querySelector("#aImpact")?.value?.trim()   || "",
      status:   root.querySelector("#aStatus")?.value?.trim()   || "Gepland",
      partners: root.querySelector("#aPartners")?.value?.trim() || ""
    });
    state.ui.showAddAct = false;
    toast("Activiteit toegevoegd. Klik Opslaan naar GitHub.");
    state.rerender();
  });
  root.querySelectorAll("[data-del]")?.forEach(btn => {
    btn.addEventListener("click", () => {
      state.activiteiten = state.activiteiten.filter(x => x.id !== btn.getAttribute("data-del"));
      toast("Activiteit verwijderd. Klik Opslaan naar GitHub.");
      state.rerender();
    });
  });
  root.querySelector("#btnSaveGitHub")?.addEventListener("click", async () => {
    const btn = root.querySelector("#btnSaveGitHub");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("activiteiten.json", state.activiteiten, "Update activiteiten");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

function addForm(){
  return `
    <div class="panel" style="margin-top:14px;border-color:rgba(82,232,232,0.2);">
      <div class="panel__header">
        <div class="panel__title">Nieuwe activiteit</div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn--ghost" id="btnCancelAct">Annuleren</button>
          <button class="btn" id="btnCreateAct">Opslaan</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="row">
          <input class="input" id="aTitel" placeholder="Titel *" />
          <input class="input" id="aThema" placeholder="Thema" />
          <input class="input" id="aImpact" placeholder="Impact (Sociaal / Gezondheid / etc.)" />
        </div>
        <div class="row" style="margin-top:10px;">
          <input class="input" id="aStatus" placeholder="Status (Gepland / Lopend / Afgerond)" />
          <input class="input" id="aPartners" placeholder="Partners" />
        </div>
      </div>
    </div>
  `;
}

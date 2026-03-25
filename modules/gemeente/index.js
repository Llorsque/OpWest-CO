import { esc, toast, formatDate } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){ return { title:"Gemeente overzicht", meta:"Cockpit: wat speelt er in de gemeente?" }; }

export function render(state){
  const admin = state.isAdmin;
  const g = state.gemeente || {};

  // Bereken statistieken
  const totalClubs = state.verenigingen.length;
  const totalTrajecten = state.trajecten.length;
  const trajectenActief = state.trajecten.filter(t => t.status === "Lopend" || t.status === "Intake").length;
  const totalActies = (state.acties || []).length;
  const actiesOpen = (state.acties || []).filter(a => a.type === "actie" && a.status === "Open").length;
  const actiesLopend = (state.acties || []).filter(a => a.type === "actie" && a.status === "Lopend").length;
  const projectenOpen = state.projecten.filter(p => p.status !== "Afgerond").length;
  const aankomendItems = state.aankomend.length;

  // Recente acties (laatste 10)
  const recenteActies = (state.acties || [])
    .slice()
    .sort((a, b) => (b.datum || "").localeCompare(a.datum || ""))
    .slice(0, 10);

  // Aankomende zaken (gesorteerd op datum, toekomst eerst)
  const aankomend = (state.aankomend || [])
    .slice()
    .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""))
    .slice(0, 5);

  // Clubs per sport
  const sportCount = {};
  state.verenigingen.forEach(v => {
    const s = v.sport || "Onbekend";
    sportCount[s] = (sportCount[s] || 0) + 1;
  });
  const sportEntries = Object.entries(sportCount).sort((a, b) => b[1] - a[1]);

  // Clubs per gemeente
  const gemCount = {};
  state.verenigingen.forEach(v => {
    const g = v.gemeente || "Onbekend";
    gemCount[g] = (gemCount[g] || 0) + 1;
  });
  const gemEntries = Object.entries(gemCount).sort((a, b) => b[1] - a[1]);

  return `
    <!-- Dashboard tegels -->
    <div class="dash-grid">
      ${dashTile("👥", "Verenigingen", totalClubs, "clubs geregistreerd", "#/verenigingen")}
      ${dashTile("🎯", "Trajecten actief", trajectenActief, `van ${totalTrajecten} totaal`, "#/trajecten")}
      ${dashTile("⚡", "Acties open", actiesOpen + actiesLopend, `${actiesOpen} open, ${actiesLopend} lopend`, "#/verenigingen")}
      ${dashTile("🧩", "Projecten", projectenOpen, `openstaand van ${state.projecten.length}`, "#/projecten")}
      ${dashTile("🗓️", "Aankomend", aankomendItems, "items gepland", "#/aankomend")}
      ${dashTile("📌", "Activiteiten", state.activiteiten.length, "in het plan", "#/activiteiten")}
    </div>

    <div class="split" style="margin-top:14px;">
      <!-- Linker kolom: recente activiteit + verdeling -->
      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Recente activiteit -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Recente activiteit</div></div>
          <div class="panel__body">
            ${recenteActies.length ? recenteActies.map(a => {
              const club = state.verenigingen.find(v => v.id === a.verenigingId);
              return `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);align-items:flex-start;">
                <div style="font-size:11px;color:var(--accent);min-width:72px;">${formatDate(a.datum)}</div>
                <div style="font-size:12px;flex:1;">
                  <strong>${esc(club?.naam || "Onbekend")}</strong> —
                  ${a.type === "actie" ? `Actie: ${esc(a.titel)} <span class="pill pill--status pill--${a.status==="Afgerond"?"done":a.status==="Lopend"?"active":"default"}" style="font-size:10px;">${esc(a.status)}</span>` : esc(a.tekst)}
                </div>
              </div>`;
            }).join("") : `<div class="muted" style="font-size:13px;">Nog geen recente activiteit.</div>`}
          </div>
        </div>

        <!-- Verdeling per sport -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Clubs per sport</div></div>
          <div class="panel__body">
            ${sportEntries.length ? `<div class="bar-chart">${sportEntries.map(([sport, count]) => {
              const pct = Math.round((count / totalClubs) * 100);
              return `<div class="bar-row">
                <div class="bar-label">${esc(sport)}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
                <div class="bar-val">${count}</div>
              </div>`;
            }).join("")}</div>` : ""}
          </div>
        </div>

        <!-- Verdeling per gemeente -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Clubs per gemeente</div></div>
          <div class="panel__body">
            ${gemEntries.length ? `<div class="bar-chart">${gemEntries.map(([gem, count]) => {
              const pct = Math.round((count / totalClubs) * 100);
              return `<div class="bar-row">
                <div class="bar-label">${esc(gem)}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
                <div class="bar-val">${count}</div>
              </div>`;
            }).join("")}</div>` : ""}
          </div>
        </div>
      </div>

      <!-- Rechter kolom: aankomende zaken + vrije tekstvelden -->
      <div style="display:flex;flex-direction:column;gap:14px;">
        <!-- Aankomende zaken preview -->
        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Eerstvolgende afspraken</div>
            <a href="#/aankomend" class="btn btn--ghost" style="font-size:11px;padding:6px 10px;">Alles bekijken</a>
          </div>
          <div class="panel__body">
            ${aankomend.length ? aankomend.map(x => `
              <div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);">
                <div style="font-size:11px;color:var(--accent);min-width:72px;">${formatDate(x.datum)}</div>
                <div style="font-size:12px;flex:1;"><strong>${esc(x.titel)}</strong>${x.betrokken ? ` — ${esc(x.betrokken)}` : ""}</div>
              </div>
            `).join("") : `<div class="muted" style="font-size:13px;">Geen aankomende zaken.</div>`}
          </div>
        </div>

        <!-- Kaders / spelregels -->
        <div class="panel">
          <div class="panel__header">
            <div class="panel__title">Kaders & spelregels</div>
            ${admin ? `<button class="btn btn--save" id="btnSaveGem">Opslaan naar GitHub</button>` : ""}
          </div>
          <div class="panel__body">
            ${admin
              ? `<textarea class="textarea" id="gKaders" placeholder="Subsidieproces, LSA afspraken, rollen, beleid…">${esc(g.kaders || "")}</textarea>`
              : `<div class="readblock">${esc(g.kaders || "Niet ingevuld.")}</div>`}
          </div>
        </div>

        <!-- Gemeente contacten -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Contacten gemeente</div></div>
          <div class="panel__body">
            ${admin
              ? `<textarea class="textarea" id="gContacten" placeholder="Naam • rol • e-mail • telefoon…">${esc(g.contacten || "")}</textarea>`
              : `<div class="readblock">${esc(g.contacten || "Niet ingevuld.")}</div>`}
          </div>
        </div>

        <!-- Links -->
        <div class="panel">
          <div class="panel__header"><div class="panel__title">Links & documenten</div></div>
          <div class="panel__body">
            ${admin
              ? `<textarea class="textarea" id="gLinks" placeholder="SharePoint, templates, beleidsstukken…">${esc(g.links || "")}</textarea>`
              : `<div class="readblock">${esc(g.links || "Niet ingevuld.")}</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

export function bind(state, root){
  root.querySelector("#btnSaveGem")?.addEventListener("click", async () => {
    state.gemeente = {
      kaders:    root.querySelector("#gKaders")?.value    || "",
      contacten: root.querySelector("#gContacten")?.value || "",
      links:     root.querySelector("#gLinks")?.value     || ""
    };
    const btn = root.querySelector("#btnSaveGem");
    btn.disabled = true; btn.textContent = "Bezig…";
    try {
      await saveData("gemeente.json", state.gemeente, "Update gemeente info");
      toast("✓ Opgeslagen naar GitHub!");
    } catch(e){ toast("✗ Fout: " + e.message); }
    btn.disabled = false; btn.textContent = "Opslaan naar GitHub";
  });
}

function dashTile(icon, label, value, sub, href){
  return `<a class="dash-tile" href="${href}">
    <div class="dash-tile__icon">${icon}</div>
    <div class="dash-tile__value">${value}</div>
    <div class="dash-tile__label">${esc(label)}</div>
    <div class="dash-tile__sub">${esc(sub)}</div>
  </a>`;
}

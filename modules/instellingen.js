import { esc, toast } from "../shared/utils.js";
import { getConfig, setConfig, clearConfig, validateToken, isAdmin } from "../shared/github.js";

export function meta(){
  return { title: "Instellingen", meta: "GitHub-koppeling en admin-toegang" };
}

function updateBadge(state){
  state.isAdmin = isAdmin();
  const el = document.querySelector("#adminBadge");
  if(!el) return;
  if(state.isAdmin){
    el.innerHTML = `<div class="chip chip--admin"><span class="chip__dot chip__dot--green"></span><span class="chip__text">Admin (bewerkbaar)</span></div>`;
  } else {
    el.innerHTML = `<div class="chip"><span class="chip__dot"></span><span class="chip__text">Alleen-lezen</span></div>`;
  }
}

export function render(state){
  const cfg = getConfig();
  const admin = isAdmin();

  return `
    <div class="panel">
      <div class="panel__header">
        <div>
          <div class="panel__title">GitHub-koppeling</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">
            Vul je GitHub-gegevens in om data te kunnen bewerken en opslaan. Zonder token is de tool alleen-lezen.
          </div>
        </div>
      </div>
      <div class="panel__body">
        <div class="grid" style="gap:14px;">
          <div>
            <label class="label">Repository (eigenaar/naam)</label>
            <input class="input" id="cfgRepo" placeholder="bijv. jouw-username/OpWest-CO" value="${esc(cfg.repo)}" />
            <div class="muted" style="font-size:11px;margin-top:4px;">Exact zoals het in de URL staat: github.com/<strong>eigenaar/repo</strong></div>
          </div>
          <div>
            <label class="label">Branch</label>
            <input class="input" id="cfgBranch" placeholder="main" value="${esc(cfg.branch || "main")}" />
          </div>
          <div>
            <label class="label">Personal Access Token</label>
            <input class="input" id="cfgToken" type="password" placeholder="ghp_xxxxxxxxxxxx" value="${esc(cfg.token)}" />
            <div class="muted" style="font-size:11px;margin-top:4px;">
              Maak een token aan via <a href="https://github.com/settings/tokens" target="_blank" style="color:var(--accent);">github.com/settings/tokens</a> →
              <strong>Fine-grained token</strong> → selecteer je repo → permissie <strong>Contents: Read and write</strong>.
            </div>
          </div>
          <div class="row" style="gap:10px;">
            <button class="btn" id="btnSaveCfg">Opslaan</button>
            <button class="btn btn--ghost" id="btnTestCfg">Test verbinding</button>
            ${admin ? `<button class="btn btn--ghost btn--danger" id="btnClearCfg">Verwijder koppeling</button>` : ""}
          </div>
          <div id="testResult"></div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel__header">
        <div class="panel__title">Hoe werkt het?</div>
      </div>
      <div class="panel__body">
        <div class="muted" style="font-size:13px;line-height:1.6;">
          <strong>Admin (jij):</strong> Na het invullen van de GitHub-gegevens kun je data bewerken.
          Als je op <em>Opslaan</em> klikt, wordt de data direct naar je GitHub-repo gecommit.
          GitHub Pages herlaadt automatisch (duurt ~30 sec). <br/><br/>
          <strong>Collega (alleen-lezen):</strong> Opent dezelfde GitHub Pages URL en ziet altijd de laatste versie.
          Geen token nodig, geen setup. Gewoon openen en lezen.
        </div>
      </div>
    </div>
  `;
}

export function bind(state, root){
  root.querySelector("#btnSaveCfg")?.addEventListener("click", () => {
    setConfig({
      repo:   root.querySelector("#cfgRepo")?.value   || "",
      branch: root.querySelector("#cfgBranch")?.value  || "main",
      token:  root.querySelector("#cfgToken")?.value   || ""
    });
    state.isAdmin = isAdmin();
    updateBadge(state);
    toast("Instellingen opgeslagen.");
  });

  root.querySelector("#btnTestCfg")?.addEventListener("click", async () => {
    // Save first
    setConfig({
      repo:   root.querySelector("#cfgRepo")?.value   || "",
      branch: root.querySelector("#cfgBranch")?.value  || "main",
      token:  root.querySelector("#cfgToken")?.value   || ""
    });
    state.isAdmin = isAdmin();
    updateBadge(state);

    const el = root.querySelector("#testResult");
    el.innerHTML = `<div class="muted" style="font-size:13px;">Testen…</div>`;
    const result = await validateToken();
    if(result.ok){
      el.innerHTML = `<div style="color:#4ade80;font-size:13px;">✓ Verbonden met <strong>${esc(result.repoName)}</strong>. Push-rechten: ${result.permissions?.push ? "Ja" : "Nee"}.</div>`;
    } else {
      el.innerHTML = `<div style="color:#f87171;font-size:13px;">✗ Fout: ${esc(result.error)}</div>`;
    }
  });

  root.querySelector("#btnClearCfg")?.addEventListener("click", () => {
    clearConfig();
    state.isAdmin = false;
    updateBadge(state);
    toast("Koppeling verwijderd.");
    state.rerender();
  });
}

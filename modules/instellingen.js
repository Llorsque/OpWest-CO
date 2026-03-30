import { esc, toast, uid } from "../shared/utils.js";
import { getConfig, setConfig, clearConfig, validateToken, isAdmin, saveData } from "../shared/github.js";

export function meta(){ return { title:"Instellingen", meta:"GitHub, gebruikers en configuratie" }; }

export function render(state){
  const cfg=getConfig(); const admin=isAdmin();
  const s = state.settings||{};
  const accounts = s.accounts||[];
  const types = s.trajectTypes||[];
  const themas = s.themas||[];
  const bronnen = s.subsidiebronnen||[];
  const progOpties = s.programmaOpties||[];

  return `
    <!-- GitHub koppeling -->
    <div class="panel"><div class="panel__header"><div class="panel__title">GitHub-koppeling</div></div>
    <div class="panel__body"><div class="grid" style="gap:12px;">
      <div class="row"><div style="flex:1;"><label class="label">Repository (eigenaar/naam)</label><input class="input" id="cfgRepo" placeholder="username/OpWest-CO" value="${esc(cfg.repo)}"/></div>
        <div style="flex:0 0 140px;"><label class="label">Branch</label><input class="input" id="cfgBranch" placeholder="main" value="${esc(cfg.branch||"main")}"/></div></div>
      <div><label class="label">Personal Access Token</label><input class="input" id="cfgToken" type="password" placeholder="ghp_xxxxxxxxxxxx" value="${esc(cfg.token)}"/></div>
      <div class="row" style="gap:8px;"><button class="btn" id="btnSaveCfg">Opslaan</button><button class="btn btn--ghost" id="btnTestCfg">Test verbinding</button>
        ${admin?`<button class="btn btn--danger" id="btnClearCfg">Verwijder koppeling</button>`:""}</div>
      <div id="testResult"></div>
    </div></div></div>

    <!-- Gebruikersbeheer -->
    <div class="panel" style="margin-top:16px;"><div class="panel__header"><div class="panel__title">Gebruikers</div>
      <button class="btn" id="btnAddUser">+ Gebruiker</button></div>
    <div class="panel__body" style="padding:0;">
      <table class="table"><thead><tr><th>Login</th><th>Naam</th><th>Wachtwoord</th><th>Rol</th><th style="width:4%;"></th></tr></thead>
      <tbody>
        ${accounts.map((a,i)=>`<tr>
          <td><input class="input" data-user="${i}" data-f="login" value="${esc(a.login)}" style="min-width:100px;"/></td>
          <td><input class="input" data-user="${i}" data-f="naam" value="${esc(a.naam)}" style="min-width:100px;"/></td>
          <td><input class="input" data-user="${i}" data-f="password" value="${esc(a.password)}" style="min-width:100px;"/></td>
          <td><select class="input" data-user="${i}" data-f="role" style="min-width:100px;">
            <option value="admin" ${a.role==="admin"?"selected":""}>Admin</option>
            <option value="viewer" ${a.role==="viewer"?"selected":""}>Viewer</option>
          </select></td>
          <td><button class="btn--icon-del" data-del-user="${i}" title="Verwijder">x</button></td>
        </tr>`).join("")}
      </tbody></table>
    </div></div>

    <!-- Traject-types -->
    <div class="panel" style="margin-top:16px;"><div class="panel__header"><div class="panel__title">Traject-types</div>
      <button class="btn" id="btnAddType">+ Type</button></div>
    <div class="panel__body">
      <div class="tag-list" id="typeList">
        ${types.map((t,i)=>`<div class="tag-item">
          <input class="input tag-input" data-type-idx="${i}" value="${esc(t)}"/>
          <button class="btn--icon-del" data-del-type="${i}">x</button>
        </div>`).join("")}
        ${!types.length?`<div class="muted" style="font-size:13px;">Geen types. Klik + Type om toe te voegen.</div>`:""}
      </div>
    </div></div>

    <!-- Thema's -->
    <div class="panel" style="margin-top:16px;"><div class="panel__header"><div class="panel__title">Thema's (CO)</div>
      <button class="btn" id="btnAddThema">+ Thema</button></div>
    <div class="panel__body">
      <div class="tag-list" id="themaList">
        ${themas.map((t,i)=>`<div class="tag-item">
          <input class="input tag-input" data-thema-idx="${i}" value="${esc(t)}"/>
          <button class="btn--icon-del" data-del-thema="${i}">x</button>
        </div>`).join("")}
        ${!themas.length?`<div class="muted" style="font-size:13px;">Geen thema's. Klik + Thema om toe te voegen.</div>`:""}
      </div>
    </div></div>

    <!-- Subsidiebronnen -->
    <div class="panel" style="margin-top:16px;"><div class="panel__header"><div class="panel__title">Subsidiebronnen</div>
      <button class="btn" id="btnAddBronOptie">+ Bron</button></div>
    <div class="panel__body">
      <div class="tag-list" id="bronList">
        ${bronnen.map((t,i)=>`<div class="tag-item">
          <input class="input tag-input" data-bron-optie-idx="${i}" value="${esc(t)}"/>
          <button class="btn--icon-del" data-del-bron-optie="${i}">x</button>
        </div>`).join("")}
        ${!bronnen.length?`<div class="muted" style="font-size:13px;">Geen bronnen. Klik + Bron.</div>`:""}
      </div>
    </div></div>

    <!-- Programma-opties -->
    <div class="panel" style="margin-top:16px;"><div class="panel__header"><div class="panel__title">Programma-opties (trajecten)</div>
      <button class="btn" id="btnAddProg">+ Optie</button></div>
    <div class="panel__body">
      <div class="tag-list" id="progList">
        ${progOpties.map((t,i)=>`<div class="tag-item">
          <input class="input tag-input" data-prog-idx="${i}" value="${esc(t)}"/>
          <button class="btn--icon-del" data-del-prog="${i}">x</button>
        </div>`).join("")}
        ${!progOpties.length?`<div class="muted" style="font-size:13px;">Geen opties. Klik + Optie.</div>`:""}
      </div>
    </div></div>

    <!-- Save settings -->
    <div class="toolbar" style="margin-top:16px;justify-content:flex-end;">
      <button class="btn btn--save" id="btnSaveSettings">Instellingen opslaan naar GitHub</button>
    </div>
  `;
}

export function bind(state,root){
  // GitHub config
  root.querySelector("#btnSaveCfg")?.addEventListener("click",()=>{
    setConfig({repo:root.querySelector("#cfgRepo")?.value||"",branch:root.querySelector("#cfgBranch")?.value||"main",token:root.querySelector("#cfgToken")?.value||""});
    state.isAdmin=isAdmin(); toast("GitHub-koppeling opgeslagen.");
  });
  root.querySelector("#btnTestCfg")?.addEventListener("click",async()=>{
    setConfig({repo:root.querySelector("#cfgRepo")?.value||"",branch:root.querySelector("#cfgBranch")?.value||"main",token:root.querySelector("#cfgToken")?.value||""});
    state.isAdmin=isAdmin();
    const el=root.querySelector("#testResult"); el.innerHTML=`<div class="muted">Testen...</div>`;
    const r=await validateToken();
    if(r.ok)el.innerHTML=`<div style="color:var(--green);font-size:13px;">Verbonden met <strong>${esc(r.repoName)}</strong>. Push: ${r.permissions?.push?"Ja":"Nee"}.</div>`;
    else el.innerHTML=`<div style="color:var(--red);font-size:13px;">Fout: ${esc(r.error)}</div>`;
  });
  root.querySelector("#btnClearCfg")?.addEventListener("click",()=>{clearConfig();state.isAdmin=false;toast("Koppeling verwijderd.");state.rerender();});

  // Add user
  root.querySelector("#btnAddUser")?.addEventListener("click",()=>{
    state.settings.accounts=state.settings.accounts||[];
    state.settings.accounts.push({login:"",naam:"",password:"",role:"viewer"});
    state.rerender();
  });
  // Delete user
  root.querySelectorAll("[data-del-user]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx=Number(btn.getAttribute("data-del-user"));
      state.settings.accounts.splice(idx,1);
      state.rerender();
    });
  });

  // Add type
  root.querySelector("#btnAddType")?.addEventListener("click",()=>{
    state.settings.trajectTypes=state.settings.trajectTypes||[];
    state.settings.trajectTypes.push("Nieuw type");
    state.rerender();
  });
  // Delete type
  root.querySelectorAll("[data-del-type]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx=Number(btn.getAttribute("data-del-type"));
      state.settings.trajectTypes.splice(idx,1);
      state.rerender();
    });
  });

  // Add thema
  root.querySelector("#btnAddThema")?.addEventListener("click",()=>{
    state.settings.themas=state.settings.themas||[];
    state.settings.themas.push("Nieuw thema");
    state.rerender();
  });
  // Delete thema
  root.querySelectorAll("[data-del-thema]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx=Number(btn.getAttribute("data-del-thema"));
      state.settings.themas.splice(idx,1);
      state.rerender();
    });
  });

  // Add subsidiebron
  root.querySelector("#btnAddBronOptie")?.addEventListener("click",()=>{
    state.settings.subsidiebronnen=state.settings.subsidiebronnen||[];
    state.settings.subsidiebronnen.push("Nieuwe bron");
    state.rerender();
  });
  // Delete subsidiebron
  root.querySelectorAll("[data-del-bron-optie]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx=Number(btn.getAttribute("data-del-bron-optie"));
      state.settings.subsidiebronnen.splice(idx,1);
      state.rerender();
    });
  });

  // Add programma optie
  root.querySelector("#btnAddProg")?.addEventListener("click",()=>{
    state.settings.programmaOpties=state.settings.programmaOpties||[];
    state.settings.programmaOpties.push("Nieuwe optie");
    state.rerender();
  });
  // Delete programma optie
  root.querySelectorAll("[data-del-prog]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx=Number(btn.getAttribute("data-del-prog"));
      state.settings.programmaOpties.splice(idx,1);
      state.rerender();
    });
  });

  // SAVE ALL SETTINGS
  root.querySelector("#btnSaveSettings")?.addEventListener("click",async()=>{
    // Read current values from inputs
    const accounts=[];
    const userRows=root.querySelectorAll("[data-user]");
    const userMap={};
    userRows.forEach(input=>{
      const i=Number(input.getAttribute("data-user"));
      const f=input.getAttribute("data-f");
      if(!userMap[i])userMap[i]={};
      userMap[i][f]=input.value?.trim()||"";
    });
    Object.values(userMap).forEach(u=>{
      if(u.login)accounts.push({login:u.login,naam:u.naam||u.login,password:u.password||"",role:u.role||"viewer"});
    });

    const types=[];
    root.querySelectorAll("[data-type-idx]")?.forEach(input=>{
      const v=input.value?.trim(); if(v)types.push(v);
    });

    const themas=[];
    root.querySelectorAll("[data-thema-idx]")?.forEach(input=>{
      const v=input.value?.trim(); if(v)themas.push(v);
    });

    const subsidiebronnen=[];
    root.querySelectorAll("[data-bron-optie-idx]")?.forEach(input=>{
      const v=input.value?.trim(); if(v)subsidiebronnen.push(v);
    });

    const programmaOpties=[];
    root.querySelectorAll("[data-prog-idx]")?.forEach(input=>{
      const v=input.value?.trim(); if(v)programmaOpties.push(v);
    });

    state.settings={accounts,trajectTypes:types,themas,subsidiebronnen,programmaOpties};

    const btn=root.querySelector("#btnSaveSettings");
    btn.disabled=true; btn.textContent="Bezig...";
    try{
      await saveData("settings.json",state.settings,"Update settings");
      toast("Instellingen opgeslagen! Herlaad de pagina om wijzigingen te activeren.");
    }catch(e){toast("Fout: "+e.message);}
    btn.disabled=false; btn.textContent="Instellingen opslaan naar GitHub";
  });
}

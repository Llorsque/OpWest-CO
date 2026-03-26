import { esc, uid, toast } from "../../shared/utils.js";
import { saveData } from "../../shared/github.js";

export function meta(){ return { title:"Activiteitenplan", meta:"Doelen, voortgang en realisatie" }; }

export function render(state){
  const list=state.activiteiten||[]; const admin=state.isAdmin;

  // Calculate overall progress
  const total=list.length;
  const done=list.filter(a=>a.voortgang>=100).length;
  const avgProgress=total?Math.round(list.reduce((s,a)=>s+(a.voortgang||0),0)/total):0;

  return `
    ${admin?`<div class="toolbar">
      <button class="btn" id="btnAdd">+ Doel toevoegen</button>
      <button class="btn btn--save" id="btnSaveGitHub">Opslaan naar GitHub</button>
    </div>`:""}

    <!-- Voortgang overzicht -->
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel__header"><div class="panel__title">Voortgang activiteitenplan</div></div>
      <div class="panel__body">
        <div class="row" style="gap:20px;align-items:center;">
          <div style="text-align:center;min-width:80px;">
            <div style="font-size:36px;font-weight:700;color:var(--accent);font-family:var(--font-display);">${avgProgress}%</div>
            <div class="muted" style="font-size:11px;">Gemiddeld</div>
          </div>
          <div style="flex:1;">
            <div class="progress-track"><div class="progress-fill" style="width:${avgProgress}%;"></div></div>
          </div>
          <div style="text-align:center;min-width:80px;">
            <div style="font-size:20px;font-weight:700;color:var(--green);">${done}/${total}</div>
            <div class="muted" style="font-size:11px;">Afgerond</div>
          </div>
        </div>
      </div>
    </div>

    ${state.ui.showAddAct?`
    <div class="panel" style="margin-bottom:16px;border-color:var(--accent);">
      <div class="panel__header"><div class="panel__title">Nieuw doel</div>
        <div class="row" style="gap:6px;"><button class="btn btn--ghost" id="btnCancelAct">Annuleren</button><button class="btn btn--save" id="btnCreateAct">Toevoegen</button></div></div>
      <div class="panel__body">
        <div class="row"><input class="input" id="aTitel" placeholder="Doel / activiteit *" autofocus style="flex:2;"/><input class="input" id="aThema" placeholder="Thema"/></div>
        <div class="row" style="margin-top:8px;">
          <input class="input" id="aImpact" placeholder="Beoogde impact"/>
          <input class="input" id="aPartners" placeholder="Partners"/>
          <input class="input" id="aVoortgang" type="number" min="0" max="100" placeholder="Voortgang %" value="0" style="flex:0 0 120px;"/>
        </div>
        <textarea class="textarea" id="aToelichting" placeholder="Toelichting / omschrijving" style="margin-top:8px;min-height:50px;"></textarea>
      </div>
    </div>`:""}

    <!-- Doelen lijst -->
    <div class="panel">
      <div class="panel__header"><div class="panel__title">Doelen <span class="muted" style="font-weight:400;">(${total})</span></div></div>
      <div class="panel__body" style="padding:0;">
        ${list.length?`<table class="table">
          <thead><tr>
            <th style="width:25%;">Doel</th><th style="width:14%;">Thema</th><th style="width:14%;">Impact</th>
            <th style="width:14%;">Partners</th><th style="width:18%;">Voortgang</th>
            ${admin?`<th style="width:4%;"></th>`:""}
          </tr></thead>
          <tbody>${list.map((a,i)=>{
            const pct=a.voortgang||0;
            const color=pct>=100?"var(--green)":pct>=50?"var(--accent)":"var(--muted)";
            return `<tr>
              <td><strong>${esc(a.titel)}</strong>${a.toelichting?`<div class="muted" style="font-size:11px;margin-top:2px;">${esc(a.toelichting).slice(0,80)}${a.toelichting.length>80?"…":""}</div>`:""}</td>
              <td>${esc(a.thema||"")}</td>
              <td style="font-size:12px;">${esc(a.impact||"")}</td>
              <td style="font-size:12px;">${esc(a.partners||"")}</td>
              <td>
                <div class="row" style="gap:8px;flex-wrap:nowrap;">
                  ${admin?`<input class="input" type="range" min="0" max="100" value="${pct}" data-progress="${i}" style="flex:1;min-width:80px;padding:0;"/>`
                    :`<div class="progress-track" style="flex:1;height:8px;"><div class="progress-fill" style="width:${pct}%;"></div></div>`}
                  <span style="font-size:12px;font-weight:600;color:${color};min-width:36px;text-align:right;" ${admin?`data-progress-label="${i}"`:""}>${pct}%</span>
                </div>
              </td>
              ${admin?`<td><button class="btn--icon-del" data-del="${esc(a.id)}">×</button></td>`:""}
            </tr>`;
          }).join("")}</tbody>
        </table>`:`<div class="muted" style="padding:20px;text-align:center;">Nog geen doelen. ${admin?"Klik + Doel toevoegen.":""}</div>`}
      </div>
    </div>
  `;
}

export function bind(state,root){
  root.querySelector("#btnAdd")?.addEventListener("click",()=>{state.ui.showAddAct=true;state.rerender();});
  root.querySelector("#btnCancelAct")?.addEventListener("click",()=>{state.ui.showAddAct=false;state.rerender();});

  root.querySelector("#btnCreateAct")?.addEventListener("click",()=>{
    const titel=root.querySelector("#aTitel")?.value?.trim();if(!titel){toast("Titel verplicht.");return;}
    state.activiteiten.unshift({
      id:uid("act"),titel,
      thema:root.querySelector("#aThema")?.value?.trim()||"",
      impact:root.querySelector("#aImpact")?.value?.trim()||"",
      partners:root.querySelector("#aPartners")?.value?.trim()||"",
      voortgang:parseInt(root.querySelector("#aVoortgang")?.value)||0,
      toelichting:root.querySelector("#aToelichting")?.value?.trim()||""
    });
    state.ui.showAddAct=false;toast("Doel toegevoegd.");state.rerender();
  });

  // Live progress slider
  root.querySelectorAll("[data-progress]")?.forEach(slider=>{
    const idx=Number(slider.getAttribute("data-progress"));
    slider.addEventListener("input",e=>{
      const val=parseInt(e.target.value)||0;
      state.activiteiten[idx].voortgang=val;
      const label=root.querySelector(`[data-progress-label="${idx}"]`);
      if(label){
        label.textContent=val+"%";
        label.style.color=val>=100?"var(--green)":val>=50?"var(--accent)":"var(--muted)";
      }
    });
  });

  root.querySelectorAll("[data-del]")?.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.getAttribute("data-del");const a=state.activiteiten.find(x=>x.id===id);
      if(!a||!confirm(`'${a.titel}' verwijderen?`))return;
      state.activiteiten=state.activiteiten.filter(x=>x.id!==id);toast("Verwijderd.");state.rerender();
    });
  });

  root.querySelector("#btnSaveGitHub")?.addEventListener("click",async()=>{
    const btn=root.querySelector("#btnSaveGitHub");btn.disabled=true;btn.textContent="Bezig...";
    try{await saveData("activiteiten.json",state.activiteiten,"Update activiteiten");toast("Opgeslagen!");}catch(e){toast("Fout: "+e.message);}
    btn.disabled=false;btn.textContent="Opslaan naar GitHub";
  });
}

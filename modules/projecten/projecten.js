/* Projecten module: CRUD + opslaan in localStorage */
(() => {
  const KEY = "overdracht_tool_projecten_v1";

  /** @typedef {{
   *  id: string,
   *  title: string,
   *  status: "Nieuw"|"Lopend"|"On hold"|"Afgerond",
   *  owner?: string,
   *  gemeente?: string,
   *  start?: string,
   *  deadline?: string,
   *  desc?: string,
   *  updatedAt: number,
   *  createdAt: number
   * }} Project
   */

  const els = {
    tbody: document.getElementById("tbody"),
    empty: document.getElementById("empty"),
    q: document.getElementById("q"),
    statusFilter: document.getElementById("statusFilter"),
    sortBy: document.getElementById("sortBy"),
    btnAdd: document.getElementById("btnAdd"),
    btnAdd2: document.getElementById("btnAdd2"),
    btnExport: document.getElementById("btnExport"),
    fileImport: document.getElementById("fileImport"),

    modal: document.getElementById("modal"),
    form: document.getElementById("form"),
    dlgTitle: document.getElementById("dlgTitle"),
    btnClose: document.getElementById("btnClose"),
    btnDelete: document.getElementById("btnDelete"),
    meta: document.getElementById("meta"),

  detailsModal: document.getElementById("detailsModal"),
  detailsTitle: document.getElementById("detailsTitle"),
  detailsMeta: document.getElementById("detailsMeta"),
  detailsFootMeta: document.getElementById("detailsFootMeta"),
  detailsBody: document.getElementById("detailsBody"),
  btnDetailsEdit: document.getElementById("btnDetailsEdit"),

    f_title: document.getElementById("title"),
    f_status: document.getElementById("status"),
    f_owner: document.getElementById("owner"),
    f_gemeente: document.getElementById("gemeente"),
    f_start: document.getElementById("start"),
    f_deadline: document.getElementById("deadline"),
    f_desc: document.getElementById("desc"),
  };

  /** @type {Project[]} */
  let projects = load();
  /** @type {Project|null} */
  let editing = null;
  /** @type {string|null} */
  let detailId = null;
  /** @type {string|null} */
  let reopenDetailsId = null;


  // ---------- Storage ----------
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed;
      if(parsed && Array.isArray(parsed.projects)) return parsed.projects;
      return [];
    }catch(e){
      console.warn("Failed to load projects:", e);
      return [];
    }
  }

  function save(){
    localStorage.setItem(KEY, JSON.stringify(projects));
  }

  // ---------- Helpers ----------
  function uid(){
    return (crypto?.randomUUID?.() || ("p_" + Math.random().toString(16).slice(2) + Date.now().toString(16)));
  }

  function fmtDate(iso){
    if(!iso) return "—";
    try{
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("nl-NL", { year:"numeric", month:"2-digit", day:"2-digit" });
    }catch{ return iso; }
  }

  function fmtTime(ts){
    if(!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("nl-NL", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }

  function statusDot(status){
    if(status === "Afgerond") return "green";
    if(status === "On hold") return "yellow";
    if(status === "Nieuw") return "grey";
    return "";
  }

  function normalize(s){ return (s || "").toString().toLowerCase(); }

  // ---------- Rendering ----------
  function getFiltered(){
    const q = normalize(els.q.value).trim();
    const sf = els.statusFilter.value;
    let arr = [...projects];

    if(sf){
      arr = arr.filter(p => p.status === sf);
    }
    if(q){
      arr = arr.filter(p => {
        const hay = [p.title, p.status, p.owner, p.gemeente, p.desc].map(normalize).join(" ");
        return hay.includes(q);
      });
    }

    // sorting
    const sort = els.sortBy.value;
    const byStr = (a,b,key,dir=1) => (normalize(a[key]).localeCompare(normalize(b[key])))*dir;
    const byNum = (a,b,key,dir=1) => ((a[key]||0)-(b[key]||0))*dir;

    switch(sort){
      case "updated_asc": arr.sort((a,b)=> byNum(a,b,"updatedAt", 1)); break;
      case "updated_desc": arr.sort((a,b)=> byNum(a,b,"updatedAt", -1)); break;
      case "start_asc": arr.sort((a,b)=> (normalize(a.start).localeCompare(normalize(b.start)))); break;
      case "start_desc": arr.sort((a,b)=> (normalize(b.start).localeCompare(normalize(a.start)))); break;
      case "title_desc": arr.sort((a,b)=> byStr(a,b,"title",-1)); break;
      case "title_asc":
      default: arr.sort((a,b)=> byStr(a,b,"title",1)); break;
    }

    return arr;
  }

  function render(){
    const arr = getFiltered();
    els.tbody.innerHTML = "";
    if(projects.length === 0){
      els.empty.hidden = false;
    } else {
      els.empty.hidden = true;
    }

    if(arr.length === 0){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="padding:18px 14px; color:rgba(255,255,255,.65)">Geen resultaten voor je filter/zoekopdracht.</td>`;
      els.tbody.appendChild(tr);
      return;
    }

    for(const p of arr){
      const tr = document.createElement("tr");
      tr.dataset.open = p.id;
      tr.tabIndex = 0;
      tr.setAttribute("role","button");
      tr.setAttribute("aria-label", `Open project ${p.title || ""}`);
      tr.innerHTML = `
        <td>
          <div style="font-weight:700">${escapeHtml(p.title || "")}</div>
          <div style="color:rgba(255,255,255,.62); font-size:12px; margin-top:4px">${escapeHtml(p.gemeente || "") || "—"}</div>
        </td>
        <td>
          <span class="badge"><span class="dot ${statusDot(p.status)}"></span>${escapeHtml(p.status)}</span>
        </td>
        <td>${escapeHtml(p.owner || "—")}</td>
        <td>${fmtDate(p.start)}</td>
        <td>${fmtDate(p.deadline)}</td>
        <td>${fmtTime(p.updatedAt)}</td>
        <td class="right">
          <button class="btn btn-ghost" data-edit="${p.id}">Bewerken</button>
        </td>
      `;
      els.tbody.appendChild(tr);
    }
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // ---------- Modal ----------
  function openModal(p){
    // if we were in detail view, hide it while editing
    if(els.detailsModal?.classList.contains("open")) closeDetails();
    editing = p || null;

    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden","false");

    if(editing){
      els.dlgTitle.textContent = "Project bewerken";
      els.btnDelete.hidden = false;

      els.f_title.value = editing.title || "";
      els.f_status.value = editing.status || "Lopend";
      els.f_owner.value = editing.owner || "";
      els.f_gemeente.value = editing.gemeente || "";
      els.f_start.value = editing.start || "";
      els.f_deadline.value = editing.deadline || "";
      els.f_desc.value = editing.desc || "";

      els.meta.textContent = `Aangemaakt: ${fmtTime(editing.createdAt)} • Laatst bijgewerkt: ${fmtTime(editing.updatedAt)}`;
    } else {
      els.dlgTitle.textContent = "Nieuw project";
      els.btnDelete.hidden = true;

      els.form.reset();
      els.f_status.value = "Lopend";
      els.meta.textContent = "";
    }

    setTimeout(()=> els.f_title.focus(), 50);
  }

  function closeModal(){
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden","true");
    editing = null;

    if(reopenDetailsId){
      const id = reopenDetailsId;
      reopenDetailsId = null;
      openDetails(id);
    }
  }

  // ---------- CRUD ----------
  function upsertFromForm(){
    const now = Date.now();

    const data = {
      title: els.f_title.value.trim(),
      status: els.f_status.value,
      owner: els.f_owner.value.trim(),
      gemeente: els.f_gemeente.value.trim(),
      start: els.f_start.value,
      deadline: els.f_deadline.value,
      desc: els.f_desc.value.trim(),
    };

    if(!data.title){
      els.f_title.focus();
      return;
    }

    if(editing){
      const idx = projects.findIndex(x => x.id === editing.id);
      if(idx >= 0){
        projects[idx] = {
          ...projects[idx],
          ...data,
          updatedAt: now
        };
      }
    } else {
      /** @type {Project} */
      const p = {
        id: uid(),
        createdAt: now,
        updatedAt: now,
        title: data.title,
        status: data.status || "Lopend",
        owner: data.owner,
        gemeente: data.gemeente,
        start: data.start,
        deadline: data.deadline,
        desc: data.desc
      };
      projects.unshift(p);
    }

    save();
    render();
    closeModal();
  }

  function deleteEditing(){
    if(!editing) return;
    const ok = confirm(`Project verwijderen?\n\n${editing.title}`);
    if(!ok) return;
    projects = projects.filter(p => p.id !== editing.id);
    save();
    render();
    closeModal();
  }

  // ---------- Export / Import ----------
  function exportJson(){
    const payload = {
      type: "overdracht-tool-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      projects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0,19).replaceAll(":","-");
    a.download = `overdracht-projecten-${stamp}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 500);
  }

  async function importJson(file){
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);

      const incoming = Array.isArray(parsed) ? parsed
        : (parsed && Array.isArray(parsed.projects) ? parsed.projects : null);

      if(!incoming){
        alert("Importbestand herkend, maar er staan geen projecten in.");
        return;
      }

      // Merge on id if possible, otherwise append new ids
      const byId = new Map(projects.map(p => [p.id, p]));
      for(const p of incoming){
        if(!p || typeof p !== "object") continue;
        const id = p.id || uid();
        const safe = {
          id,
          title: String(p.title || "").slice(0,120) || "Ongetiteld project",
          status: (["Nieuw","Lopend","On hold","Afgerond"].includes(p.status) ? p.status : "Lopend"),
          owner: (p.owner ? String(p.owner).slice(0,120) : ""),
          gemeente: (p.gemeente ? String(p.gemeente).slice(0,120) : ""),
          start: p.start || "",
          deadline: p.deadline || "",
          desc: (p.desc ? String(p.desc) : ""),
          createdAt: Number(p.createdAt || Date.now()),
          updatedAt: Number(p.updatedAt || Date.now()),
        };

        byId.set(id, safe);
      }

      projects = Array.from(byId.values());
      // keep some reasonable order: newest updated first
      projects.sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0));

      save();
      render();
      alert("Import gelukt.");
    }catch(e){
      console.error(e);
      alert("Import mislukt: bestand is geen geldig JSON.");
    }finally{
      els.fileImport.value = "";
    }
  }
  function openDetails(id){
    const p = projects.find(x => x.id === id);
    if(!p) return;
    detailId = id;

    // Fallback: als de detailmodal niet aanwezig is in deze build, toon minimaal een alert.
    if(!els.detailsModal || !els.detailsTitle || !els.detailsBody){
      const lines = [
        `Project: ${p.title || ""}`,
        `Status: ${p.status || ""}`,
        `Eigenaar: ${p.owner || "—"}`,
        `Gemeente: ${p.gemeente || "—"}`,
        `Start: ${p.start || "—"}`,
        `Deadline: ${p.deadline || "—"}`,
        "",
        (p.desc || "").trim() || "—"
      ];
      alert(lines.join("
"));
      return;
    }

    // Header
    els.detailsTitle.textContent = p.title || "Project";
    if(els.detailsMeta){
      els.detailsMeta.innerHTML = `<span class="badge"><span class="dot ${statusDot(p.status)}"></span>${escapeHtml(p.status)}</span>`;
    }

    // Body
    const desc = (p.desc || "").trim();
    if(els.detailsBody){
      els.detailsBody.innerHTML = `
        <div class="detailsGrid">
          <div class="kv"><div class="k">Eigenaar / contact</div><div class="v">${escapeHtml(p.owner || "—")}</div></div>
          <div class="kv"><div class="k">Gemeente / context</div><div class="v">${escapeHtml(p.gemeente || "—")}</div></div>
          <div class="kv"><div class="k">Startdatum</div><div class="v">${fmtDate(p.start)}</div></div>
          <div class="kv"><div class="k">Deadline</div><div class="v">${fmtDate(p.deadline)}</div></div>
        </div>
        <div class="kv">
          <div class="k">Omschrijving / notities</div>
          <div class="detailsText">${escapeHtml(desc || "—")}</div>
        </div>
      `;
    }

    // Footer meta
    if(els.detailsFootMeta){
      els.detailsFootMeta.textContent = `Aangemaakt: ${fmtTime(p.createdAt)} • Laatst bijgewerkt: ${fmtTime(p.updatedAt)}`;
    }

    els.detailsModal.classList.add("open");
    els.detailsModal.setAttribute("aria-hidden","false");
  }
  function closeDetails(){
    detailId = null;
    if(!els.detailsModal) return;
    els.detailsModal.classList.remove("open");
    els.detailsModal.setAttribute("aria-hidden","true");
  }



// ---------- Events ----------
  document.addEventListener("click", (e) => {
    const t = e.target;

    // close modal by backdrop or data-close
    if(t && t.dataset && t.dataset.close){
      closeModal();
      return;
    }
    if(t && t.classList && t.classList.contains("backdrop")){
      closeModal();
      return;
    }

    // edit button
    const editId = t && t.getAttribute && t.getAttribute("data-edit");
    if(editId){
      const p = projects.find(x => x.id === editId);
      if(p) openModal(p);
      return;
    }

    // open details when clicking a row (but not the action button)
    const row = t && t.closest && t.closest("tr[data-open]");
    if(row && row.dataset && row.dataset.open){
      openDetails(row.dataset.open);
      return;
    }
  });

  els.btnClose?.addEventListener("click", closeModal);
  
  // keyboard: open details from focused row
  els.tbody?.addEventListener("keydown", (e)=> {
    const key = e.key;
    if(key !== "Enter" && key !== " ") return;
    const row = e.target && e.target.closest && e.target.closest("tr[data-open]");
    if(!row) return;
    e.preventDefault();
    openDetails(row.dataset.open);
  });

els.btnAdd?.addEventListener("click", ()=> openModal(null));
  els.btnAdd2?.addEventListener("click", ()=> openModal(null));

  els.form?.addEventListener("submit", (e)=> {
    e.preventDefault();
    upsertFromForm();
  });

  els.btnDelete?.addEventListener("click", deleteEditing);

  // details modal: close by backdrop/button
  document.addEventListener("click", (e)=> {
    const t = e.target;
    if(t && (t.dataset?.closeDetails || t.closest?.("[data-close-details]"))){
      closeDetails();
    }
  });

  // Edit from details
  els.btnDetailsEdit?.addEventListener("click", ()=> {
    if(!detailId) return;
    const p = projects.find(x => x.id === detailId);
    if(!p) return;
    reopenDetailsId = detailId;
    openModal(p);
  });


  // filters
  const rerender = ()=> render();
  els.q?.addEventListener("input", rerender);
  els.statusFilter?.addEventListener("change", rerender);
  els.sortBy?.addEventListener("change", rerender);

  els.btnExport?.addEventListener("click", exportJson);
  els.fileImport?.addEventListener("change", (e)=> {
    const file = e.target.files && e.target.files[0];
    if(file) importJson(file);
  });

  // init
  render();
})();

/**
 * GitHub API integration
 * Handles reading/writing JSON data files to the GitHub repo.
 * Admin: needs a Personal Access Token to save.
 * Viewer: just reads from GitHub Pages (no token needed).
 */

const LS_TOKEN  = "ovt_gh_token";
const LS_REPO   = "ovt_gh_repo";
const LS_BRANCH = "ovt_gh_branch";

// Cache SHAs so we can update files (GitHub requires the current SHA)
const shaCache = {};

/* ── Config ────────────────────────────────────────── */

export function getConfig(){
  return {
    token:  localStorage.getItem(LS_TOKEN)  || "",
    repo:   localStorage.getItem(LS_REPO)   || "",
    branch: localStorage.getItem(LS_BRANCH) || "main"
  };
}

export function setConfig({ token, repo, branch }){
  if(token  !== undefined) localStorage.setItem(LS_TOKEN,  token.trim());
  if(repo   !== undefined) localStorage.setItem(LS_REPO,   repo.trim());
  if(branch !== undefined) localStorage.setItem(LS_BRANCH, (branch || "main").trim());
}

export function clearConfig(){
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_REPO);
  localStorage.removeItem(LS_BRANCH);
}

export function isAdmin(){
  const { token, repo } = getConfig();
  return !!(token && repo);
}

/* ── Load data (works for everyone, no token needed) ── */

export async function loadData(filename, fallback = null){
  try {
    const res = await fetch(`./data/${filename}?t=${Date.now()}`, { cache: "no-store" });
    if(res.ok) return await res.json();
  } catch(e){ /* ignore */ }
  return fallback;
}

/* ── Save data (admin only, commits to GitHub) ──────── */

export async function saveData(filename, data, commitMsg){
  const { token, repo, branch } = getConfig();
  if(!token || !repo) throw new Error("GitHub niet geconfigureerd. Ga naar Instellingen.");

  const path = `data/${filename}`;
  // Encode UTF-8 safe base64
  const json = JSON.stringify(data, null, 2);
  const content = utf8ToBase64(json);

  // We need the current SHA of the file to update it
  const sha = await getFileSha(path);

  const body = {
    message: commitMsg || `Update ${filename}`,
    content,
    branch
  };
  if(sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Accept":        "application/vnd.github+json"
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API fout (${res.status})`);
  }

  const result = await res.json();
  // Update SHA cache so next save works without re-fetching
  if(result.content?.sha) shaCache[path] = result.content.sha;
  return result;
}

/* ── Internal helpers ──────────────────────────────── */

async function getFileSha(path){
  if(shaCache[path]) return shaCache[path];

  const { token, repo, branch } = getConfig();
  if(!token || !repo) return null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
      { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" } }
    );
    if(res.ok){
      const data = await res.json();
      shaCache[path] = data.sha;
      return data.sha;
    }
  } catch(e){ /* ignore */ }
  return null;
}

function utf8ToBase64(str){
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for(const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/* ── Validate token (test API call) ───────────────── */

export async function validateToken(){
  const { token, repo } = getConfig();
  if(!token || !repo) return { ok: false, error: "Token of repo niet ingevuld." };

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" }
    });
    if(res.ok){
      const data = await res.json();
      return { ok: true, repoName: data.full_name, permissions: data.permissions };
    } else {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.message || `HTTP ${res.status}` };
    }
  } catch(e){
    return { ok: false, error: e.message };
  }
}

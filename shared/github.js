const LS_TOKEN="ovt_gh_token",LS_REPO="ovt_gh_repo",LS_BRANCH="ovt_gh_branch",shaCache={};
export function getConfig(){ return { token:localStorage.getItem(LS_TOKEN)||"", repo:localStorage.getItem(LS_REPO)||"", branch:localStorage.getItem(LS_BRANCH)||"main" }; }
export function setConfig({token,repo,branch}){ if(token!==undefined)localStorage.setItem(LS_TOKEN,token.trim()); if(repo!==undefined)localStorage.setItem(LS_REPO,repo.trim()); if(branch!==undefined)localStorage.setItem(LS_BRANCH,(branch||"main").trim()); }
export function clearConfig(){ localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_REPO); localStorage.removeItem(LS_BRANCH); }
export function isAdmin(){ const{token,repo}=getConfig(); return !!(token&&repo); }
export async function loadData(filename,fallback=null){ try{ const r=await fetch(`./data/${filename}?t=${Date.now()}`,{cache:"no-store"}); if(r.ok)return await r.json(); }catch(e){} return fallback; }
export async function saveData(filename,data,commitMsg){
  const{token,repo,branch}=getConfig(); if(!token||!repo)throw new Error("GitHub niet geconfigureerd.");
  const path=`data/${filename}`,json=JSON.stringify(data,null,2),content=utf8ToBase64(json),sha=await getFileSha(path);
  const body={message:commitMsg||`Update ${filename}`,content,branch}; if(sha)body.sha=sha;
  const r=await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{method:"PUT",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Accept":"application/vnd.github+json"},body:JSON.stringify(body)});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||`GitHub API fout (${r.status})`);}
  const result=await r.json(); if(result.content?.sha)shaCache[path]=result.content.sha; return result;
}
async function getFileSha(path){ if(shaCache[path])return shaCache[path]; const{token,repo,branch}=getConfig(); if(!token||!repo)return null; try{const r=await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,{headers:{"Authorization":`Bearer ${token}`,"Accept":"application/vnd.github+json"}}); if(r.ok){const d=await r.json();shaCache[path]=d.sha;return d.sha;}}catch(e){} return null; }
function utf8ToBase64(str){ const b=new TextEncoder().encode(str); let s=""; for(const c of b)s+=String.fromCharCode(c); return btoa(s); }
export async function validateToken(){ const{token,repo}=getConfig(); if(!token||!repo)return{ok:false,error:"Token of repo niet ingevuld."}; try{const r=await fetch(`https://api.github.com/repos/${repo}`,{headers:{"Authorization":`Bearer ${token}`,"Accept":"application/vnd.github+json"}}); if(r.ok){const d=await r.json();return{ok:true,repoName:d.full_name,permissions:d.permissions};}else{const e=await r.json().catch(()=>({}));return{ok:false,error:e.message||`HTTP ${r.status}`};}}catch(e){return{ok:false,error:e.message};} }

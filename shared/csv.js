const COLS=["naam","sport","gemeente","contact_rol","contact_naam","contact_email","contact_telefoon"];
const EX=["VV Voorbeeld","Voetbal","Opsterland","Voorzitter","Jan de Vries","jan@voorbeeld.nl","06-12345678"];
export function downloadTemplate(){
  const csv=COLS.join(";")+"\n"+EX.join(";")+"\n";
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download="verenigingen-sjabloon.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
export function parseCSV(text){
  const fl=text.split(/\r?\n/)[0]||""; const sep=fl.includes(";")?";":","
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length<2)return{ok:false,error:"Bestand bevat geen data."};
  const hdr=lines[0].split(sep).map(h=>h.trim().toLowerCase().replace(/^["']|["']$/g,""));
  if(!hdr.includes("naam"))return{ok:false,error:"Kolom 'naam' ontbreekt. Download het sjabloon."};
  const clubs=[];
  for(let i=1;i<lines.length;i++){
    const vals=splitLine(lines[i],sep); const row={};
    hdr.forEach((h,idx)=>{row[h]=(vals[idx]||"").trim().replace(/^["']|["']$/g,"");});
    const naam=row["naam"]; if(!naam)continue;
    const id="club-"+naam.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Math.random().toString(16).slice(2,6);
    clubs.push({id,naam,sport:row["sport"]||"",gemeente:row["gemeente"]||"",
      contacten:(row["contact_naam"]||row["contact_rol"])?[{rol:row["contact_rol"]||"Contact",naam:row["contact_naam"]||"",email:row["contact_email"]||"",telefoon:row["contact_telefoon"]||""}]:[],
      notitie:""});
  }
  if(!clubs.length)return{ok:false,error:"Geen geldige rijen gevonden."};
  return{ok:true,clubs,count:clubs.length};
}
function splitLine(line,sep){const r=[];let c="",q=false;for(const ch of line){if(ch==='"')q=!q;else if(ch===sep&&!q){r.push(c);c="";}else c+=ch;}r.push(c);return r;}

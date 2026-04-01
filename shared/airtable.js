/**
 * Airtable sync helper
 * Fetches club records from Airtable with filtering and field mapping.
 */

const LS_AT_TOKEN = "ovt_at_token";

export function getAirtableToken(){
  return localStorage.getItem(LS_AT_TOKEN) || "";
}

export function setAirtableToken(token){
  localStorage.setItem(LS_AT_TOKEN, (token||"").trim());
}

export function clearAirtableToken(){
  localStorage.removeItem(LS_AT_TOKEN);
}

/**
 * Fetch records from Airtable with pagination.
 * @param {object} config - { baseId, table, filterFormula, fields }
 * @returns {Promise<{ok:boolean, records?:array, error?:string}>}
 */
export async function fetchAirtableRecords(config){
  const token = getAirtableToken();
  if(!token) return { ok:false, error:"Geen Airtable-token ingesteld. Ga naar Instellingen." };

  const { baseId, table, filterFormula, fields } = config;
  if(!baseId || !table) return { ok:false, error:"Base ID of tabelnaam ontbreekt." };

  const allRecords = [];
  let offset = null;

  try {
    do {
      const params = new URLSearchParams();
      if(filterFormula) params.set("filterByFormula", filterFormula);
      if(fields && fields.length){
        fields.forEach(f => params.append("fields[]", f));
      }
      if(offset) params.set("offset", offset);
      params.set("pageSize", "100");
      params.set("cellFormat", "string");

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if(!res.ok){
        const err = await res.json().catch(()=>({}));
        return { ok:false, error: err.error?.message || `Airtable API fout (${res.status})` };
      }

      const data = await res.json();
      allRecords.push(...(data.records || []));
      offset = data.offset || null;

    } while(offset);

    return { ok:true, records: allRecords };

  } catch(e){
    return { ok:false, error: e.message };
  }
}

/**
 * Sync Airtable records into verenigingen list.
 * REPLACES the list with Airtable data, but preserves tool-specific fields
 * (SWG, actief, contacten, notities, afdelingen) for matched clubs.
 * Clubs not in Airtable are REMOVED from the list.
 * Returns the new list + stats.
 */
export function mergeAirtableRecords(records, existing, fieldMap){
  // Build lookup of existing clubs by name (lowercase)
  const existingMap = new Map();
  existing.forEach(v => existingMap.set(v.naam?.toLowerCase().trim(), v));

  const newList = [];
  let added = 0, updated = 0, skipped = 0;

  for(const rec of records){
    const f = rec.fields || {};
    const naam = (f[fieldMap.naam] || "").trim();
    if(!naam){ skipped++; continue; }

    const sport = arrayOrString(f[fieldMap.sport]);
    const plaats = arrayOrString(f[fieldMap.plaats]);
    const gemeente = arrayOrString(f[fieldMap.gemeente]);
    const locatie = arrayOrString(f[fieldMap.locatie]);
    const sportbond = arrayOrString(f[fieldMap.sportbond]);

    const key = naam.toLowerCase();
    const existing_club = existingMap.get(key);

    if(existing_club){
      // Update Airtable-velden, behoud tool-specifieke data
      existing_club.sport = sport || existing_club.sport;
      existing_club.plaats = plaats || existing_club.plaats;
      existing_club.gemeente = gemeente || existing_club.gemeente;
      existing_club.locatie = locatie || existing_club.locatie || "";
      existing_club.sportbond = sportbond || existing_club.sportbond || "";
      existing_club.airtableId = rec.id;
      // SWG, actief, contacten, notitie, afdelingen blijven ONGEWIJZIGD
      newList.push(existing_club);
      updated++;
    } else {
      // Nieuwe club
      const id = "club-" + naam.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Math.random().toString(16).slice(2,6);
      newList.push({
        id, naam, sport: sport||"", plaats: plaats||"", gemeente: gemeente||"",
        locatie: locatie||"", sportbond: sportbond||"",
        contacten: [], actief: true, swg: false, afdelingen: "", notitie: "",
        airtableId: rec.id
      });
      added++;
    }
  }

  const removed = existing.length - updated;

  return { newList, added, updated, removed, skipped, total: records.length };
}

function arrayOrString(val){
  if(Array.isArray(val)) return val.join(", ");
  return (val || "").toString().trim();
}

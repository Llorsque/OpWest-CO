# Overdracht-tool (GitHub-ready)

Deze repo is een **local-first** overdrachtstool voor clubondersteuning:
- Verenigingen + contactpersonen
- Per vereniging een veld **“Wat speelt er?”**
- Modules voor projecten, aankomende zaken, gemeentelijke info, activiteitenplan, documenten/contacten
- Export/Import zodat je jouw aanvullingen makkelijk overdraagt aan een collega

## Starten (lokaal)
Open `index.html` (bij voorkeur via een simpele webserver):
- VS Code: *Live Server*
- Of: `python -m http.server` en open `http://localhost:8000`

> Let op: alles dat je invult staat standaard in je browser (localStorage). Gebruik **Export** om te delen.

## Data: verenigingen
- Bronbestand: `data/verenigingen.json`
- Formaat:
```json
[
  {
    "id": "vv-oerterp",
    "naam": "VV Oerterp",
    "sport": "Voetbal",
    "gemeente": "Opsterland",
    "contacten": [
      {"rol": "Voorzitter", "naam": "…", "email": "…", "telefoon": "…"}
    ]
  }
]
```

## Modules & mappenstructuur
De folderstructuur volgt de modules:
- `modules/verenigingen/`
- `modules/projecten/`
- `modules/aankomend/`
- `modules/gemeente/`
- `modules/activiteiten/`
- `modules/resources/`

## Export & import
- **Export** downloadt een JSON met alle lokale aanvullingen (notities + lokale lijsten).
- **Import** zet die JSON terug in localStorage (handig voor overdracht).

## GitHub Pages
Zet deze repo op GitHub en activeer GitHub Pages (root). De tool werkt dan direct.

## Update-workflow (advies)
Werk in een testbranch (bijv. `dev`) en merge via PR naar `main`.

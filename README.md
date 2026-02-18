# Overdracht-tool — Sportverenigingen

Interne overdrachtstool voor clubondersteuning. Data wordt opgeslagen in JSON-bestanden in deze repo en automatisch gepubliceerd via GitHub Pages.

## Modules

| Module | Beschrijving |
|---|---|
| **Verenigingen** | Alle clubs met contactpersonen, sport, gemeente en notities |
| **Trajecten** | Langdurige ondersteuningstrajecten per vereniging |
| **Projecten** | Lopende projecten met status, eigenaar en deadlines |
| **Aankomende zaken** | Afspraken, deadlines en events |
| **Gemeentelijke info** | Kaders, contactpersonen gemeente, links |
| **Activiteitenplan** | Activiteiten per thema, impact en partners |
| **Documenten & contacten** | Overige documenten, partners en tools |

## Hoe werkt het?

### Bekijken (iedereen)
Open de GitHub Pages URL → alle data is direct zichtbaar. Geen login nodig.

### Bewerken (admin)
1. Open de GitHub Pages URL
2. Ga naar **Instellingen** (⚙️ in de sidebar)
3. Vul in:
   - **Repository**: `jouw-username/OpWest-CO` (zoals in de GitHub URL)
   - **Branch**: `main`
   - **Personal Access Token**: maak er een aan via [github.com/settings/tokens](https://github.com/settings/tokens)
     - Kies **Fine-grained token**
     - Selecteer deze repo
     - Geef permissie: **Contents → Read and write**
4. Klik **Test verbinding** om te controleren
5. Nu kun je in elke module data bewerken en op **Opslaan naar GitHub** klikken

### Wat gebeurt er bij opslaan?
- De tool commit het bijgewerkte JSON-bestand direct naar deze repo
- GitHub Pages herlaadt automatisch (duurt ~30 seconden)
- Je collega refresht de pagina en ziet de nieuwe data

## GitHub Pages instellen

1. Ga naar je repo → **Settings** → **Pages**
2. Bij **Source**: kies `Deploy from a branch`
3. Bij **Branch**: kies `main` en folder `/ (root)`
4. Klik **Save**
5. Na ~1 minuut is de site live op `https://jouw-username.github.io/OpWest-CO/`

## Data

Alle data staat in de `data/` map:

```
data/
├── verenigingen.json
├── trajecten.json
├── projecten.json
├── aankomend.json
├── gemeente.json
├── activiteiten.json
└── resources.json
```

## Mappenstructuur

```
├── index.html              → Hoofdpagina
├── app.js                  → Router en data-loading
├── styles.css              → Alle styling
├── shared/
│   ├── utils.js            → Hulpfuncties
│   └── github.js           → GitHub API integratie
├── data/                   → Alle JSON data
│   └── ...
└── modules/                → Elke module apart
    ├── landing.js
    ├── instellingen.js
    ├── verenigingen/
    ├── trajecten/
    ├── projecten/
    ├── aankomend/
    ├── gemeente/
    ├── activiteiten/
    └── resources/
```

## Versie

v2.0.0 — GitHub-synced, trajecten-module, admin/viewer modus.

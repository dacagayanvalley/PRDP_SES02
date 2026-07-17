# SES-Track 02

SES-Track 02 is the public GitHub Pages production view for PRDP Scale-Up RPCO 02 Social and Environmental Safeguards tracking.

## Official Source

The hosted site uses the SIDLAN Region II safeguards disclosure snapshot as the official source record:

- Infrastructure source: https://sidlan.da.gov.ph/ses-ib-safeguard-docs/disclosure
- Region filter: Cagayan Valley (Region II)
- App snapshot: `public/data/sidlan/region-02-app-dataset.json`
- Source audit snapshot: `public/data/sidlan/region-02-sidlan.json`

New subproject records must come from the SIDLAN refresh process. The production UI does not provide demo-data loading, synthetic subproject creation, or CSV/manual subproject import.

## Local Development

```powershell
npm install
npm run dev -- --port 5173
```

Open http://127.0.0.1:5173.

## Production Build

```powershell
npm run build
```

The static output is written to `dist/` and published to GitHub Pages through the `gh-pages` branch workflow.

## Data Safety

Do not publish confidential PAP, IP/ICC, GBV/SEA/SH, grievance, worker health, fraud, or restricted records to GitHub Pages. Browser-local edits are working copies only and should be reconciled against official source records.

# SES-Track 02

SES-Track 02 is the public GitHub Pages production view for PRDP Scale-Up RPCO 02 Social and Environmental Safeguards tracking.

## Official Source

The hosted site uses SIDLAN Region II source records as the official public data basis:

- Safeguards disclosure source: https://sidlan.da.gov.ph/ses-ib-safeguard-docs/disclosure
- API source registry: FMR Watch, IBUILD, IPLAN, IREAP, and LGU datasets
- Region filter: Cagayan Valley (Region II)
- App snapshot: `public/data/sidlan/region-02-app-dataset.json`
- Disclosure audit snapshot: `public/data/sidlan/region-02-sidlan.json`
- API source snapshot: `public/data/sidlan/source-datasets.json`

New subproject records must come from the SIDLAN refresh process. The production UI does not provide demo-data loading, synthetic subproject creation, or CSV/manual subproject import.

## API Refresh

The API snapshotter reads credentials from environment variables and writes redacted static JSON only:

```powershell
$env:SIDLAN_FMR_API_KEY="..."
$env:SIDLAN_IBUILD_API_KEY="..."
$env:SIDLAN_IPLAN_API_KEY="..."
$env:SIDLAN_IREAP_API_KEY="..."
$env:SIDLAN_LGU_API_KEY="..."
npm run fetch:sidlan-api
```

For GitHub Pages, configure the same names as repository secrets. The publish workflow runs weekly on Sunday 20:00 UTC and skips API refresh if secrets are not configured.

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

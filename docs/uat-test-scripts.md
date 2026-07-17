# UAT Test Scripts

## Script 1: Official Source Check

- Open Dashboard.
- Expected: official source snapshot panel shows SIDLAN Region II status.
- Open Portfolio.
- Expected: records are SIDLAN Region II official subprojects only.
- Expected: no Import page, no demo reload action, and no synthetic record button.

## Script 2: Screening to Requirements

- Open Screening.
- Select Annex C and an official SIDLAN subproject.
- Answer a trigger question without remarks and click Save.
- Expected: save is blocked with an evidence/remarks alert.
- Add remarks, save again.
- Expected: toast confirms save and Triggered Requirement Preview updates.

## Script 3: GIS Advisory Overlay

- Open GIS Screening.
- Enter invalid coordinates and save.
- Expected: coordinate validation alert.
- Enter valid Philippine coordinates, save, toggle one layer off, then run overlay checks.
- Expected: overlay runs only against visible layers.
- Confirm an overlay hit.
- Expected: generated spatial requirement appears.

## Script 4: Reports and Redaction

- Open Reports.
- Generate a dossier and monthly report.
- Use Print and Download report HTML.
- Expected: report includes source metadata, signatures, and redacted restricted GRM fields.

## Script 5: Static Hosting Smoke Test

- Run `npm run build`.
- Serve or deploy `dist`.
- Open Dashboard, Portfolio, Screening, GIS Screening, NOL Readiness, Reports, and GRM through app navigation.
- Expected: no blank pages and no console-breaking runtime errors.

# UAT Test Scripts

## Script 1: Screening to requirements

- Open Screening.
- Select Annex C and a demo subproject.
- Answer a trigger question without remarks and click Save.
- Expected: save is blocked with an evidence/remarks alert.
- Add remarks, save again.
- Expected: toast confirms save and Triggered Requirement Preview updates.

## Script 2: GIS advisory overlay

- Open GIS Screening.
- Enter invalid coordinates and save.
- Expected: coordinate validation alert.
- Enter valid Philippine coordinates, save, toggle one layer off, then run overlay checks.
- Expected: overlay runs only against visible layers.
- Confirm an overlay hit.
- Expected: generated spatial requirement appears.

## Script 3: Import guardrails

- Open Import.
- Paste the CSV template and preview.
- Expected: valid preview.
- Commit twice.
- Expected: second commit skips duplicate codes.
- Preview a JSON backup and commit.
- Expected: confirmation prompt before replacement.

## Script 4: Reports and redaction

- Open Reports.
- Generate a dossier and monthly report.
- Use Print and Download report HTML.
- Expected: report includes source metadata, signatures, and redacted restricted GRM fields.

## Script 5: Static hosting smoke test

- Run `npm run build`.
- Serve or deploy `dist`.
- Open Dashboard, Screening, GIS Screening, Reports, and Import directly through the app navigation.
- Expected: no blank pages and no console-breaking runtime errors.

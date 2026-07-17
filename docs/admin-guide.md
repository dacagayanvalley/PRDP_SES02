# SES-Track 02 Admin Guide

## Operating mode

This build is a GitHub Pages static MVP. Data is stored in the browser localStorage and should be treated as a local working copy only. Use synthetic or non-sensitive records unless a production backend and approved access controls are adopted.

## Routine use

1. Start from Dashboard to inspect portfolio counts, blockers, overdue findings, and SLA alerts.
2. Use Screening to complete Annex B/C. Triggered answers require evidence notes before saving and regenerate the requirements matrix.
3. Use GIS Screening to save coordinates, select visible reference layers, run advisory overlays, and confirm only reviewed overlay hits.
4. Use NOL Readiness to update requirement status, evidence, permits, and clearances.
5. Use Monitoring and GRM for field findings, corrective actions, and grievance SLA tracking.
6. Use Reports to print or download compliance dossiers, monthly reports, and CSV packages.
7. Use Import to preview CSV or JSON backups before committing changes.

## Data stewardship

- Export JSON before major edits or imports.
- Keep confidential GRM, GBV/SEA/SH, land acquisition, IP, and exact sensitive-location records out of GitHub Pages unless formally cleared.
- Treat role simulation as a workflow aid, not real access control.
- Keep official form versions in `public/data/forms` and document the source/version in each schema.

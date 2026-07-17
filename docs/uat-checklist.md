# Production UAT Checklist

- Open the hosted GitHub Pages site.
- Confirm Dashboard shows the SIDLAN official source snapshot.
- Confirm Portfolio contains only SIDLAN Region II records.
- Confirm there is no Import page, no demo reload action, and no synthetic subproject creation action.
- Complete an Annex B/C screening for an official subproject and verify triggered requirements update.
- Run GIS Screening on an official subproject and confirm only reviewed overlay hits create requirements.
- Generate Reports and confirm source metadata, signatures, and redaction notes are present.
- Run `npm run build` before any production push.

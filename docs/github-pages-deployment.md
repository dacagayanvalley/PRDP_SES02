# GitHub Pages Deployment

## Option A: GitHub Pages From `dist` Artifact

1. Run `npm install`.
2. Run `npm run build`.
3. Upload or publish the `dist/` folder as the GitHub Pages artifact.

## Option B: GitHub Actions

Create `.github/workflows/deploy.yml` with a standard Node build and Pages deploy workflow:

```yaml
name: Deploy static site to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Required Warning

GitHub Pages is static public hosting. It does not provide server-side authentication, row-level security, tamper-proof audit logs, private file storage, or confidential case protection. Production confidential records require an approved backend.

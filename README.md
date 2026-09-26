# AWS 66 Delta — authorized lab findings

বাংলা ও English team dashboard for documenting **authorized training labs**. The dashboard reads country CSV files from GitHub; approved contributors can submit entries through the Vercel API. GitHub remains the source of truth.

## Scope

Only use intentionally vulnerable training labs or systems for which the team has written authorization. Public files must not contain real credentials, shell URLs, payloads, exploit instructions, personal data or identifiable production targets. Use an opaque lab ID rather than a live URL. Redact evidence before sharing it.

## Repository layout

- `public/index.html`: dashboard and submission form.
- `api/entries.js`: GitHub backed list and submission API.
- `domains/{india,pakistan,uganda,canada,others}/findings.csv`: CSV data.
- `CONTRIBUTING.md`: browser and CLI contribution guide.

## Vercel setup

1. Import this repository into Vercel. Framework preset: **Other**; root directory: repository root.
2. Create a fine-grained GitHub token scoped to this repository with **Contents: Read and write**. Store it as `GITHUB_TOKEN` in Vercel environment variables, never in GitHub or the browser.
3. Set `GITHUB_OWNER`, `GITHUB_REPO` and a long random `SUBMISSION_KEY` in Vercel. Share the submission key only with trusted contributors. Rotate it if exposed.
4. Deploy. Open `/` and verify that the empty dashboard loads. Send a safe test entry and confirm it appears in the corresponding CSV and on refresh.

The GET API reads public repository CSV files from GitHub. The POST API requires `SUBMISSION_KEY`, validates fields, rejects duplicates and retries commit conflicts. For a private repository, `GITHUB_TOKEN` is also required for reads. The token is never returned to clients.

Direct GitHub edits and pull requests remain available. Avoid putting secrets in issue bodies, screenshots, commit messages, or Git history.

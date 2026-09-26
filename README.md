# AWS 66 Delta — authorized course task tracker

বাংলা ও English dashboard for recording **authorized course assignments by domain and website hostname**. Contributors record attempts whether successful, unsuccessful, still in progress, or not attempted. GitHub CSV files are the source of truth; the Vercel form commits to the same files.

## Scope and data

Only record websites included in the team's written authorization. The public repository lists hostnames and generic task outcomes. Do not add credentials, URL paths, shell URLs, payloads, exploit instructions, personal data, or sensitive evidence. If a target hostname is confidential, do not enter it in this public repository.

Each domain has `domains/<domain>/findings.csv`, for example `domains/example.org/findings.csv`. The `Website` field is the exact hostname (`example.org` or `app.example.org`) within the assigned domain. The header is:

```csv
Domain,Website,Task,Attempted,Outcome,Date,Details,Contributor
```

`Attempted` is `yes` or `no`; `Outcome` is `success`, `unsuccessful`, `in-progress`, or `not-attempted`. `no` must pair with `not-attempted`. The form creates the domain file on the first entry. Each later entry adds a row. The previous `domains/{india,pakistan,uganda,canada,others}/findings.csv` files remain readable in the dashboard's earlier lab section.

## Repository layout

- `public/index.html`: dashboard, instructions and visual entry form.
- `api/entries.js`: GitHub-backed list and submission API.
- `domains/<domain>/findings.csv`: task entries grouped by assigned domain.
- `CONTRIBUTING.md`: direct GitHub edit and pull request guide.

## Vercel setup

Production uses `GITHUB_TOKEN` (fine-grained token for this repository, Contents read/write) and `SUBMISSION_KEY` as Secret environment variables. `GITHUB_OWNER` and `GITHUB_REPO` default to this repository. Redeploy after any environment variable change. Share the submission key only with trusted contributors; rotate it if exposed. A public repository can be read without the token.

The POST API validates hostnames, statuses and dates, rejects duplicate website/task/date/contributor entries, and retries GitHub commit conflicts. Direct GitHub edits and pull requests are also supported. Follow the exact CSV header and keep hostnames within the domain folder. The dashboard reads domain folders from GitHub on refresh.

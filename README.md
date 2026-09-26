# AWS 66 Delta — authorized course task tracker

বাংলা ও English dashboard for recording **authorized course assignments by domain and website hostname**. Contributors record attempts whether successful, unsuccessful, still in progress, or not attempted. GitHub CSV files are the source of truth; the Vercel form commits as the signed-in GitHub user.

## Scope and data

Only record websites included in the team's written authorization. The public repository lists hostnames and generic task outcomes. Do not add credentials, URL paths, shell URLs, payloads, exploit instructions, personal data, or sensitive evidence. If a target hostname is confidential, do not enter it in this public repository.

Each domain has `domains/<domain>/findings.csv`, for example `domains/example.org/findings.csv`. The `Website` field is the exact hostname (`example.org` or `app.example.org`) within the assigned domain. The header is:

```csv
Domain,Website,Task,Attempted,Outcome,Date,Details,Contributor
```

`Attempted` is `yes` or `no`; `Outcome` is `success`, `unsuccessful`, `in-progress`, or `not-attempted`. `no` must pair with `not-attempted`. The form creates the domain file on the first entry. Each later entry adds a row. The previous `domains/{india,pakistan,uganda,canada,others}/findings.csv` files remain readable in the dashboard's earlier lab section.

## GitHub sign-in setup

1. Register a **GitHub App** owned by the repository owner. Homepage: `https://aws-66-delta-shell-upload-project.vercel.app/`; callback: `https://aws-66-delta-shell-upload-project.vercel.app/api/auth?mode=callback`. Give it repository **Contents: Read and write** and required Metadata read. Disable webhooks if unused, keep expiring user tokens enabled, and select installation access to **only this repository**.
2. Install the App on `mdnhbn/AWS-66-Delta-Shell-Upload-Project`. GitHub App user access tokens are limited by both the app installation and the signed-in user's repository permission. Add approved friends as repository collaborators with appropriate write access; each must accept the invitation and authorize the App. Other GitHub accounts can sign in but cannot write.
3. In Vercel Production environment variables set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` (Secret), and a random `SESSION_SECRET` of at least 32 characters (Secret). Optionally set `GITHUB_REPOSITORY_ID` to the numeric ID of this repository to narrow user tokens further. Redeploy.
4. Remove the previous `GITHUB_TOKEN` and `SUBMISSION_KEY` environment variables after the new flow is verified. The browser receives only an HTTP-only encrypted session cookie; app client secret and GitHub user token are never exposed to JavaScript or written to GitHub. Sessions expire with the GitHub user token (at most eight hours), then contributors sign in again.

The GET API reads public repository CSV files without authentication. POST requires a signed-in GitHub user with repository write access, validates hostnames, statuses and dates, rejects duplicate website/task/date/contributor entries, and retries commit conflicts. Contributor is always taken from the authenticated GitHub login. Direct GitHub edits and pull requests remain supported. Follow the exact CSV header and keep hostnames within the domain folder. The dashboard reads domain folders from GitHub on refresh.

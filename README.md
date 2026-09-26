# AWS 66 Delta — authorized course task tracker

বাংলা ও English dashboard for recording **authorized course assignments by domain and website hostname**. Contributors record attempts whether successful, unsuccessful, still in progress, or not attempted. GitHub CSV files are the source of truth. The form records the verified GitHub login in the Contributor column and writes through a server-side repository token.

## Scope and data

Only record websites included in the team's written authorization. The public repository lists hostnames and generic task outcomes. Do not add credentials, URL paths, shell URLs, payloads, exploit instructions, personal data, or sensitive evidence. If a target hostname is confidential, do not enter it in this public repository.

Each domain has `domains/<domain>/findings.csv`, for example `domains/example.org/findings.csv`. The `Website` field is the exact hostname (`example.org` or `app.example.org`) within the assigned domain. The header is:

```csv
Domain,Website,Task,Attempted,Outcome,Date,Details,Contributor
```

`Attempted` is `yes` or `no`; `Outcome` is `success`, `unsuccessful`, `in-progress`, or `not-attempted`. `no` must pair with `not-attempted`. The form creates the domain file on the first entry. Each later entry adds a row. The previous `domains/{india,pakistan,uganda,canada,others}/findings.csv` files remain readable in the dashboard's earlier lab section.

## GitHub sign-in setup

1. Register a **GitHub App** owned by the repository owner. Homepage: `https://aws-66-delta-shell-upload-project.vercel.app/`; callback: `https://aws-66-delta-shell-upload-project.vercel.app/api/auth?mode=callback`. Give it repository **Contents: Read and write** and required Metadata read. Disable webhooks if unused, keep expiring user tokens enabled, and select installation access to **only this repository**.
2. Install the App on `mdnhbn/AWS-66-Delta-Shell-Upload-Project`. Any GitHub account can sign in to the form without a collaborator invite. The app user token identifies the contributor; the server's token performs the write.
3. In Vercel Production environment variables set `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` (Secret), a random `SESSION_SECRET` of at least 32 characters (Secret), and `GITHUB_TOKEN` (Secret), a fine-grained token limited to this repository with Contents write. Optionally set `GITHUB_REPOSITORY_ID` to the numeric ID of this repository. Redeploy. Rotate `GITHUB_TOKEN` before its expiry; submissions will fail if it expires.
4. The old `SUBMISSION_KEY` is unused. The browser receives only an HTTP-only encrypted session cookie; tokens and secrets are never exposed to JavaScript or written to GitHub. Sessions expire at most eight hours after sign-in.

The GET API reads public repository CSV files without authentication. POST requires a signed-in GitHub user, validates hostnames, statuses and dates, rejects duplicate website/task/date/contributor entries, and retries commit conflicts. Contributor is always taken from the authenticated GitHub login; the commit is made by the server-side token owner. Everyone can fork the public repository and propose manual edits via pull request without an invite. Follow the exact CSV header and keep hostnames within the domain folder. The dashboard reads merged domain folders from GitHub on refresh.

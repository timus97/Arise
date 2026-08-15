# SRE intake (ARISE-023)

Date: 2026-08-15  
Story: ARISE-023 — harden Actions, PR template, merge-gate docs, `main` protection.

## Applied protection (live)

`main` branch protection is on: required PR, required status check context **`ci`** (not `CI / ci`), `required_approving_review_count: 0`, `enforce_admins: true`, no force-push / no deletes.

ARISE-024 (rewrite “After peer PASS” to GitHub PR merge) is implemented on PR 5 (`docs/git-workflow-pr-merge`).

## Backlog request

**ARISE-025 — Document required check context as `ci`**

- Why: live protection uses context `ci`. Docs/template still say `CI / ci`, which previously blocked merges (check never matched).
- Scope: docs + PR template + operator `gh api` snippet only. No workflow behavior change if already on origin/main’s `ci.yml`.
- Out of scope: `deploy.yml`, Cloudflare, Caddy.
- **Implemented on PR 5** (`docs/git-workflow-pr-merge`): `docs/dev/CI.md`, `docs/dev/GIT_WORKFLOW.md`, `.github/pull_request_template.md`, this file. SM should still add ARISE-025 to the board as **In review / Done-when-merged**.

## Out of scope — do not add

- `.github/workflows/deploy.yml`
- Cloudflare, Pages, Workers Paid, wrangler, Caddy TLS, custom domain
- Auto-deploy on merge to a public URL

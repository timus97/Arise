# SRE intake (ARISE-023)

Date: 2026-08-15  
Story: ARISE-023 — harden Actions, PR template, merge-gate docs, `main` protection.

## Backlog requests

**none** for admin-only work.

`main` branch protection was applied with this token (required pull request, required status check `CI / ci`, `enforce_admins: true`, force-push disabled). Do **not** add ARISE-025 unless an operator later removes those rules and a Contents-only token 403s on Administration.

## Optional docs follow-up (not blocking this story)

`docs/dev/GIT_WORKFLOW.md` “After peer PASS” still says local `git merge --no-ff` + `git push origin main`. Protection now rejects direct pushes to `main` (including admins). SM may add a small docs story (e.g. **ARISE-024**) to rewrite that section to: merge the GitHub PR into `main` after `CI / ci` green + peer PASS. Not required to close ARISE-023.

## Out of scope — do not add

- `.github/workflows/deploy.yml`
- Cloudflare, Pages, Workers Paid, wrangler, Caddy TLS, custom domain
- Auto-deploy on merge to a public URL

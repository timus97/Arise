# Arise CI and merge gates

v1 scope: **git and merges only**. There is no deploy pipeline. Do **not** add `.github/workflows/deploy.yml`. Do **not** deploy to Cloudflare, Pages, Workers, or Caddy.

Workflow file: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).  
DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).  
Git procedure: [`docs/dev/GIT_WORKFLOW.md`](./GIT_WORKFLOW.md).

---

## How CI works

Workflow **name:** `CI`  
Job **id:** `ci`  
**Required check name:** `CI / ci`

Triggers:

- `pull_request` targeting `main`
- `push` to `main`

Concurrency: one run per `github.ref`. Newer runs **cancel in-progress** runs on the same ref.

Permissions: `contents: read` only.

Job steps (all required; a failure fails the job):

1. Checkout
2. Install ripgrep
3. Forbidden-string grep (fail-closed — see below)
4. pnpm 9 + Node 22 with `actions/setup-node` `cache: pnpm`
5. `pnpm install --frozen-lockfile` (lockfile is committed)
6. `pnpm run lint`
7. `pnpm run typecheck`
8. `pnpm run test`

Typecheck and test always run. Missing scripts or non-zero exits fail the job. There is no “skip if no `package.json`” path.

### Forbidden-string grep

`FORBIDDEN.txt` is the list. The step is **required** and **fail-closed**:

```text
rg -i -f FORBIDDEN.txt --glob "!docs/**" --glob "!grok-design*" --glob "!.git/**" --glob "!FORBIDDEN.txt"
```

ripgrep exit codes:

| Exit | Meaning | Job result |
| --- | --- | --- |
| 0 | Matches found | **Fail** (forbidden IP strings) |
| 1 | No matches | Pass |
| 2+ | rg error | **Fail** (do not treat as clean) |

Manual review is not the IP mitigation. Excluding `FORBIDDEN.txt` is required (the list would always hit). Excluding `docs/**` avoids the DoD/design copies of the banned marks.

---

## How to merge

1. Start from a pull of `origin/main`, then a feature branch (`feat/<STORY-ID>-<slug>`). Never implement on `main`.
2. Open a **pull request into `main`**.
3. Wait until required check **`CI / ci`** is green (lint, typecheck, tests, forbidden-string grep).
4. Get **peer review PASS** from the other senior (Dev A ↔ Dev B). The author does not self-merge on a failing or pending review.
5. Merge the PR. Push of the merge must reach GitHub.
6. **Never force-push `main`.** Do not delete `main`. Feature-branch force-push only if you own the branch and it is not shared mid-review.

Branch protection (when applied) enforces: pull request before merge, required status check `CI / ci`, no force-push to `main`.

v1 does **not** auto-deploy on merge. Launch path remains `docker compose up --build` on localhost.

---

## Operator must run

**Status (ARISE-023):** applied on 2026-08-15. `GET repos/timus97/Arise/branches/main/protection` returned required PR + required check `CI / ci` + `enforce_admins` + `allow_force_pushes: false`. Re-run the PUT only if that GET is 404 or the rules were removed.

Branch protection needs the **Administration** permission. A Contents-write fine-grained PAT can push branches and still **403** on this endpoint. Do not fake a green gate.

Check current protection (expect 404 if unset):

```powershell
gh api repos/timus97/Arise/branches/main/protection
```

Apply protection (required PR, required check `CI / ci`, no force-push):

```powershell
@'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI / ci"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@ | gh api -X PUT repos/timus97/Arise/branches/main/protection -H "Accept: application/vnd.github+json" --input -
```

Equivalent with `gh` flags if you prefer not to pipe JSON:

```powershell
gh api -X PUT repos/timus97/Arise/branches/main/protection `
  -H "Accept: application/vnd.github+json" `
  -F required_status_checks[strict]=true `
  -F 'required_status_checks[contexts][]=CI / ci' `
  -F enforce_admins=true `
  -F required_pull_request_reviews[required_approving_review_count]=1 `
  -F required_pull_request_reviews[dismiss_stale_reviews]=true `
  -F restrictions= `
  -F allow_force_pushes=false `
  -F allow_deletions=false
```

Token needs: **Administration: Read and write** on `timus97/Arise` (in addition to Contents and Metadata). After saving a new PAT, replace `GH_TOKEN` in the environment — editing an existing token on GitHub does not update a copied secret.

If the PUT returns **403** (`Resource not accessible by personal access token` or missing Administration), leave protection unset and file SM follow-up **ARISE-025** (apply `main` branch protection with an admin-capable token). See [`SRE_INTAKE.md`](./SRE_INTAKE.md).

# Arise team git workflow

Every engineer, Scrum Master, and reviewer follows this. No local-only “I’ll push later.”

Remote: `origin` → `https://github.com/timus97/Arise.git`  
Default branch: **`main`**. Never commit directly to `main` for feature work.

---

## Always

1. **Commit** when a story-sized slice is complete (or when you stop for review).
2. **Push** that commit to GitHub on the **feature branch** immediately.
3. Do not leave finished work only in a worktree.

---

## Starting any new story

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<STORY-ID>-<short-slug>
# example: feat/ARISE-006-engine-math
```

Then implement **only that story**. Do not pile the next PR onto the same branch.

---

## While working

```powershell
git add <files>
git commit -m "<type>(<scope>): <title from the PR plan>"
git push -u origin HEAD
```

Use the design PR title when possible, e.g.  
`feat(engine): xp, rank, recovery baselines, safety, effect helpers`

After the first push, later commits:

```powershell
git push origin HEAD
```

---

## After peer PASS

The orchestrator (or the author after PASS) merges to `main` and **pushes `main`**:

```powershell
git checkout main
git pull origin main
git merge --no-ff feat/<STORY-ID>-<slug> -m "merge: <PR> <title> (peer PASS)"
git push origin main
```

Then delete the feature branch if desired:

```powershell
git push origin --delete feat/<STORY-ID>-<slug>
```

---

## Reviewing

1. `git fetch origin`
2. Check out or read the author’s **remote** feature branch (`origin/feat/...`), not an unpushed worktree-only SHA if a remote branch exists.
3. Write the review under `docs/dev/reviews/`.
4. Commit and push review docs on a docs branch or ask the SM to land them on `main` — reviews must reach GitHub.

---

## Branch names

| Kind | Pattern | Example |
| --- | --- | --- |
| Feature | `feat/<STORY-ID>-<slug>` | `feat/ARISE-006-engine-math` |
| Chore | `chore/<STORY-ID>-<slug>` | `chore/ARISE-002-ci` |
| Docs | `docs/<slug>` | `docs/git-workflow` |

---

## Forbidden

- Committing to `main` for implementation (docs-only SM updates may land on `main` after pull).
- Starting work on a dirty tree without pull.
- Reusing a feature branch for a **different** story.
- Solo Leveling strings in commit messages (see `FORBIDDEN.txt`).
- Force-push to `main`. Feature-branch force-push only if you own the branch and it is not shared mid-review.

---

## PATH (this machine)

Prepend Node 22 before any `pnpm` / `node` command:

`C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64`

---

## If `git push` is 403

`gh repo view` can say **ADMIN** while `git push` still fails. The REST “viewer permission” is the **user’s** role on the repo, not what the **token** is allowed to write.

This machine uses a fine-grained PAT (`github_pat_…` via `GH_TOKEN`). Git write needs:

1. Token type: **Fine-grained** (or classic with `repo`).
2. Resource owner: **timus97**.
3. Repository access: **Only select** → include **`timus97/Arise`**.
4. Repository permissions:
   - **Contents: Read and write** (required for `git push` and creating blobs)
   - **Metadata: Read**
   - **Pull requests: Read and write** (when opening PRs)
5. Save the token, then **replace** `GH_TOKEN` in the environment / Grok / Cursor with the new value. Editing an old token on GitHub does not update a copied secret until you paste it again.
6. Retry:

```powershell
gh auth status
gh api --method POST /repos/timus97/Arise/git/blobs -f content=dGVzdA== -f encoding=base64
git push origin main
```

The blob call must return a `sha`, not `Resource not accessible by personal access token`.

Do not run `gh auth status -t` in shared logs — it prints the raw token. Rotate the token if it was ever printed.

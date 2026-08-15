## Story

- Backlog ID:
- Mapped PR / design section:

## Summary

<!-- What changed and why. Keep v1-only. -->

## Reviewer checklist (Definition of Done)

- [ ] Started from pull of origin/main + feature branch (not main)
- [ ] Committed and pushed to GitHub before review
- [ ] Typecheck green
- [ ] Tests for this PR green (goldens / status codes / file paths cited in the story)
- [ ] Forbidden-string grep green (no Solo Leveling IP)
- [ ] No v1.1/v2 scope (push, Bluetooth, Apple XML, LLM, social, Workers Paid, Caddy, custom domain)
- [ ] Peer review PASS
- [ ] After PASS, merge pushed to origin/main
- [ ] Package name arise; chrome SYSTEM; intl not int

## Merge gate

- [ ] One approving review from the other senior (Dev A ↔ Dev B). Author does not self-merge on a failing or pending review.
- [ ] CI on this PR is green: lint, typecheck, tests, forbidden-string grep.
- [ ] No “fix in a follow-up” for load-bearing contract items.
- [ ] No deploy.yml / Cloudflare / Pages / Workers / Caddy in this PR.

Full DoD: `docs/backlog/DEFINITION_OF_DONE.md`. How to merge: `docs/dev/CI.md`.

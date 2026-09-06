---
name: gerrit
description: Submit, revise, or merge explicitly scoped Gerrit changes. Use for Gerrit review tasks, not ordinary local development or commits.
---

# Gerrit review

## Scope and target

- Read the repository remote, target branch, worktree status and exact commits before acting. Use the user's requested Change/Patchset or commit set; do not assume every commit ahead of the remote belongs to this task.
- Local commit, push for review, review vote, submit and deployment are distinct actions. Perform those already authorized for this task without asking again; ordinary development does not automatically authorize all of them.
- Gerrit repositories use `refs/for/<target-branch>` for review. Do not push directly to the branch to bypass review.
- Before a review push, fetch the intended target branch and inspect all commits it would introduce. Gerrit can create multiple Changes from one push. If unrelated commits are included, prepare an isolated checkout containing only the authorized commits.

## Submit or revise a review

Use the actual remote and branch in place of the placeholders:

```bash
git fetch <remote> <target-branch>
git log --oneline <fetched-target>..<authorized-tip>
git push <remote> <authorized-tip>:refs/for/<target-branch>
```

Each commit needs a `Change-Id` footer from the repository's Gerrit commit hook. If missing, install the hook from the actual Gerrit remote and amend only the intended commit. Preserve an existing Change-Id when revising its patchset; do not amend unrelated history.

After pushing, read the remote Change and verify its project, target branch and current patchset commit. A successful push is not evidence that the Change has merged.

## Vote and merge

Read current labels, submit requirements, dependencies and patchset identity first. A permitted +2 is not a substitute for an actual review or task authorization to vote. If review is authorized, record the review outcome for the exact patchset; never self-approve merely to clear an unmet gate.

If the task authorizes merging and submit requirements are satisfied, submit the exact Change/Patchset:

```bash
ssh <actual-gerrit-connection-options> gerrit review \
  --project <project> --branch <target-branch> \
  --submit <change-number>,<patchset>
```

For multiple authorized Changes, verify the exact dependency set and submit in dependency order. Do not feed `origin/master..HEAD` directly into bulk voting or submit commands. Respect missing reviewer permissions, failed verification and conflicts; report the actual blocker and continue only independent authorized work.

Read back remote status `MERGED` and the target branch commit before reporting a merge. Deployment is governed by the task's separate delivery scope.

## Recovery

- `missing Change-Id`: repair the hook/footer on the intended commit and retry the authorized push.
- `no new changes`: inspect the existing remote patchset; do not create an empty amendment solely to force a push.
- Rebase conflict: resolve only the authorized changes, rerun affected checks and verify the new patchset identity.
- Preserve uncommitted work. Use an isolated checkout when needed; do not use `reset --hard`, `clean` or force-push as a routine recovery step.

## Required Environment

- `git`
- `python3` for the bundled connectivity probe
- `ssh` when using SSH auth or running `gerrit review`
- `scp` when installing the `commit-msg` hook from Gerrit
- Network access to the Gerrit server
- Required environment contract:
  - Common: `GERRIT_AUTH_MODE`
  - HTTP mode: `GERRIT_URL`, `GERRIT_USERNAME`, `GERRIT_PASSWORD`
  - SSH mode: `GERRIT_SSH_HOST`, `GERRIT_SSH_PORT`, `GERRIT_SSH_USERNAME`

Check Git for Gerrit workflows; check Python only if using the optional bundled probe:

```bash
git --version
python3 --version
```

If the workflow needs SSH review or hook installation, also verify:

```bash
ssh -V
command -v scp
```


The bundled connection probe is optional when an existing authorized connection suffices. Check only tools needed for the requested operation. Resolve `scripts/` relative to this skill package.

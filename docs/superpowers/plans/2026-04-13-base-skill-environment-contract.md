# Base Skill Environment Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every bundled base skill package declare its required environment and the confirm-before-install flow for missing dependencies.

**Architecture:** Treat this as a content contract, not an onboarding feature. Lock the contract with a repo test, then update each base skill `SKILL.md` to include the same two-section environment pattern while keeping the workflow instructions intact.

**Tech Stack:** Vitest, Markdown skill packages

---

### Task 1: Lock the base skill documentation contract

**Files:**
- Create: `scripts/base-skill-docs.test.ts`

- [ ] **Step 1: Add a repo-level test for bundled base skills**

```ts
describe('base skill documentation contract', () => {
  it.each([
    { id: 'confluence', expectedSnippets: ['python3', 'scripts/requirements.txt', 'CONFLUENCE_*'] },
    { id: 'jira', expectedSnippets: ['python3', 'scripts/requirements.txt', 'JIRA_URL'] },
    { id: 'gerrit', expectedSnippets: ['git', 'ssh', 'python3', 'GERRIT_AUTH_MODE'] },
    { id: 'svn', expectedSnippets: ['svn', 'python3', 'SVN_URL'] },
    { id: 'mail', expectedSnippets: ['python3', 'scripts/requirements.txt', 'MAIL_HOST'] },
  ])('documents environment checks and confirm-before-install flow for $id', ({ id, expectedSnippets }) => {
    const content = readSkillDoc(id)
    expect(content).toContain('## Required Environment')
    expect(content).toContain('## Missing Environment Handling')
    expect(content).toContain('ask the user for confirmation')
    expect(content).toContain('install the missing dependency automatically')
    for (const snippet of expectedSnippets) expect(content).toContain(snippet)
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- scripts/base-skill-docs.test.ts`
Expected: FAIL because the current base skill docs do not yet include the new environment contract headings.

### Task 2: Update the bundled base skill guides

**Files:**
- Modify: `skills/confluence/SKILL.md`
- Modify: `skills/jira/SKILL.md`
- Modify: `skills/gerrit/SKILL.md`
- Modify: `skills/svn/SKILL.md`
- Modify: `skills/mail/SKILL.md`

- [ ] **Step 1: Add the environment contract sections**

```md
## Required Environment

- runtime executables
- required credential sources
- check commands

## Missing Environment Handling

1. summarize what is missing
2. ask the user for confirmation
3. install the missing dependency automatically
4. re-run checks and the probe
```

- [ ] **Step 2: Keep the instructions skill-specific**

```md
- Jira keeps `JIRA_URL`, `JIRA_USERNAME`, `JIRA_PASSWORD`
- Gerrit keeps `git`, `ssh`, `scp`, and mode-specific `GERRIT_*`
- SVN keeps `svn`, `python3`, and `SVN_*`
```

- [ ] **Step 3: Run the documentation contract test again**

Run: `npm test -- scripts/base-skill-docs.test.ts`
Expected: PASS

### Task 3: Verify the broader repository stays green

**Files:**
- Modify: `skills/manifest.json`

- [ ] **Step 1: Bump changed skill versions and refresh content hashes**

```json
{
  "id": "jira",
  "version": "1.0.2",
  "contentHash": "sha256:<updated>"
}
```

- [ ] **Step 2: Run targeted manifest coverage**

Run: `npm test -- scripts/skill-manifest.test.ts`
Expected: PASS

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test`
Expected: PASS

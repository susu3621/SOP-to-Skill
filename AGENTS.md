# Skills library maintenance

- `skills/` contains reusable integrations and their scripts; preserve their concrete environment, template and API contracts. A generic integration must not impose one project's release workflow on every caller.
- Skill descriptions identify when to use a capability. Put substantial optional procedures in references; ordinary file reads or small edits should not require every integration dependency.
- Preserve existing user authorization. Only block on information or capabilities needed for the requested operation, and continue independent authorized work.
- `test-output/` contains test fixtures, not installable production skills. Do not rewrite generated fixtures merely to change style.
- Local commits, remote review, publication and external writes follow the task's scope. Keep unrelated work out of the commit.

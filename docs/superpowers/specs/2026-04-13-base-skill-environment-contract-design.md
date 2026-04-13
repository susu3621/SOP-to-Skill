# Base Skill Environment Contract Design

## Goal

Make every bundled base skill package explicitly tell the agent:

1. what environment is required
2. how to check whether that environment is available
3. what to do when the environment is missing

The missing-environment rule is strict: the agent must ask the user for confirmation before installation, then install the missing dependency automatically after confirmation.

## Scope

This change applies to the bundled base skills exposed by onboarding:

- `confluence`
- `jira`
- `gerrit`
- `svn`
- `mail`

It does not change onboarding UI, credential fields, connection-test commands, or skill execution code.

## Documentation Contract

Each base skill `SKILL.md` must include:

- `## Required Environment`
- `## Missing Environment Handling`

The `Required Environment` section should list the minimum local runtime and the skill-specific access contract:

- executables such as `python3`, `git`, `ssh`, `scp`, or `svn`
- Python dependency expectations when the skill uses local scripts
- required environment variables or credential sources
- optional tools only when they gate an advertised workflow, such as Mermaid rendering

The section should also provide short check commands so the agent can verify the machine state before it starts a workflow.

## Missing Environment Rule

The `Missing Environment Handling` section must instruct the agent to:

1. stop and summarize what is missing
2. ask the user for confirmation before installing anything
3. install the missing dependency automatically after confirmation
4. re-run the environment checks and connection probe before continuing

This keeps the agent proactive without letting it silently mutate the machine.

## Skill-Specific Expectations

- `confluence`: document Python, supported credential sources, and optional Mermaid tooling
- `jira`: document Python and required `JIRA_*` credentials
- `mail`: document Python and required `MAIL_*` credentials
- `gerrit`: document `git`, `python3`, and the SSH tools needed for review flows
- `svn`: document `svn`, `python3`, and the current HTTP/HTTPS username-password contract

## Validation

Repository tests should fail if a bundled base skill no longer includes the environment contract headings or the confirm-before-install language.

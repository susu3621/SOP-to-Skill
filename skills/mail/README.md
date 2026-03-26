# Mail Skill for SMTP Delivery

This skill package is designed to be installed into an agent skill directory or copied as a standalone folder. It provides SMTP login probing, strict `MAIL_*` configuration loading, and Markdown-to-HTML email sending from local scripts.

## What This Package Includes

- `SKILL.md`: agent-facing usage guide with install-time path placeholders
- `scripts/mail_auth.py`: shared `MAIL_*` config loader
- `scripts/test_mail_login.py`: SMTP auth probe without sending mail
- `scripts/send_markdown_mail.py`: render Markdown and send an email
- `examples/sample-email.md`: example Markdown email body

## Install Into an Agent

From the repository root:

```bash
./scripts/install-skill.sh mail codex
./scripts/install-skill.sh mail claude-code
```

To remove it later:

```bash
./scripts/uninstall-skill.sh mail codex
./scripts/uninstall-skill.sh mail claude-code
```

If you are copying this package into another agent manually, copy the whole `skills/mail/` directory and keep the `scripts/` and `examples/` subdirectories together.

## Python Dependencies

From the installed skill directory:

```bash
python3 -m pip install -r scripts/requirements.txt
```

## Required Environment Variables

```bash
export MAIL_HOST="smtp.example.com"
export MAIL_PORT="465"
export MAIL_USERNAME="bot@example.com"
export MAIL_PASSWORD="secret"
export MAIL_FROM="bot@example.com"
export MAIL_USE_SSL="true"
export MAIL_USE_STARTTLS="false"
```

Optional:

```bash
export MAIL_TIMEOUT_SECONDS="30"
```

The scripts auto-discover `.env` and `.env.mail` while walking upward from the current directory. Use `--env-file /path/to/.env` when you want one specific file to override current shell values.

## Quick Start

```bash
python3 scripts/test_mail_login.py
python3 scripts/test_mail_login.py --env-file /path/to/.env
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --cc bob@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --bcc auditor@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --from-name "Delivery Bot"
```

## Output Behavior

- The plain-text part is the original Markdown content.
- The HTML part is rendered from Markdown and wrapped in a minimal HTML document.
- `bcc` recipients receive the message but are not added to message headers.
- Missing or invalid `MAIL_*` values fail immediately with a non-zero exit code.

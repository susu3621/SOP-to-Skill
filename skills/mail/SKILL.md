---
name: mail
description: Use when verifying SMTP credentials, sending email through SMTP from local scripts, or turning a Markdown file into an HTML email body for delivery.
---
# Mail Skill

Use this skill for SMTP email workflows. It supports login probing, strict `MAIL_*` configuration loading, and sending one Markdown file as a `multipart/alternative` message with plain-text and HTML parts.

## Quick Decision Matrix

| Task | Tool | Notes |
| --- | --- | --- |
| Verify SMTP connectivity and login | `scripts/test_mail_login.py` | Checks connection and authentication without sending mail |
| Send one Markdown file as an email | `scripts/send_markdown_mail.py` | Builds plain-text and HTML parts from the Markdown input |
| Reuse shared mail config loading | `scripts/mail_auth.py` | Auto-loads `.env` or `.env.mail` and fails fast on missing settings |

## Prerequisites

- Required environment variables:
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
  - `MAIL_FROM`
  - `MAIL_USE_SSL`
  - `MAIL_USE_STARTTLS`
- Optional environment variable:
  - `MAIL_TIMEOUT_SECONDS`
- Supported config sources:
  - `MAIL_*` environment variables
  - `.env`
  - `.env.mail`
  - `--env-file /path/to/.env`
- Python dependencies from `scripts/requirements.txt`

## Core Workflows

### Verify Login

```bash
python3 {{script_dir}}/test_mail_login.py
python3 {{script_dir}}/test_mail_login.py --env-file /path/to/.env
```

Use `--env-file` when the current shell may contain stale `MAIL_*` values and you want to force a specific credential file.

### Send Markdown Email

```bash
python3 {{script_dir}}/send_markdown_mail.py \
  {{skill_dir}}/examples/sample-email.md \
  --subject "Status Update" \
  --to alice@example.com

python3 {{script_dir}}/send_markdown_mail.py \
  {{skill_dir}}/examples/sample-email.md \
  --subject "Status Update" \
  --to alice@example.com \
  --cc bob@example.com \
  --bcc auditor@example.com \
  --from-name "Delivery Bot"

python3 {{script_dir}}/send_markdown_mail.py \
  /path/to/email.md \
  --subject "Status Update" \
  --to alice@example.com \
  --env-file /path/to/.env
```

At least one recipient is required through `--to`, `--cc`, or `--bcc`.

## Utility Scripts

| Script | Purpose |
| --- | --- |
| `scripts/mail_auth.py` | Shared credential discovery and strict `MAIL_*` parsing |
| `scripts/test_mail_login.py` | SMTP connectivity and login probe |
| `scripts/send_markdown_mail.py` | Markdown-to-HTML rendering plus email delivery |

## Notes

- `{{skill_dir}}` and `{{script_dir}}` are resolved during installation so the commands point at the installed skill package.
- `MAIL_USE_SSL` and `MAIL_USE_STARTTLS` must both be set explicitly.
- `MAIL_USE_SSL=true` and `MAIL_USE_STARTTLS=true` at the same time is rejected.
- Without `--env-file`, the scripts look for `.env` and `.env.mail` while walking upward from the current working directory.
- The email is sent as `multipart/alternative`: the raw Markdown becomes the plain-text part and the rendered HTML becomes the HTML part.

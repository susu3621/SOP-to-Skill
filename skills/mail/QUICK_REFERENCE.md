# Mail Skill Quick Reference

## Credential Sources

- `MAIL_*` environment variables
- `.env`
- `.env.mail`
- `--env-file /path/to/.env`

## Required Environment

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

## Auth Probe

```bash
python3 scripts/test_mail_login.py
python3 scripts/test_mail_login.py --env-file /path/to/.env
```

## Send Markdown Email

```bash
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --cc bob@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --bcc auditor@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --from-name "Delivery Bot"
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --env-file /path/to/.env
```

## Constraints

- At least one recipient is required via `--to`, `--cc`, or `--bcc`.
- The plain-text part is the raw Markdown input.
- The HTML part is rendered from Markdown.
- `bcc` recipients are not written into message headers.
- `MAIL_USE_SSL` and `MAIL_USE_STARTTLS` cannot both be `true`.

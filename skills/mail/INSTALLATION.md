# Mail Skill Installation

## 0. Install the skill package into an agent

From the repository root:

```bash
./scripts/install-skill.sh mail codex
./scripts/install-skill.sh mail claude-code
```

To uninstall:

```bash
./scripts/uninstall-skill.sh mail codex
./scripts/uninstall-skill.sh mail claude-code
```

If you are preparing another agent manually, copy the entire `skills/mail/` directory into that agent's skill root.

## 1. Install Python dependencies

From the installed skill directory:

```bash
python3 -m pip install -r scripts/requirements.txt
```

## 2. Configure environment variables

Set these variables directly or place them in `.env` or `.env.mail`:

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

`MAIL_USE_SSL` and `MAIL_USE_STARTTLS` must both be set explicitly, and they cannot both be `true`.

## 3. Verify login

```bash
python3 scripts/test_mail_login.py
python3 scripts/test_mail_login.py --env-file /path/to/.env
```

## 4. Send a test email

```bash
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --env-file /path/to/.env
python3 scripts/send_markdown_mail.py examples/sample-email.md --subject "Status Update" --to alice@example.com --cc bob@example.com --bcc auditor@example.com
```

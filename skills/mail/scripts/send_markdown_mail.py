#!/usr/bin/env python3

import argparse
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path
from typing import Callable, List, Optional, Sequence


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from mail_auth import load_mail_config  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Render a Markdown file to HTML and send it through SMTP."
    )
    parser.add_argument("markdown_file", help="Path to the Markdown file to send")
    parser.add_argument("--subject", required=True, help="Email subject")
    parser.add_argument("--to", action="append", default=[], help="Primary recipient")
    parser.add_argument("--cc", action="append", default=[], help="CC recipient")
    parser.add_argument("--bcc", action="append", default=[], help="BCC recipient")
    parser.add_argument("--from-name", default=None, help="Optional sender display name")
    parser.add_argument("--env-file", default=None, help="Optional path to an env file")
    return parser


def load_markdown(markdown_path: Path) -> str:
    if not markdown_path.is_file():
        raise FileNotFoundError(f"Markdown file not found: {markdown_path}")
    return markdown_path.read_text(encoding="utf-8")


def render_markdown_html(markdown_text: str) -> str:
    try:
        import markdown as markdown_lib
    except ImportError as exc:
        raise ImportError(
            "The 'markdown' package is required. Install it with: pip install -r scripts/requirements.txt"
        ) from exc

    return markdown_lib.markdown(markdown_text)


def wrap_html_document(body_html: str) -> str:
    return (
        "<html>"
        "<body>"
        f"{body_html}"
        "</body>"
        "</html>"
    )


def format_sender(sender: str, from_name: Optional[str]) -> str:
    if from_name:
        return f"{from_name} <{sender}>"
    return sender


def collect_recipients(to: Sequence[str], cc: Sequence[str], bcc: Sequence[str]) -> List[str]:
    recipients = [*to, *cc, *bcc]
    if not recipients:
        raise ValueError("At least one recipient is required via --to, --cc, or --bcc")
    return recipients


def build_email_message(
    markdown_path: Path,
    subject: str,
    sender: str,
    from_name: Optional[str],
    to: Sequence[str],
    cc: Sequence[str],
    bcc: Sequence[str],
    renderer: Callable[[str], str] = render_markdown_html,
) -> EmailMessage:
    markdown_text = load_markdown(markdown_path)
    body_html = wrap_html_document(renderer(markdown_text))

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = format_sender(sender, from_name)
    if to:
        message["To"] = ", ".join(to)
    if cc:
        message["Cc"] = ", ".join(cc)

    message.set_content(markdown_text)
    message.add_alternative(body_html, subtype="html")
    return message


def _smtp_client_kwargs(config: dict) -> dict:
    return {
        "host": config["host"],
        "port": config["port"],
        "timeout": config.get("timeout_seconds"),
    }


def send_email_message(
    config: dict,
    message: EmailMessage,
    recipients: Sequence[str],
    smtp_cls=smtplib.SMTP,
    smtp_ssl_cls=smtplib.SMTP_SSL,
) -> None:
    client_factory = smtp_ssl_cls if config["use_ssl"] else smtp_cls

    with client_factory(**_smtp_client_kwargs(config)) as smtp_client:
        if config["use_starttls"]:
            smtp_client.starttls()
        smtp_client.login(config["username"], config["password"])
        smtp_client.send_message(message, to_addrs=list(recipients))


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        recipients = collect_recipients(args.to, args.cc, args.bcc)
        config = load_mail_config(args.env_file)
        message = build_email_message(
            markdown_path=Path(args.markdown_file),
            subject=args.subject,
            sender=config["mail_from"],
            from_name=args.from_name,
            to=args.to,
            cc=args.cc,
            bcc=args.bcc,
        )
        send_email_message(config=config, message=message, recipients=recipients)
    except (FileNotFoundError, ImportError, OSError, ValueError, smtplib.SMTPException) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Email sent successfully.")
    print(f"subject: {args.subject}")
    print(f"recipients: {', '.join(recipients)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3

import argparse
import smtplib
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from mail_auth import load_mail_config  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify SMTP connectivity and login without sending mail.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to an env file containing MAIL_* settings",
    )
    return parser


def probe_mail_login(
    config: dict,
    smtp_cls=smtplib.SMTP,
    smtp_ssl_cls=smtplib.SMTP_SSL,
) -> dict:
    transport = "ssl" if config["use_ssl"] else "starttls" if config["use_starttls"] else "plain"
    client_factory = smtp_ssl_cls if config["use_ssl"] else smtp_cls

    with client_factory(
        config["host"],
        config["port"],
        timeout=config.get("timeout_seconds"),
    ) as smtp_client:
        if config["use_starttls"]:
            smtp_client.starttls()
        smtp_client.login(config["username"], config["password"])

    return {
        "transport": transport,
        "host": config["host"],
        "port": config["port"],
        "username": config["username"],
        "mail_from": config["mail_from"],
    }


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_mail_config(args.env_file)
        result = probe_mail_login(config=config)
    except (OSError, ValueError, smtplib.SMTPException) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print("Mail login succeeded.")
    print(f"host: {result['host']}")
    print(f"port: {result['port']}")
    print(f"username: {result['username']}")
    print(f"mail_from: {result['mail_from']}")
    print(f"transport: {result['transport']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

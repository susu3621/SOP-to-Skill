#!/usr/bin/env python3

import argparse
import json
import smtplib
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from mail_auth import load_mail_config  # noqa: E402


SERVICE_ID = "mail"
SERVICE_LABEL = "Mail"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify SMTP connectivity and login without sending mail.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to an env file containing MAIL_* settings",
    )
    parser.add_argument(
        "--test-only",
        action="store_true",
        help="Only run the connection probe and skip any side effects.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print a normalized JSON result payload.",
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


def format_success_details(result: dict) -> str:
    return "\n".join(
        [
            f"host: {result['host']}",
            f"port: {result['port']}",
            f"username: {result['username']}",
            f"mail_from: {result['mail_from']}",
            f"transport: {result['transport']}",
        ]
    )


def build_result(success: bool, summary: str, details: str) -> dict:
    return {
        "service_id": SERVICE_ID,
        "success": success,
        "status": "success" if success else "error",
        "summary": summary,
        "details": details,
    }


def emit_json_result(result: dict) -> None:
    print(json.dumps(result, ensure_ascii=False))


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_mail_config(args.env_file)
        result = probe_mail_login(config=config)
        payload = build_result(True, f"{SERVICE_LABEL} 连接成功", format_success_details(result))
    except (OSError, ValueError, smtplib.SMTPException) as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.json:
        emit_json_result(payload)
    else:
        print("Mail login succeeded.")
        print(format_success_details(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Minimal standalone Jira login probe."""

import argparse
import json
import os
import sys
from base64 import b64encode
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ENV_FILE_VARIANTS = [".env", ".env.jira", ".env.atlassian"]
SERVICE_ID = "jira"
SERVICE_LABEL = "Jira"


def require_env_var(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"{name} is required")
    return value


def normalize_base_url(url: str) -> str:
    return url.rstrip("/")


def build_api_url(base_url: str) -> str:
    parsed = urlsplit(base_url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("JIRA_URL must include scheme and host")
    normalized_base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
    return f"{normalized_base_url}/rest/api/2/myself"


def load_env_file(env_path: Path, *, override: bool) -> None:
    """Load simple KEY=VALUE pairs from a .env file."""
    for raw_line in env_path.read_text(errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            if override or key not in os.environ:
                os.environ[key] = value


def find_env_file(start_dir: Optional[Path] = None) -> Optional[Path]:
    current = (start_dir or Path.cwd()).resolve()

    for directory in [current, *current.parents]:
        for env_name in ENV_FILE_VARIANTS:
            candidate = directory / env_name
            if candidate.is_file():
                return candidate

    return None


def load_config_from_env(env_file: Optional[str] = None) -> Dict[str, str]:
    if env_file:
        env_path = Path(env_file)
        if not env_path.exists():
            raise ValueError(f"Specified env file not found: {env_file}")
        load_env_file(env_path, override=True)
    else:
        discovered_env = find_env_file()
        if discovered_env:
            load_env_file(discovered_env, override=True)

    base_url = normalize_base_url(require_env_var("JIRA_URL"))
    username = require_env_var("JIRA_USERNAME")
    password = require_env_var("JIRA_PASSWORD")
    api_url = build_api_url(base_url)

    return {
        "base_url": base_url,
        "api_url": api_url,
        "username": username,
        "password": password,
    }


def probe_jira_login(
    api_url: str,
    username: str,
    password: str,
    opener=urlopen,
) -> Dict[str, object]:
    token = b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    request = Request(
        api_url,
        headers={
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    with opener(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
        status_code = response.status if hasattr(response, "status") else response.getcode()

    return {
        "status_code": status_code,
        "name": payload.get("name"),
        "display_name": payload.get("displayName"),
        "email": payload.get("emailAddress"),
        "active": payload.get("active"),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify Jira authentication with a direct login probe.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to a .env file containing JIRA_URL/JIRA_USERNAME/JIRA_PASSWORD",
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


def format_success_details(result: Dict[str, object]) -> str:
    return "\n".join(
        [
            f"status_code: {result['status_code']}",
            f"name: {result['name']}",
            f"display_name: {result['display_name']}",
            f"email: {result['email']}",
            f"active: {result['active']}",
        ]
    )


def build_result(success: bool, summary: str, details: str) -> Dict[str, object]:
    return {
        "service_id": SERVICE_ID,
        "success": success,
        "status": "success" if success else "error",
        "summary": summary,
        "details": details,
    }


def emit_json_result(result: Dict[str, object]) -> None:
    print(json.dumps(result, ensure_ascii=False))


def print_human_success(config: Dict[str, str], result: Dict[str, object]) -> None:
    print(f"{SERVICE_LABEL} login succeeded.")
    print(f"base_url: {config['base_url']}")
    print(f"api_url: {config['api_url']}")
    print(format_success_details(result))


def print_human_failure(message: str) -> None:
    print(message, file=sys.stderr)


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_config_from_env(args.env_file)
        result = probe_jira_login(
            api_url=config["api_url"],
            username=config["username"],
            password=config["password"],
        )
        payload = build_result(True, f"{SERVICE_LABEL} 连接成功", format_success_details(result))
    except ValueError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print_human_failure(f"Configuration error: {exc}")
        return 1
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]
        details = f"HTTP {exc.code}"
        if body.strip():
            details = f"{details}: {body.strip()}"
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", details)
        if args.json:
            emit_json_result(payload)
        else:
            print_human_failure(f"Login failed with HTTP {exc.code}")
            if body.strip():
                print_human_failure(body.strip())
        return 1
    except URLError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", f"Request failed: {exc}")
        if args.json:
            emit_json_result(payload)
        else:
            print_human_failure(f"Request failed: {exc}")
        return 1

    if args.json:
        emit_json_result(payload)
    else:
        print_human_success(config, result)
    return 0


if __name__ == "__main__":
    sys.exit(main())

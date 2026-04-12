#!/usr/bin/env python3
"""Minimal standalone Confluence login probe.

This script intentionally bypasses the shared auth helper so it can be used to
compare raw environment-based authentication against other scripts.

Required environment variables:
- CONFLUENCE_URL
- CONFLUENCE_USERNAME
- CONFLUENCE_PASSWORD

For Atlassian Cloud, CONFLUENCE_PASSWORD should contain an API token.
"""

import argparse
import os
import sys
import json
from base64 import b64encode
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ENV_FILE_VARIANTS = [".env", ".env.confluence", ".env.jira", ".env.atlassian"]


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
        raise ValueError("CONFLUENCE_URL must include scheme and host")

    path = parsed.path.rstrip("/")
    if not path and parsed.netloc.endswith(".atlassian.net"):
        path = "/wiki"

    normalized_base_url = f"{parsed.scheme}://{parsed.netloc}{path}"
    return f"{normalized_base_url}/rest/api/user/current"


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

    base_url = normalize_base_url(require_env_var("CONFLUENCE_URL"))
    username = require_env_var("CONFLUENCE_USERNAME")
    password = require_env_var("CONFLUENCE_PASSWORD")
    api_url = build_api_url(base_url)

    return {
        "base_url": api_url[: -len("/rest/api/user/current")],
        "api_url": api_url,
        "username": username,
        "password": password,
    }


def probe_confluence_login(
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
        "account_id": payload.get("accountId"),
        "display_name": payload.get("displayName"),
        "email": payload.get("email"),
        "user_type": payload.get("type"),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify Confluence authentication with a direct login probe.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to a .env file containing CONFLUENCE_URL/CONFLUENCE_USERNAME/CONFLUENCE_PASSWORD",
    )
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_config_from_env(args.env_file)
        result = probe_confluence_login(
            api_url=config["api_url"],
            username=config["username"],
            password=config["password"],
        )
    except ValueError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 1
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]
        print(f"Login failed with HTTP {exc.code}", file=sys.stderr)
        print(body, file=sys.stderr)
        return 1
    except URLError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    print("Confluence login succeeded.")
    print(f"base_url: {config['base_url']}")
    print(f"api_url: {config['api_url']}")
    print(f"status_code: {result['status_code']}")
    print(f"display_name: {result['display_name']}")
    print(f"account_id: {result['account_id']}")
    print(f"email: {result['email']}")
    print(f"user_type: {result['user_type']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

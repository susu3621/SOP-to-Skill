#!/usr/bin/env python3
"""Minimal standalone Gerrit connection probe."""

import argparse
import json
import os
import subprocess
import sys
from base64 import b64encode
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ENV_FILE_VARIANTS = [".env", ".env.gerrit"]
SERVICE_ID = "gerrit"
SERVICE_LABEL = "Gerrit"


def require_env_var(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"{name} is required")
    return value


def load_env_file(env_path: Path, *, override: bool) -> None:
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
        if key and (override or key not in os.environ):
            os.environ[key] = value


def find_env_file(start_dir: Optional[Path] = None) -> Optional[Path]:
    current = (start_dir or Path.cwd()).resolve()

    for directory in [current, *current.parents]:
        for env_name in ENV_FILE_VARIANTS:
            candidate = directory / env_name
            if candidate.is_file():
                return candidate

    return None


def normalize_base_url(url: str) -> str:
    return url.rstrip("/")


def build_http_api_url(base_url: str) -> str:
    parsed = urlsplit(base_url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("GERRIT_URL must include scheme and host")

    return f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}/a/accounts/self/detail"


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

    auth_mode = os.getenv("GERRIT_AUTH_MODE", "http").strip() or "http"

    if auth_mode == "http":
        base_url = normalize_base_url(require_env_var("GERRIT_URL"))
        username = require_env_var("GERRIT_USERNAME")
        password = require_env_var("GERRIT_PASSWORD")
        api_url = build_http_api_url(base_url)
        return {
            "auth_mode": "http",
            "base_url": base_url,
            "api_url": api_url,
            "username": username,
            "password": password,
        }

    if auth_mode == "ssh":
        return {
            "auth_mode": "ssh",
            "host": require_env_var("GERRIT_SSH_HOST"),
            "port": require_env_var("GERRIT_SSH_PORT"),
            "username": require_env_var("GERRIT_SSH_USERNAME"),
        }

    raise ValueError(f"Unsupported GERRIT_AUTH_MODE: {auth_mode}")


def probe_gerrit_http(
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
        body = response.read().decode("utf-8-sig")
        if body.startswith(")]}'"):
            body = body[len(")]}'") :].lstrip("\r\n")
        payload = json.loads(body)
        status_code = response.status if hasattr(response, "status") else response.getcode()

    return {
        "status_code": status_code,
        "username": payload.get("username") or payload.get("name"),
        "email": payload.get("email"),
    }


def probe_gerrit_ssh(
    host: str,
    port: str,
    username: str,
    runner=subprocess.run,
) -> Dict[str, object]:
    completed = runner(
        ["ssh", "-p", port, f"{username}@{host}", "gerrit", "version"],
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )

    return {
        "command": "gerrit version",
        "output": completed.stdout.strip(),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify Gerrit connectivity with HTTP or SSH.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to a .env file containing Gerrit settings",
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


def format_success_details(auth_mode: str, result: Dict[str, object]) -> str:
    if auth_mode == "ssh":
        return "\n".join(
            [
                f"command: {result['command']}",
                f"output: {result['output']}",
            ]
        )

    return "\n".join(
        [
            f"status_code: {result['status_code']}",
            f"username: {result['username']}",
            f"email: {result['email']}",
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


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_config_from_env(args.env_file)
        if config["auth_mode"] == "ssh":
            result = probe_gerrit_ssh(
                host=config["host"],
                port=config["port"],
                username=config["username"],
            )
        else:
            result = probe_gerrit_http(
                api_url=config["api_url"],
                username=config["username"],
                password=config["password"],
            )
        payload = build_result(
            True,
            f"{SERVICE_LABEL} 连接成功",
            format_success_details(config["auth_mode"], result),
        )
    except ValueError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print(f"Configuration error: {exc}", file=sys.stderr)
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
            print(details, file=sys.stderr)
        return 1
    except URLError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", f"Request failed: {exc}")
        if args.json:
            emit_json_result(payload)
        else:
            print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except (OSError, subprocess.SubprocessError) as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print(str(exc), file=sys.stderr)
        return 1

    if args.json:
        emit_json_result(payload)
    else:
        print(f"{SERVICE_LABEL} connection succeeded.")
        print(payload["details"])
    return 0


if __name__ == "__main__":
    sys.exit(main())

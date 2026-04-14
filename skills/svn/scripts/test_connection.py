#!/usr/bin/env python3
"""Minimal standalone SVN connection probe."""

import argparse
import json
import locale
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional


ENV_FILE_VARIANTS = [".env", ".env.svn"]
SERVICE_ID = "svn"
SERVICE_LABEL = "SVN"


def decode_process_output(stream: Optional[object]) -> str:
    if stream is None:
        return ""

    if isinstance(stream, str):
        return stream

    if not isinstance(stream, (bytes, bytearray)):
        return str(stream)

    encodings = []
    preferred_encoding = locale.getpreferredencoding(False)
    if preferred_encoding:
        encodings.append(preferred_encoding)

    if os.name == "nt":
        encodings.extend(["mbcs", "gbk"])

    encodings.append("utf-8")

    seen = set()
    for encoding in encodings:
        normalized = encoding.lower()
        if normalized in seen:
            continue
        seen.add(normalized)

        try:
            return bytes(stream).decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue

    return bytes(stream).decode("utf-8", errors="replace")


def require_env_var(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"{name} is required")
    return value


def require_repository_field(repository: Dict[str, object], field_name: str) -> str:
    value = repository.get(field_name, "")
    if value is None:
        value = ""
    value_text = str(value).strip()
    if not value_text:
        raise ValueError(f"SVN repository {field_name} is required")
    return value_text


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


def load_config_from_repository_list() -> Optional[Dict[str, str]]:
    raw_repositories = os.getenv("SVN_REPOSITORIES_JSON")
    if not raw_repositories:
        return None

    try:
        repositories = json.loads(raw_repositories)
    except json.JSONDecodeError as exc:
        raise ValueError(f"SVN_REPOSITORIES_JSON is invalid JSON: {exc}") from exc

    if not isinstance(repositories, list):
        raise ValueError("SVN_REPOSITORIES_JSON must be a JSON array")
    if not repositories:
        raise ValueError("SVN_REPOSITORIES_JSON must contain at least one repository")

    for repository in repositories:
        if not isinstance(repository, dict):
            continue

        url = str(repository.get("url", "")).strip()
        username = str(repository.get("username", "")).strip()
        password = str(repository.get("password", ""))
        if url and username and password:
            return {
                "name": str(repository.get("name", "")).strip(),
                "url": url,
                "username": username,
                "password": password,
            }

    first_repository = repositories[0]
    if not isinstance(first_repository, dict):
        raise ValueError("SVN_REPOSITORIES_JSON entries must be JSON objects")

    return {
        "name": str(first_repository.get("name", "")).strip(),
        "url": require_repository_field(first_repository, "url"),
        "username": require_repository_field(first_repository, "username"),
        "password": require_repository_field(first_repository, "password"),
    }


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

    repository_config = load_config_from_repository_list()
    if repository_config is not None:
        return repository_config

    return {
        "name": "",
        "url": require_env_var("SVN_URL"),
        "username": require_env_var("SVN_USERNAME"),
        "password": require_env_var("SVN_PASSWORD"),
    }


def probe_svn(
    url: str,
    username: str,
    password: str,
    runner=subprocess.run,
) -> Dict[str, str]:
    completed = runner(
        [
            "svn",
            "info",
            url,
            "--non-interactive",
            "--username",
            username,
            "--password",
            password,
            "--no-auth-cache",
        ],
        capture_output=True,
        text=False,
        timeout=10,
        check=True,
    )

    return {
        "command": "svn info",
        "output": decode_process_output(getattr(completed, "stdout", None)).strip(),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify SVN connectivity over HTTP/HTTPS.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to a .env file containing SVN settings",
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
        result = probe_svn(
            url=config["url"],
            username=config["username"],
            password=config["password"],
        )
        payload = build_result(
            True,
            f"{SERVICE_LABEL} 连接成功",
            "\n".join(
                [
                    f"command: {result['command']}",
                    f"output: {result['output']}",
                ]
            ),
        )
    except ValueError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print(f"Configuration error: {exc}", file=sys.stderr)
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

#!/usr/bin/env python3
"""Minimal standalone Linux SSH connection probe."""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional


ENV_FILE_VARIANTS = [".env", ".env.linux"]
SERVICE_ID = "linux"
SERVICE_LABEL = "Linux"


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

    return {
        "device_name": require_env_var("LINUX_DEVICE_NAME"),
        "host": require_env_var("LINUX_HOST"),
        "username": require_env_var("LINUX_USERNAME"),
        "password": require_env_var("LINUX_PASSWORD"),
    }


def load_paramiko():
    try:
        import paramiko
    except ImportError as exc:  # pragma: no cover - depends on local environment
        raise RuntimeError("paramiko is required to probe Linux hosts") from exc

    return paramiko


def default_client_factory():
    return load_paramiko().SSHClient()


def default_auto_add_policy_factory():
    return load_paramiko().AutoAddPolicy()


def probe_linux_host(
    device_name: str,
    host: str,
    username: str,
    password: str,
    client_factory=default_client_factory,
    auto_add_policy_factory=default_auto_add_policy_factory,
) -> Dict[str, str]:
    client = client_factory()
    client.set_missing_host_key_policy(auto_add_policy_factory())

    try:
        client.connect(
            hostname=host,
            username=username,
            password=password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
        )
        return {
            "device_name": device_name,
            "host": host,
            "username": username,
        }
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify SSH connectivity to a Linux host.")
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional path to a .env file containing Linux device settings",
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
        result = probe_linux_host(
            device_name=config["device_name"],
            host=config["host"],
            username=config["username"],
            password=config["password"],
        )
        payload = build_result(
            True,
            f"{SERVICE_LABEL} 连接成功",
            "\n".join(
                [
                    f"device_name: {result['device_name']}",
                    f"host: {result['host']}",
                    f"username: {result['username']}",
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
    except RuntimeError as exc:
        payload = build_result(False, f"{SERVICE_LABEL} 连接失败", str(exc))
        if args.json:
            emit_json_result(payload)
        else:
            print(str(exc), file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - depends on remote host errors
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

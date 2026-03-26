import os
from pathlib import Path
from typing import Dict, Optional


ENV_FILE_VARIANTS = [".env", ".env.mail"]
TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def require_env_var(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def parse_boolean(name: str, raw_value: str) -> bool:
    normalized = raw_value.strip().lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False
    raise ValueError(f"{name} must be a boolean string")


def parse_integer(name: str, raw_value: str) -> int:
    try:
        return int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


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


def load_mail_config(env_file: Optional[str] = None) -> Dict[str, object]:
    if env_file:
        env_path = Path(env_file)
        if not env_path.is_file():
            raise ValueError(f"Specified env file not found: {env_file}")
        load_env_file(env_path, override=True)
    else:
        discovered_env = find_env_file()
        if discovered_env:
            load_env_file(discovered_env, override=True)

    host = require_env_var("MAIL_HOST")
    port = parse_integer("MAIL_PORT", require_env_var("MAIL_PORT"))
    username = require_env_var("MAIL_USERNAME")
    password = require_env_var("MAIL_PASSWORD")
    mail_from = require_env_var("MAIL_FROM")
    use_ssl = parse_boolean("MAIL_USE_SSL", require_env_var("MAIL_USE_SSL"))
    use_starttls = parse_boolean("MAIL_USE_STARTTLS", require_env_var("MAIL_USE_STARTTLS"))

    if use_ssl and use_starttls:
        raise ValueError("MAIL_USE_SSL and MAIL_USE_STARTTLS cannot both be true")

    config: Dict[str, object] = {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "mail_from": mail_from,
        "use_ssl": use_ssl,
        "use_starttls": use_starttls,
        "timeout_seconds": None,
    }

    timeout_value = os.getenv("MAIL_TIMEOUT_SECONDS")
    if timeout_value:
        config["timeout_seconds"] = parse_integer("MAIL_TIMEOUT_SECONDS", timeout_value)

    return config

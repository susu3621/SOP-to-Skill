import os
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv


ENV_FILE_VARIANTS = [".env", ".env.jira", ".env.atlassian"]


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value:
        return value
    raise ValueError(f"Missing required environment variable: {name}")


def find_env_file(start_dir: Optional[Path] = None) -> Optional[Path]:
    current = (start_dir or Path.cwd()).resolve()

    for directory in [current, *current.parents]:
        for env_name in ENV_FILE_VARIANTS:
            candidate = directory / env_name
            if candidate.is_file():
                return candidate

    return None


def load_config_from_env() -> Dict[str, str]:
    env_file = find_env_file()
    if env_file:
        load_dotenv(env_file)

    base_url = require_env("JIRA_URL").rstrip("/")
    username = require_env("JIRA_USERNAME")
    password = require_env("JIRA_PASSWORD")

    return {
        "base_url": base_url,
        "api_base": f"{base_url}/rest/api/2",
        "username": username,
        "password": password,
    }

import importlib.util
from pathlib import Path
import os
import sys
import types


EXAMPLE_ENV_FILE = Path(__file__).resolve().parents[1] / "examples" / ".env.confluence.example"
SELF_HOSTED_URL = "https://confluence.example.com"


def load_example_env_values():
    values = {}

    for raw_line in EXAMPLE_ENV_FILE.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

    return values


EXAMPLE_ENV = load_example_env_values()


def load_auth_module(module_name="confluence_auth_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "confluence_auth.py"
    assert script_path.exists(), f"Expected helper at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def install_fake_dotenv(monkeypatch):
    dotenv = types.ModuleType("dotenv")

    def fake_load_dotenv(path=None, override=False):
        if path is None:
            return False

        env_path = Path(path)
        for raw_line in env_path.read_text(errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.replace("export ", "").strip()
            value = value.strip().strip('"').strip("'")

            if key and (override or key not in os.environ):
                os.environ[key] = value

        return True

    dotenv.load_dotenv = fake_load_dotenv
    monkeypatch.setitem(sys.modules, "dotenv", dotenv)


def test_explicit_env_file_overrides_stale_shell_credentials(tmp_path, monkeypatch):
    install_fake_dotenv(monkeypatch)
    monkeypatch.setenv("CONFLUENCE_URL", "http://stale.example.com")
    monkeypatch.setenv("CONFLUENCE_USERNAME", "stale-user")
    monkeypatch.setenv("CONFLUENCE_PASSWORD", "stale-pass")

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"CONFLUENCE_URL={SELF_HOSTED_URL}\n"
        f"CONFLUENCE_USERNAME={EXAMPLE_ENV['CONFLUENCE_USERNAME']}\n"
        f"CONFLUENCE_PASSWORD={EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}\n"
    )

    module = load_auth_module("confluence_auth_explicit_env")

    creds = module.get_confluence_credentials(str(env_file))

    assert creds == {
        "url": SELF_HOSTED_URL,
        "username": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
        "token": EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
    }


def test_discovered_env_overrides_partial_stale_shell_credentials(tmp_path, monkeypatch):
    install_fake_dotenv(monkeypatch)
    monkeypatch.delenv("CONFLUENCE_URL", raising=False)
    monkeypatch.setenv("CONFLUENCE_USERNAME", "stale-user")
    monkeypatch.setenv("CONFLUENCE_PASSWORD", "stale-pass")
    monkeypatch.chdir(tmp_path)

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"CONFLUENCE_URL={SELF_HOSTED_URL}\n"
        f"CONFLUENCE_USERNAME={EXAMPLE_ENV['CONFLUENCE_USERNAME']}\n"
        f"CONFLUENCE_PASSWORD={EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}\n"
    )

    module = load_auth_module("confluence_auth_discovered_env")

    creds = module.get_confluence_credentials()

    assert creds == {
        "url": SELF_HOSTED_URL,
        "username": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
        "token": EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
    }

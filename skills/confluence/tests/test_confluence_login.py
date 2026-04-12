import importlib.util
import json
from pathlib import Path
import sys
from base64 import b64encode

import pytest


EXAMPLE_ENV_FILE = Path(__file__).resolve().parents[1] / "examples" / ".env.confluence.example"
SELF_HOSTED_URL = "https://confluence.example.com"
GENERIC_DISPLAY_NAME = "Example User"
GENERIC_ACCOUNT_ID = "abc123"


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
EXAMPLE_CLOUD_BASE_URL = f"{EXAMPLE_ENV['CONFLUENCE_URL']}/wiki"
EXAMPLE_CLOUD_API_URL = f"{EXAMPLE_CLOUD_BASE_URL}/rest/api/user/current"


def load_script_module(module_name="confluence_login_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_script_imports_without_requests_dependency(monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)

    module = load_script_module("confluence_login_probe_stdlib")

    assert hasattr(module, "load_config_from_env")


def test_load_config_requires_password(monkeypatch, tmp_path):
    for env_name in ("CONFLUENCE_URL", "CONFLUENCE_USERNAME", "CONFLUENCE_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module()

    with pytest.raises(ValueError, match="CONFLUENCE_URL"):
        module.load_config_from_env()


def test_load_config_builds_api_url(monkeypatch, tmp_path):
    monkeypatch.setenv("CONFLUENCE_URL", f"{EXAMPLE_ENV['CONFLUENCE_URL']}/")
    monkeypatch.setenv("CONFLUENCE_USERNAME", EXAMPLE_ENV["CONFLUENCE_USERNAME"])
    monkeypatch.setenv("CONFLUENCE_PASSWORD", EXAMPLE_ENV["CONFLUENCE_API_TOKEN"])
    monkeypatch.chdir(tmp_path)

    module = load_script_module()

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_CLOUD_BASE_URL
    assert config["api_url"] == EXAMPLE_CLOUD_API_URL
    assert config["username"] == EXAMPLE_ENV["CONFLUENCE_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["CONFLUENCE_API_TOKEN"]


def test_load_config_builds_server_api_url_without_wiki(monkeypatch, tmp_path):
    monkeypatch.setenv("CONFLUENCE_URL", SELF_HOSTED_URL)
    monkeypatch.setenv("CONFLUENCE_USERNAME", EXAMPLE_ENV["CONFLUENCE_USERNAME"])
    monkeypatch.setenv("CONFLUENCE_PASSWORD", EXAMPLE_ENV["CONFLUENCE_API_TOKEN"])
    monkeypatch.chdir(tmp_path)

    module = load_script_module("confluence_login_probe_server")

    config = module.load_config_from_env()

    assert config["base_url"] == SELF_HOSTED_URL
    assert config["api_url"] == f"{SELF_HOSTED_URL}/rest/api/user/current"


def test_load_config_supports_env_file(tmp_path, monkeypatch):
    for env_name in ("CONFLUENCE_URL", "CONFLUENCE_USERNAME", "CONFLUENCE_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"CONFLUENCE_URL={EXAMPLE_ENV['CONFLUENCE_URL']}\n"
        f"CONFLUENCE_USERNAME={EXAMPLE_ENV['CONFLUENCE_USERNAME']}\n"
        f"CONFLUENCE_PASSWORD={EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}\n"
    )

    module = load_script_module("confluence_login_probe_env_file")

    config = module.load_config_from_env(str(env_file))

    assert config["base_url"] == EXAMPLE_CLOUD_BASE_URL
    assert config["api_url"] == EXAMPLE_CLOUD_API_URL
    assert config["username"] == EXAMPLE_ENV["CONFLUENCE_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["CONFLUENCE_API_TOKEN"]


def test_load_config_discovers_env_in_current_directory(tmp_path, monkeypatch):
    for env_name in ("CONFLUENCE_URL", "CONFLUENCE_USERNAME", "CONFLUENCE_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"CONFLUENCE_URL={EXAMPLE_ENV['CONFLUENCE_URL']}\n"
        f"CONFLUENCE_USERNAME={EXAMPLE_ENV['CONFLUENCE_USERNAME']}\n"
        f"CONFLUENCE_PASSWORD={EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}\n"
    )
    monkeypatch.chdir(tmp_path)

    module = load_script_module("confluence_login_probe_default_env")

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_CLOUD_BASE_URL
    assert config["api_url"] == EXAMPLE_CLOUD_API_URL
    assert config["username"] == EXAMPLE_ENV["CONFLUENCE_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["CONFLUENCE_API_TOKEN"]


def test_discovered_env_overrides_stale_shell_credentials(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFLUENCE_URL", "http://stale.example.com")
    monkeypatch.setenv("CONFLUENCE_USERNAME", "stale-user")
    monkeypatch.setenv("CONFLUENCE_PASSWORD", "stale-pass")

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"CONFLUENCE_URL={EXAMPLE_ENV['CONFLUENCE_URL']}\n"
        f"CONFLUENCE_USERNAME={EXAMPLE_ENV['CONFLUENCE_USERNAME']}\n"
        f"CONFLUENCE_PASSWORD={EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}\n"
    )
    monkeypatch.chdir(tmp_path)

    module = load_script_module("confluence_login_probe_precedence")

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_CLOUD_BASE_URL
    assert config["username"] == EXAMPLE_ENV["CONFLUENCE_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["CONFLUENCE_API_TOKEN"]


def test_probe_confluence_login_returns_user_summary():
    module = load_script_module()

    requested = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return (
                b'{"type":"known","accountId":"abc123","displayName":"Example User",'
                b'"email":"your.email@example.com"}'
            )

    def fake_opener(request, timeout):
        requested["url"] = request.full_url
        requested["authorization"] = request.get_header("Authorization")
        requested["accept"] = request.get_header("Accept")
        requested["timeout"] = timeout
        return FakeResponse()

    result = module.probe_confluence_login(
        api_url=EXAMPLE_CLOUD_API_URL,
        username=EXAMPLE_ENV["CONFLUENCE_USERNAME"],
        password=EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
        opener=fake_opener,
    )

    assert requested == {
        "url": EXAMPLE_CLOUD_API_URL,
        "authorization": "Basic "
        + b64encode(
            f"{EXAMPLE_ENV['CONFLUENCE_USERNAME']}:{EXAMPLE_ENV['CONFLUENCE_API_TOKEN']}".encode(
                "utf-8"
            )
        ).decode("ascii"),
        "accept": "application/json",
        "timeout": 10,
    }
    assert result == {
        "status_code": 200,
        "account_id": GENERIC_ACCOUNT_ID,
        "display_name": GENERIC_DISPLAY_NAME,
        "email": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
        "user_type": "known",
    }


def test_main_returns_zero_for_success(monkeypatch, capsys):
    module = load_script_module()

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda env_file=None: {
            "base_url": EXAMPLE_CLOUD_BASE_URL,
            "api_url": EXAMPLE_CLOUD_API_URL,
            "username": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
            "password": EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
        },
    )
    monkeypatch.setattr(
        module,
        "probe_confluence_login",
        lambda **_: {
            "status_code": 200,
            "account_id": GENERIC_ACCOUNT_ID,
            "display_name": GENERIC_DISPLAY_NAME,
            "email": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
            "user_type": "known",
        },
    )

    exit_code = module.main([])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Confluence login succeeded." in captured.out
    assert f"display_name: {GENERIC_DISPLAY_NAME}" in captured.out


def test_main_supports_test_only_json_failure_output(monkeypatch, capsys):
    module = load_script_module("confluence_login_probe_json")

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda env_file=None: {
            "base_url": EXAMPLE_CLOUD_BASE_URL,
            "api_url": EXAMPLE_CLOUD_API_URL,
            "username": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
            "password": EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
        },
    )
    monkeypatch.setattr(
        module,
        "probe_confluence_login",
        lambda **_: (_ for _ in ()).throw(ValueError("HTTP 401: invalid token")),
    )

    exit_code = module.main(["--test-only", "--json"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert json.loads(captured.out) == {
        "service_id": "confluence",
        "success": False,
        "status": "error",
        "summary": "Confluence 连接失败",
        "details": "HTTP 401: invalid token",
    }
    assert captured.err == ""


def test_main_uses_real_cli_arguments(monkeypatch):
    module = load_script_module("confluence_login_probe_cli")
    called = {}

    monkeypatch.setattr(
        module.sys,
        "argv",
        ["test_connection.py", "--env-file", "/tmp/example.env"],
    )
    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda env_file=None: {
            "base_url": SELF_HOSTED_URL,
            "api_url": f"{SELF_HOSTED_URL}/rest/api/user/current",
            "username": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
            "password": EXAMPLE_ENV["CONFLUENCE_API_TOKEN"],
            "env_file": called.setdefault("env_file", env_file),
        },
    )
    monkeypatch.setattr(
        module,
        "probe_confluence_login",
        lambda **_: {
            "status_code": 200,
            "account_id": GENERIC_ACCOUNT_ID,
            "display_name": GENERIC_DISPLAY_NAME,
            "email": EXAMPLE_ENV["CONFLUENCE_USERNAME"],
            "user_type": "known",
        },
    )

    exit_code = module.main()

    assert exit_code == 0
    assert called["env_file"] == "/tmp/example.env"

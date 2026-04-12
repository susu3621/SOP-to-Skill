import importlib.util
import json
from pathlib import Path
import sys
from base64 import b64encode

import pytest


EXAMPLE_ENV_FILE = Path(__file__).resolve().parents[1] / "examples" / ".env.example"
GENERIC_ACCOUNT_NAME = "jira-user"
GENERIC_DISPLAY_NAME = "Jira User"


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


def load_script_module(module_name="jira_login_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_script_imports_without_requests_dependency(monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)
    monkeypatch.setitem(sys.modules, "dotenv", None)

    module = load_script_module("jira_login_probe_stdlib")

    assert hasattr(module, "load_config_from_env")


def test_load_config_requires_password(monkeypatch, tmp_path):
    for env_name in ("JIRA_URL", "JIRA_USERNAME", "JIRA_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module()

    with pytest.raises(ValueError, match="JIRA_URL"):
        module.load_config_from_env()


def test_load_config_builds_api_url(monkeypatch, tmp_path):
    monkeypatch.setenv("JIRA_URL", f"{EXAMPLE_ENV['JIRA_URL']}/")
    monkeypatch.setenv("JIRA_USERNAME", EXAMPLE_ENV["JIRA_USERNAME"])
    monkeypatch.setenv("JIRA_PASSWORD", EXAMPLE_ENV["JIRA_PASSWORD"])
    monkeypatch.chdir(tmp_path)

    module = load_script_module("jira_login_probe_server")

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_ENV["JIRA_URL"]
    assert config["api_url"] == f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself"
    assert config["username"] == EXAMPLE_ENV["JIRA_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["JIRA_PASSWORD"]


def test_load_config_supports_env_file(tmp_path, monkeypatch):
    for env_name in ("JIRA_URL", "JIRA_USERNAME", "JIRA_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"JIRA_URL={EXAMPLE_ENV['JIRA_URL']}\n"
        f"JIRA_USERNAME={EXAMPLE_ENV['JIRA_USERNAME']}\n"
        f"JIRA_PASSWORD={EXAMPLE_ENV['JIRA_PASSWORD']}\n"
    )

    module = load_script_module("jira_login_probe_env_file")

    config = module.load_config_from_env(str(env_file))

    assert config["base_url"] == EXAMPLE_ENV["JIRA_URL"]
    assert config["api_url"] == f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself"
    assert config["username"] == EXAMPLE_ENV["JIRA_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["JIRA_PASSWORD"]


def test_load_config_discovers_env_in_current_directory(tmp_path, monkeypatch):
    for env_name in ("JIRA_URL", "JIRA_USERNAME", "JIRA_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"JIRA_URL={EXAMPLE_ENV['JIRA_URL']}\n"
        f"JIRA_USERNAME={EXAMPLE_ENV['JIRA_USERNAME']}\n"
        f"JIRA_PASSWORD={EXAMPLE_ENV['JIRA_PASSWORD']}\n"
    )
    monkeypatch.chdir(tmp_path)

    module = load_script_module("jira_login_probe_default_env")

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_ENV["JIRA_URL"]
    assert config["api_url"] == f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself"
    assert config["username"] == EXAMPLE_ENV["JIRA_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["JIRA_PASSWORD"]


def test_discovered_env_overrides_stale_shell_credentials(tmp_path, monkeypatch):
    monkeypatch.setenv("JIRA_URL", "http://stale.example.com")
    monkeypatch.setenv("JIRA_USERNAME", "stale-user")
    monkeypatch.setenv("JIRA_PASSWORD", "stale-pass")

    env_file = tmp_path / ".env"
    env_file.write_text(
        f"JIRA_URL={EXAMPLE_ENV['JIRA_URL']}\n"
        f"JIRA_USERNAME={EXAMPLE_ENV['JIRA_USERNAME']}\n"
        f"JIRA_PASSWORD={EXAMPLE_ENV['JIRA_PASSWORD']}\n"
    )
    monkeypatch.chdir(tmp_path)

    module = load_script_module("jira_login_probe_precedence")

    config = module.load_config_from_env()

    assert config["base_url"] == EXAMPLE_ENV["JIRA_URL"]
    assert config["username"] == EXAMPLE_ENV["JIRA_USERNAME"]
    assert config["password"] == EXAMPLE_ENV["JIRA_PASSWORD"]


def test_probe_jira_login_returns_user_summary():
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
                b'{"name":"jira-user","displayName":"Jira User","emailAddress":"your.email@example.com",'
                b'"active":true}'
            )

    def fake_opener(request, timeout):
        requested["url"] = request.full_url
        requested["authorization"] = request.get_header("Authorization")
        requested["accept"] = request.get_header("Accept")
        requested["timeout"] = timeout
        return FakeResponse()

    result = module.probe_jira_login(
        api_url=f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself",
        username=EXAMPLE_ENV["JIRA_USERNAME"],
        password=EXAMPLE_ENV["JIRA_PASSWORD"],
        opener=fake_opener,
    )

    assert requested == {
        "url": f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself",
        "authorization": "Basic "
        + b64encode(
            f"{EXAMPLE_ENV['JIRA_USERNAME']}:{EXAMPLE_ENV['JIRA_PASSWORD']}".encode("utf-8")
        ).decode("ascii"),
        "accept": "application/json",
        "timeout": 10,
    }
    assert result == {
        "status_code": 200,
        "name": GENERIC_ACCOUNT_NAME,
        "display_name": GENERIC_DISPLAY_NAME,
        "email": EXAMPLE_ENV["JIRA_USERNAME"],
        "active": True,
    }


def test_main_returns_zero_for_success(monkeypatch, capsys):
    module = load_script_module("jira_login_probe_main")

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda env_file=None: {
            "base_url": EXAMPLE_ENV["JIRA_URL"],
            "api_url": f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself",
            "username": EXAMPLE_ENV["JIRA_USERNAME"],
            "password": EXAMPLE_ENV["JIRA_PASSWORD"],
        },
    )
    monkeypatch.setattr(
        module,
        "probe_jira_login",
        lambda **_: {
            "status_code": 200,
            "name": GENERIC_ACCOUNT_NAME,
            "display_name": GENERIC_DISPLAY_NAME,
            "email": EXAMPLE_ENV["JIRA_USERNAME"],
            "active": True,
        },
    )

    exit_code = module.main([])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Jira login succeeded." in captured.out
    assert f"display_name: {GENERIC_DISPLAY_NAME}" in captured.out


def test_main_supports_test_only_json_output(monkeypatch, capsys):
    module = load_script_module("jira_login_probe_json")

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda env_file=None: {
            "base_url": EXAMPLE_ENV["JIRA_URL"],
            "api_url": f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself",
            "username": EXAMPLE_ENV["JIRA_USERNAME"],
            "password": EXAMPLE_ENV["JIRA_PASSWORD"],
        },
    )
    monkeypatch.setattr(
        module,
        "probe_jira_login",
        lambda **_: {
            "status_code": 200,
            "name": GENERIC_ACCOUNT_NAME,
            "display_name": GENERIC_DISPLAY_NAME,
            "email": EXAMPLE_ENV["JIRA_USERNAME"],
            "active": True,
        },
    )

    exit_code = module.main(["--test-only", "--json"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert json.loads(captured.out) == {
        "service_id": "jira",
        "success": True,
        "status": "success",
        "summary": "Jira 连接成功",
        "details": "status_code: 200\nname: jira-user\ndisplay_name: Jira User\nemail: your.email@example.com\nactive: True",
    }
    assert captured.err == ""


def test_main_uses_real_cli_arguments(monkeypatch):
    module = load_script_module("jira_login_probe_cli")
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
            "base_url": EXAMPLE_ENV["JIRA_URL"],
            "api_url": f"{EXAMPLE_ENV['JIRA_URL']}/rest/api/2/myself",
            "username": EXAMPLE_ENV["JIRA_USERNAME"],
            "password": EXAMPLE_ENV["JIRA_PASSWORD"],
            "env_file": called.setdefault("env_file", env_file),
        },
    )
    monkeypatch.setattr(
        module,
        "probe_jira_login",
        lambda **_: {
            "status_code": 200,
            "name": GENERIC_ACCOUNT_NAME,
            "display_name": GENERIC_DISPLAY_NAME,
            "email": EXAMPLE_ENV["JIRA_USERNAME"],
            "active": True,
        },
    )

    exit_code = module.main()

    assert exit_code == 0
    assert called["env_file"] == "/tmp/example.env"

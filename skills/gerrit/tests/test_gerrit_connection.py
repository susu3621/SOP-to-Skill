import importlib.util
from base64 import b64encode
from pathlib import Path

import pytest


def load_script_module(module_name="gerrit_connection_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_load_config_defaults_to_http(monkeypatch, tmp_path):
    monkeypatch.setenv("GERRIT_URL", "https://gerrit.example.com")
    monkeypatch.setenv("GERRIT_USERNAME", "gerrit.user")
    monkeypatch.setenv("GERRIT_PASSWORD", "gerrit-secret")
    monkeypatch.delenv("GERRIT_AUTH_MODE", raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module("gerrit_connection_probe_http")

    config = module.load_config_from_env()

    assert config["auth_mode"] == "http"
    assert config["base_url"] == "https://gerrit.example.com"
    assert config["api_url"] == "https://gerrit.example.com/a/accounts/self/detail"
    assert config["username"] == "gerrit.user"
    assert config["password"] == "gerrit-secret"


def test_load_config_requires_http_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("GERRIT_AUTH_MODE", "http")
    monkeypatch.delenv("GERRIT_URL", raising=False)
    monkeypatch.delenv("GERRIT_USERNAME", raising=False)
    monkeypatch.delenv("GERRIT_PASSWORD", raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module("gerrit_connection_probe_http_error")

    with pytest.raises(ValueError, match="GERRIT_URL"):
        module.load_config_from_env()


def test_load_config_reads_ssh_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("GERRIT_AUTH_MODE", "ssh")
    monkeypatch.setenv("GERRIT_SSH_HOST", "gerrit.example.com")
    monkeypatch.setenv("GERRIT_SSH_PORT", "29418")
    monkeypatch.setenv("GERRIT_SSH_USERNAME", "gerrit.user")
    monkeypatch.chdir(tmp_path)

    module = load_script_module("gerrit_connection_probe_ssh")

    config = module.load_config_from_env()

    assert config["auth_mode"] == "ssh"
    assert config["host"] == "gerrit.example.com"
    assert config["port"] == "29418"
    assert config["username"] == "gerrit.user"


def test_probe_gerrit_http_builds_basic_auth_request():
    module = load_script_module("gerrit_connection_probe_http_request")

    requested = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return b'{"name":"gerrit.user","email":"your.email@example.com"}'

    def fake_opener(request, timeout):
        requested["url"] = request.full_url
        requested["authorization"] = request.get_header("Authorization")
        requested["accept"] = request.get_header("Accept")
        requested["timeout"] = timeout
        return FakeResponse()

    result = module.probe_gerrit_http(
        api_url="https://gerrit.example.com/a/accounts/self/detail",
        username="gerrit.user",
        password="gerrit-secret",
        opener=fake_opener,
    )

    assert requested == {
        "url": "https://gerrit.example.com/a/accounts/self/detail",
        "authorization": "Basic "
        + b64encode("gerrit.user:gerrit-secret".encode("utf-8")).decode("ascii"),
        "accept": "application/json",
        "timeout": 10,
    }
    assert result == {
        "status_code": 200,
        "username": "gerrit.user",
        "email": "your.email@example.com",
    }


def test_probe_gerrit_http_strips_xssi_prefix():
    module = load_script_module("gerrit_connection_probe_http_xssi")

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return b')]}\'\n{"name":"gerrit.user","email":"your.email@example.com"}'

    result = module.probe_gerrit_http(
        api_url="https://gerrit.example.com/a/accounts/self/detail",
        username="gerrit.user",
        password="gerrit-secret",
        opener=lambda request, timeout: FakeResponse(),
    )

    assert result == {
        "status_code": 200,
        "username": "gerrit.user",
        "email": "your.email@example.com",
    }


def test_probe_gerrit_ssh_runs_gerrit_version():
    module = load_script_module("gerrit_connection_probe_ssh_command")

    def fake_run(command, capture_output, text, timeout, check):
        assert command == [
            "ssh",
            "-p",
            "29418",
            "gerrit.user@gerrit.example.com",
            "gerrit",
            "version",
        ]
        assert capture_output is True
        assert text is True
        assert timeout == 10
        assert check is True

        class Completed:
            stdout = "gerrit version 3.10.0\n"

        return Completed()

    result = module.probe_gerrit_ssh(
        host="gerrit.example.com",
        port="29418",
        username="gerrit.user",
        runner=fake_run,
    )

    assert result == {
        "command": "gerrit version",
        "output": "gerrit version 3.10.0",
    }

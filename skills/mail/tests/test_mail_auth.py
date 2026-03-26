import importlib.util
from pathlib import Path

import pytest


def load_mail_auth_module(module_name: str = "mail_auth_module"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "mail_auth.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def clear_mail_env(monkeypatch):
    for env_name in (
        "MAIL_HOST",
        "MAIL_PORT",
        "MAIL_USERNAME",
        "MAIL_PASSWORD",
        "MAIL_FROM",
        "MAIL_USE_SSL",
        "MAIL_USE_STARTTLS",
        "MAIL_TIMEOUT_SECONDS",
    ):
        monkeypatch.delenv(env_name, raising=False)


def test_load_mail_config_requires_host(monkeypatch, tmp_path):
    clear_mail_env(monkeypatch)
    monkeypatch.chdir(tmp_path)

    module = load_mail_auth_module()

    with pytest.raises(ValueError, match="MAIL_HOST"):
        module.load_mail_config()


def test_load_mail_config_supports_env_file(monkeypatch, tmp_path):
    clear_mail_env(monkeypatch)

    env_file = tmp_path / ".env"
    env_file.write_text(
        "MAIL_HOST=smtp.example.com\n"
        "MAIL_PORT=465\n"
        "MAIL_USERNAME=bot@example.com\n"
        "MAIL_PASSWORD=secret\n"
        "MAIL_FROM=bot@example.com\n"
        "MAIL_USE_SSL=true\n"
        "MAIL_USE_STARTTLS=false\n"
        "MAIL_TIMEOUT_SECONDS=30\n"
    )

    module = load_mail_auth_module("mail_auth_env_file")

    config = module.load_mail_config(str(env_file))

    assert config == {
        "host": "smtp.example.com",
        "port": 465,
        "username": "bot@example.com",
        "password": "secret",
        "mail_from": "bot@example.com",
        "use_ssl": True,
        "use_starttls": False,
        "timeout_seconds": 30,
    }


def test_load_mail_config_discovers_env_and_overrides_stale_shell(monkeypatch, tmp_path):
    monkeypatch.setenv("MAIL_HOST", "stale.example.com")
    monkeypatch.setenv("MAIL_PORT", "587")
    monkeypatch.setenv("MAIL_USERNAME", "stale-user")
    monkeypatch.setenv("MAIL_PASSWORD", "stale-pass")
    monkeypatch.setenv("MAIL_FROM", "stale@example.com")
    monkeypatch.setenv("MAIL_USE_SSL", "false")
    monkeypatch.setenv("MAIL_USE_STARTTLS", "true")

    env_file = tmp_path / ".env"
    env_file.write_text(
        "MAIL_HOST=smtp.example.com\n"
        "MAIL_PORT=465\n"
        "MAIL_USERNAME=bot@example.com\n"
        "MAIL_PASSWORD=secret\n"
        "MAIL_FROM=bot@example.com\n"
        "MAIL_USE_SSL=true\n"
        "MAIL_USE_STARTTLS=false\n"
    )
    monkeypatch.chdir(tmp_path)

    module = load_mail_auth_module("mail_auth_discovery")

    config = module.load_mail_config()

    assert config["host"] == "smtp.example.com"
    assert config["port"] == 465
    assert config["username"] == "bot@example.com"
    assert config["password"] == "secret"
    assert config["mail_from"] == "bot@example.com"
    assert config["use_ssl"] is True
    assert config["use_starttls"] is False


def test_load_mail_config_rejects_conflicting_tls_flags(monkeypatch, tmp_path):
    clear_mail_env(monkeypatch)
    monkeypatch.setenv("MAIL_HOST", "smtp.example.com")
    monkeypatch.setenv("MAIL_PORT", "465")
    monkeypatch.setenv("MAIL_USERNAME", "bot@example.com")
    monkeypatch.setenv("MAIL_PASSWORD", "secret")
    monkeypatch.setenv("MAIL_FROM", "bot@example.com")
    monkeypatch.setenv("MAIL_USE_SSL", "true")
    monkeypatch.setenv("MAIL_USE_STARTTLS", "true")
    monkeypatch.chdir(tmp_path)

    module = load_mail_auth_module("mail_auth_conflict")

    with pytest.raises(ValueError, match="MAIL_USE_SSL"):
        module.load_mail_config()


def test_load_mail_config_rejects_invalid_boolean(monkeypatch, tmp_path):
    clear_mail_env(monkeypatch)
    monkeypatch.setenv("MAIL_HOST", "smtp.example.com")
    monkeypatch.setenv("MAIL_PORT", "465")
    monkeypatch.setenv("MAIL_USERNAME", "bot@example.com")
    monkeypatch.setenv("MAIL_PASSWORD", "secret")
    monkeypatch.setenv("MAIL_FROM", "bot@example.com")
    monkeypatch.setenv("MAIL_USE_SSL", "maybe")
    monkeypatch.setenv("MAIL_USE_STARTTLS", "false")
    monkeypatch.chdir(tmp_path)

    module = load_mail_auth_module("mail_auth_invalid_bool")

    with pytest.raises(ValueError, match="MAIL_USE_SSL"):
        module.load_mail_config()

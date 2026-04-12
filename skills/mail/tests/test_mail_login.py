import importlib.util
from pathlib import Path
import smtplib

import pytest


def load_script_module(module_name="mail_login_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def sample_config(**overrides):
    config = {
        "host": "smtp.example.com",
        "port": 465,
        "username": "bot@example.com",
        "password": "secret",
        "mail_from": "bot@example.com",
        "use_ssl": True,
        "use_starttls": False,
        "timeout_seconds": 30,
    }
    config.update(overrides)
    return config


def test_script_imports_and_reuses_mail_config_loader():
    module = load_script_module("mail_login_probe_import")
    assert hasattr(module, "load_mail_config")


def test_probe_mail_login_uses_smtp_ssl():
    module = load_script_module("mail_login_probe_ssl")
    calls = {}

    class FakeSMTPSSL:
        def __init__(self, host, port, timeout=None):
            calls["host"] = host
            calls["port"] = port
            calls["timeout"] = timeout

        def __enter__(self):
            calls["entered"] = True
            return self

        def __exit__(self, exc_type, exc, tb):
            calls["exited"] = True
            return False

        def login(self, username, password):
            calls["login"] = (username, password)

    result = module.probe_mail_login(
        config=sample_config(),
        smtp_ssl_cls=FakeSMTPSSL,
    )

    assert calls == {
        "host": "smtp.example.com",
        "port": 465,
        "timeout": 30,
        "entered": True,
        "login": ("bot@example.com", "secret"),
        "exited": True,
    }
    assert result["transport"] == "ssl"


def test_probe_mail_login_uses_starttls():
    module = load_script_module("mail_login_probe_starttls")
    calls = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            calls["host"] = host
            calls["port"] = port
            calls["timeout"] = timeout

        def __enter__(self):
            calls["entered"] = True
            return self

        def __exit__(self, exc_type, exc, tb):
            calls["exited"] = True
            return False

        def starttls(self):
            calls["starttls"] = True

        def login(self, username, password):
            calls["login"] = (username, password)

    result = module.probe_mail_login(
        config=sample_config(port=587, use_ssl=False, use_starttls=True, timeout_seconds=None),
        smtp_cls=FakeSMTP,
    )

    assert calls["host"] == "smtp.example.com"
    assert calls["port"] == 587
    assert calls["timeout"] is None
    assert calls["starttls"] is True
    assert calls["login"] == ("bot@example.com", "secret")
    assert result["transport"] == "starttls"


def test_main_returns_zero_for_success(monkeypatch, capsys):
    module = load_script_module("mail_login_probe_main_success")

    monkeypatch.setattr(module, "load_mail_config", lambda env_file=None: sample_config())
    monkeypatch.setattr(
        module,
        "probe_mail_login",
        lambda **_: {
            "transport": "ssl",
            "host": "smtp.example.com",
            "port": 465,
            "username": "bot@example.com",
            "mail_from": "bot@example.com",
        },
    )

    exit_code = module.main([])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Mail login succeeded." in captured.out
    assert "transport: ssl" in captured.out
    assert "password" not in captured.out.lower()


def test_main_uses_real_cli_arguments(monkeypatch):
    module = load_script_module("mail_login_probe_cli")
    called = {}

    monkeypatch.setattr(
        module.sys,
        "argv",
        ["test_connection.py", "--env-file", "/tmp/mail.env"],
    )
    monkeypatch.setattr(
        module,
        "load_mail_config",
        lambda env_file=None: sample_config(env_file=called.setdefault("env_file", env_file)),
    )
    monkeypatch.setattr(
        module,
        "probe_mail_login",
        lambda **_: {
            "transport": "ssl",
            "host": "smtp.example.com",
            "port": 465,
            "username": "bot@example.com",
            "mail_from": "bot@example.com",
        },
    )

    exit_code = module.main()

    assert exit_code == 0
    assert called["env_file"] == "/tmp/mail.env"


def test_main_returns_one_for_smtp_errors(monkeypatch, capsys):
    module = load_script_module("mail_login_probe_failure")

    monkeypatch.setattr(module, "load_mail_config", lambda env_file=None: sample_config(password="secret"))
    monkeypatch.setattr(
        module,
        "probe_mail_login",
        lambda **_: (_ for _ in ()).throw(smtplib.SMTPAuthenticationError(535, b"bad auth")),
    )

    exit_code = module.main([])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "Error:" in captured.err
    assert "secret" not in captured.err

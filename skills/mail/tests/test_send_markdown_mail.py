import importlib.util
from pathlib import Path

import pytest


def load_send_module(module_name: str = "send_markdown_mail"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "send_markdown_mail.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_build_email_message_creates_plain_and_html_parts(tmp_path):
    markdown_file = tmp_path / "email.md"
    markdown_file.write_text("# Status\n\nAll systems go.\n")

    module = load_send_module("send_markdown_mail_build")

    message = module.build_email_message(
        markdown_path=markdown_file,
        subject="Weekly Status",
        sender="bot@example.com",
        from_name="Miivii Bot",
        to=["alice@example.com"],
        cc=["bob@example.com"],
        bcc=["carol@example.com"],
        renderer=lambda text: "<h1>Status</h1><p>All systems go.</p>",
    )

    assert message.get_content_type() == "multipart/alternative"
    assert message["Subject"] == "Weekly Status"
    assert message["From"] == "Miivii Bot <bot@example.com>"
    assert message["To"] == "alice@example.com"
    assert message["Cc"] == "bob@example.com"
    assert message["Bcc"] is None

    parts = list(message.iter_parts())
    assert len(parts) == 2
    assert parts[0].get_content_type() == "text/plain"
    assert parts[0].get_content().strip() == "# Status\n\nAll systems go."
    assert parts[1].get_content_type() == "text/html"
    assert "<html>" in parts[1].get_content()
    assert "<h1>Status</h1>" in parts[1].get_content()


def test_send_email_message_uses_smtp_ssl():
    module = load_send_module("send_markdown_mail_ssl")
    calls = {}

    class FakeSMTPSSL:
        def __init__(self, host, port, timeout=None):
            calls["host"] = host
            calls["port"] = port
            calls["timeout"] = timeout
            calls["client"] = self

        def __enter__(self):
            calls["entered"] = True
            return self

        def __exit__(self, exc_type, exc, tb):
            calls["exited"] = True
            return False

        def login(self, username, password):
            calls["login"] = (username, password)

        def send_message(self, message, to_addrs):
            calls["send_message"] = {
                "subject": message["Subject"],
                "to_addrs": to_addrs,
            }

    message = module.EmailMessage()
    message["Subject"] = "Weekly Status"

    module.send_email_message(
        config={
            "host": "smtp.example.com",
            "port": 465,
            "username": "bot@example.com",
            "password": "secret",
            "use_ssl": True,
            "use_starttls": False,
            "timeout_seconds": 30,
        },
        message=message,
        recipients=["alice@example.com"],
        smtp_ssl_cls=FakeSMTPSSL,
    )

    assert calls == {
        "host": "smtp.example.com",
        "port": 465,
        "timeout": 30,
        "client": calls["client"],
        "entered": True,
        "login": ("bot@example.com", "secret"),
        "send_message": {
            "subject": "Weekly Status",
            "to_addrs": ["alice@example.com"],
        },
        "exited": True,
    }


def test_send_email_message_uses_starttls():
    module = load_send_module("send_markdown_mail_starttls")
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

        def send_message(self, message, to_addrs):
            calls["send_message"] = {
                "subject": message["Subject"],
                "to_addrs": to_addrs,
            }

    message = module.EmailMessage()
    message["Subject"] = "Weekly Status"

    module.send_email_message(
        config={
            "host": "smtp.example.com",
            "port": 587,
            "username": "bot@example.com",
            "password": "secret",
            "use_ssl": False,
            "use_starttls": True,
            "timeout_seconds": None,
        },
        message=message,
        recipients=["alice@example.com", "bob@example.com"],
        smtp_cls=FakeSMTP,
    )

    assert calls["host"] == "smtp.example.com"
    assert calls["port"] == 587
    assert calls["timeout"] is None
    assert calls["starttls"] is True
    assert calls["login"] == ("bot@example.com", "secret")
    assert calls["send_message"]["to_addrs"] == ["alice@example.com", "bob@example.com"]


def test_main_uses_env_file_and_prints_success(monkeypatch, tmp_path, capsys):
    markdown_file = tmp_path / "email.md"
    markdown_file.write_text("# Status\n\nAll systems go.\n")

    module = load_send_module("send_markdown_mail_main")
    called = {}

    monkeypatch.setattr(
        module,
        "load_mail_config",
        lambda env_file=None: {
            "host": "smtp.example.com",
            "port": 465,
            "username": "bot@example.com",
            "password": "secret",
            "mail_from": "bot@example.com",
            "use_ssl": True,
            "use_starttls": False,
            "timeout_seconds": 30,
            "env_file": called.setdefault("env_file", env_file),
        },
    )
    monkeypatch.setattr(
        module,
        "send_email_message",
        lambda **kwargs: called.setdefault("send", kwargs),
    )
    monkeypatch.setattr(
        module,
        "build_email_message",
        lambda **kwargs: module.EmailMessage(),
    )

    exit_code = module.main(
        [
            str(markdown_file),
            "--subject",
            "Weekly Status",
            "--to",
            "alice@example.com",
            "--env-file",
            "/tmp/mail.env",
        ]
    )
    captured = capsys.readouterr()

    assert exit_code == 0
    assert called["env_file"] == "/tmp/mail.env"
    assert called["send"]["recipients"] == ["alice@example.com"]
    assert "Email sent successfully." in captured.out


def test_main_rejects_missing_recipients(tmp_path, capsys):
    markdown_file = tmp_path / "email.md"
    markdown_file.write_text("# Status\n\nAll systems go.\n")

    module = load_send_module("send_markdown_mail_no_recipients")

    exit_code = module.main([str(markdown_file), "--subject", "Weekly Status"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "At least one recipient" in captured.err

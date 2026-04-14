import importlib.util
import json
from pathlib import Path


def load_script_module(module_name="svn_connection_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_load_config_requires_svn_fields(monkeypatch, tmp_path):
    monkeypatch.delenv("SVN_REPOSITORIES_JSON", raising=False)
    monkeypatch.delenv("SVN_URL", raising=False)
    monkeypatch.delenv("SVN_USERNAME", raising=False)
    monkeypatch.delenv("SVN_PASSWORD", raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module("svn_connection_probe_missing")

    try:
        module.load_config_from_env()
    except ValueError as error:
        assert "SVN_URL" in str(error)
    else:
        raise AssertionError("expected load_config_from_env to reject missing SVN_URL")


def test_load_config_prefers_first_complete_repository_from_structured_env(monkeypatch, tmp_path):
    monkeypatch.setenv(
        "SVN_REPOSITORIES_JSON",
        json.dumps(
            [
                {
                    "id": "svn-repository-1",
                    "name": "Draft Repo",
                    "url": "",
                    "username": "",
                    "password": "",
                },
                {
                    "id": "svn-repository-2",
                    "name": "Project Repo",
                    "url": "https://svn.example.com/repos/project",
                    "username": "svn.user",
                    "password": "svn-secret",
                },
            ]
        ),
    )
    monkeypatch.delenv("SVN_URL", raising=False)
    monkeypatch.delenv("SVN_USERNAME", raising=False)
    monkeypatch.delenv("SVN_PASSWORD", raising=False)
    monkeypatch.chdir(tmp_path)

    module = load_script_module("svn_connection_probe_structured_env")

    assert module.load_config_from_env() == {
        "name": "Project Repo",
        "url": "https://svn.example.com/repos/project",
        "username": "svn.user",
        "password": "svn-secret",
    }


def test_load_config_falls_back_to_legacy_svn_env_vars(monkeypatch, tmp_path):
    monkeypatch.delenv("SVN_REPOSITORIES_JSON", raising=False)
    monkeypatch.setenv("SVN_URL", "https://svn.example.com/legacy")
    monkeypatch.setenv("SVN_USERNAME", "legacy.user")
    monkeypatch.setenv("SVN_PASSWORD", "legacy-secret")
    monkeypatch.chdir(tmp_path)

    module = load_script_module("svn_connection_probe_legacy_env")

    assert module.load_config_from_env() == {
        "name": "",
        "url": "https://svn.example.com/legacy",
        "username": "legacy.user",
        "password": "legacy-secret",
    }


def test_probe_svn_runs_svn_info():
    module = load_script_module("svn_connection_probe_command")

    def fake_run(command, capture_output, text, timeout, check):
        assert command == [
            "svn",
            "info",
            "https://svn.example.com/repo",
            "--non-interactive",
            "--username",
            "svn.user",
            "--password",
            "svn-secret",
            "--no-auth-cache",
        ]
        assert capture_output is True
        assert text is False
        assert timeout == 10
        assert check is True

        class Completed:
            stdout = b"Path: repo\nRevision: 123\n"

        return Completed()

    result = module.probe_svn(
        url="https://svn.example.com/repo",
        username="svn.user",
        password="svn-secret",
        runner=fake_run,
    )

    assert result == {
        "command": "svn info",
        "output": "Path: repo\nRevision: 123",
    }


def test_probe_svn_decodes_windows_local_codepage_output(monkeypatch):
    module = load_script_module("svn_connection_probe_windows_encoding")
    monkeypatch.setattr(module.locale, "getpreferredencoding", lambda _do_setlocale=False: "utf-8")
    monkeypatch.setattr(module.os, "name", "nt")

    def fake_run(command, capture_output, text, timeout, check):
        assert command == [
            "svn",
            "info",
            "https://svn.example.com/repo",
            "--non-interactive",
            "--username",
            "svn.user",
            "--password",
            "svn-secret",
            "--no-auth-cache",
        ]
        assert capture_output is True
        assert text is False
        assert timeout == 10
        assert check is True

        class Completed:
            stdout = "路径: repo\n版本: 123\n".encode("gbk")

        return Completed()

    result = module.probe_svn(
        url="https://svn.example.com/repo",
        username="svn.user",
        password="svn-secret",
        runner=fake_run,
    )

    assert result == {
        "command": "svn info",
        "output": "路径: repo\n版本: 123",
    }


def test_probe_svn_treats_missing_stdout_as_empty_output():
    module = load_script_module("svn_connection_probe_missing_stdout")

    def fake_run(command, capture_output, text, timeout, check):
        assert capture_output is True
        assert text is False

        class Completed:
            stdout = None

        return Completed()

    result = module.probe_svn(
        url="https://svn.example.com/repo",
        username="svn.user",
        password="svn-secret",
        runner=fake_run,
    )

    assert result == {
        "command": "svn info",
        "output": "",
    }

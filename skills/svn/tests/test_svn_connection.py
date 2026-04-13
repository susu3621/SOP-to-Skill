import importlib.util
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
        assert text is True
        assert timeout == 10
        assert check is True

        class Completed:
            stdout = "Path: repo\nRevision: 123\n"

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

import importlib.util
from pathlib import Path


def load_script_module(module_name="server_filesystem_connection_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_load_config_reads_server_filesystem_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("SERVER_FILESYSTEM_IP", "192.168.9.30")
    monkeypatch.setenv("SERVER_FILESYSTEM_USERNAME", "wiki")
    monkeypatch.setenv("SERVER_FILESYSTEM_PASSWORD", "server-secret")
    monkeypatch.chdir(tmp_path)

    module = load_script_module("server_filesystem_connection_probe_config")

    assert module.load_config_from_env() == {
        "ip": "192.168.9.30",
        "username": "wiki",
        "password": "server-secret",
    }


def test_probe_server_filesystem_connects_with_paramiko_client():
    module = load_script_module("server_filesystem_connection_probe_connect")
    recorded = {}

    class FakePolicy:
        pass

    class FakeClient:
        def set_missing_host_key_policy(self, policy):
            recorded["policy"] = policy

        def connect(
            self,
            hostname,
            username,
            password,
            timeout,
            look_for_keys,
            allow_agent,
        ):
            recorded["connect"] = {
                "hostname": hostname,
                "username": username,
                "password": password,
                "timeout": timeout,
                "look_for_keys": look_for_keys,
                "allow_agent": allow_agent,
            }

        def close(self):
            recorded["closed"] = True

    result = module.probe_server_filesystem(
        ip="192.168.9.30",
        username="wiki",
        password="server-secret",
        client_factory=FakeClient,
        auto_add_policy_factory=FakePolicy,
    )

    assert isinstance(recorded["policy"], FakePolicy)
    assert recorded["connect"] == {
        "hostname": "192.168.9.30",
        "username": "wiki",
        "password": "server-secret",
        "timeout": 10,
        "look_for_keys": False,
        "allow_agent": False,
    }
    assert recorded["closed"] is True
    assert result == {
        "ip": "192.168.9.30",
        "username": "wiki",
    }

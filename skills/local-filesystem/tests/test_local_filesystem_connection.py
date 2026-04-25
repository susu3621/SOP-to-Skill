import importlib.util
from pathlib import Path


def load_script_module(module_name="local_filesystem_connection_probe"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_load_config_reads_local_filesystem_path(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCAL_FILESYSTEM_PATH", str(tmp_path))
    monkeypatch.chdir(tmp_path)

    module = load_script_module("local_filesystem_connection_probe_config")

    assert module.load_config_from_env() == {"path": str(tmp_path)}


def test_probe_local_filesystem_path_accepts_existing_directory(tmp_path):
    module = load_script_module("local_filesystem_connection_probe_path")

    result = module.probe_local_filesystem_path(str(tmp_path))

    assert result == {"path": str(tmp_path.resolve())}

import importlib.util
from pathlib import Path
import sys

import pytest


def load_issue_module(module_name="get_jira_issue_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "get_jira_issue.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    scripts_dir = str(script_path.parent)
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_script_imports_without_requests_dependency(monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)

    module = load_issue_module("get_jira_issue_stdlib")

    assert hasattr(module, "build_parser")


def test_fetch_issue_requests_expanded_fields_and_changelog():
    module = load_issue_module("get_jira_issue_request")
    requested = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"key": "PROJ-123", "fields": {}, "changelog": {"histories": []}}

    class FakeSession:
        def get(self, url, params, auth, timeout):
            requested["url"] = url
            requested["params"] = params
            requested["auth"] = auth
            requested["timeout"] = timeout
            return FakeResponse()

    config = {
        "api_base": "https://jira.example.com/rest/api/2",
        "username": "user@example.com",
        "password": "secret",
    }

    module.fetch_issue(config, "PROJ-123", session=FakeSession())

    assert requested == {
        "url": "https://jira.example.com/rest/api/2/issue/PROJ-123",
        "params": {
            "fields": (
                "summary,status,issuetype,priority,reporter,assignee,created,updated,"
                "labels,components,fixVersions,description,comment,parent,subtasks,"
                "issuelinks,resolution,resolutiondate"
            ),
            "expand": "changelog",
        },
        "auth": ("user@example.com", "secret"),
        "timeout": 20,
    }


def test_format_issue_details_renders_all_expanded_sections():
    module = load_issue_module("get_jira_issue_format")

    payload = {
        "key": "PROJ-123",
        "fields": {
            "summary": "Login fails on VPN",
            "status": {"name": "In Progress"},
            "issuetype": {"name": "Bug"},
            "priority": {"name": "High"},
            "reporter": {"displayName": "Alice"},
            "assignee": {"displayName": "Bob"},
            "created": "2026-03-01T08:00:00.000+0000",
            "updated": "2026-03-05T09:30:00.000+0000",
            "labels": ["auth", "vpn"],
            "components": [{"name": "Gateway"}],
            "fixVersions": [{"name": "2026.03"}],
            "description": "Example description",
            "resolution": {"name": "Fixed"},
            "resolutiondate": "2026-03-06T10:00:00.000+0000",
            "parent": {
                "key": "PROJ-100",
                "fields": {
                    "summary": "Authentication epic",
                    "status": {"name": "In Progress"},
                },
            },
            "subtasks": [
                {
                    "key": "PROJ-124",
                    "fields": {
                        "summary": "Verify VPN logs",
                        "status": {"name": "Done"},
                        "assignee": {"displayName": "Bob"},
                    },
                }
            ],
            "issuelinks": [
                {
                    "type": {"outward": "blocks", "inward": "is blocked by"},
                    "outwardIssue": {
                        "key": "PROJ-200",
                        "fields": {
                            "summary": "Gateway firmware update",
                            "status": {"name": "In Progress"},
                        },
                    },
                },
                {
                    "type": {"outward": "blocks", "inward": "is blocked by"},
                    "inwardIssue": {
                        "key": "PROJ-201",
                        "fields": {
                            "summary": "Lab environment unstable",
                            "status": {"name": "Open"},
                        },
                    },
                },
            ],
            "comment": {
                "comments": [
                    {
                        "created": "2026-03-05T09:00:00.000+0000",
                        "author": {"displayName": "Alice"},
                        "body": "Need driver package from vendor.",
                    }
                ]
            },
        },
        "changelog": {
            "histories": [
                {
                    "created": "2026-03-04T15:00:00.000+0000",
                    "author": {"displayName": "Alice"},
                    "items": [
                        {"field": "status", "fromString": "Open", "toString": "In Progress"},
                        {"field": "assignee", "fromString": "Carol", "toString": "Bob"},
                    ],
                }
            ]
        },
    }

    lines = module.format_issue_details(payload, "https://jira.example.com")

    assert "resolution: Fixed" in lines
    assert "resolution_date: 2026-03-06T10:00:00.000+0000" in lines

    section_indexes = [
        lines.index("[parent]"),
        lines.index("[subtasks]"),
        lines.index("[linked_issues]"),
        lines.index("[comments]"),
        lines.index("[changelog]"),
    ]
    assert section_indexes == sorted(section_indexes)

    assert "PROJ-100 | Authentication epic | In Progress" in lines
    assert "PROJ-124 | Verify VPN logs | Done | Bob" in lines
    assert "blocks | PROJ-200 | Gateway firmware update | In Progress" in lines
    assert "is blocked by | PROJ-201 | Lab environment unstable | Open" in lines
    assert "2026-03-05T09:00:00.000+0000 | Alice" in lines
    assert "Need driver package from vendor." in lines
    assert "2026-03-04T15:00:00.000+0000 | Alice" in lines
    assert "status: Open -> In Progress" in lines
    assert "assignee: Carol -> Bob" in lines


def test_format_issue_details_renders_dash_for_empty_sections():
    module = load_issue_module("get_jira_issue_format_empty_sections")

    payload = {
        "key": "PROJ-123",
        "fields": {
            "summary": "Login fails on VPN",
            "status": {"name": "Open"},
            "issuetype": {"name": "Bug"},
            "priority": {"name": "High"},
            "labels": [],
            "components": [],
            "fixVersions": [],
            "comment": {"comments": []},
            "subtasks": [],
            "issuelinks": [],
            "resolution": None,
            "parent": None,
        },
        "changelog": {"histories": []},
    }

    lines = module.format_issue_details(payload, "https://jira.example.com")

    for section in ("[parent]", "[subtasks]", "[linked_issues]", "[comments]", "[changelog]"):
        assert section in lines
        assert lines[lines.index(section) + 1] == "-"


def test_main_returns_zero_for_success(monkeypatch, capsys):
    module = load_issue_module("get_jira_issue_main")

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda: {
            "base_url": "https://jira.example.com",
            "api_base": "https://jira.example.com/rest/api/2",
            "username": "user@example.com",
            "password": "secret",
        },
    )
    monkeypatch.setattr(
        module,
        "fetch_issue",
        lambda *args, **kwargs: {
            "key": "PROJ-123",
            "fields": {
                "summary": "Login fails on VPN",
                "status": {"name": "In Progress"},
                "issuetype": {"name": "Bug"},
                "priority": {"name": "High"},
                "reporter": {"displayName": "Alice"},
                "assignee": {"displayName": "Bob"},
                "created": "2026-03-01T08:00:00.000+0000",
                "updated": "2026-03-05T09:30:00.000+0000",
                "labels": ["auth", "vpn"],
                "components": [{"name": "Gateway"}],
                "fixVersions": [{"name": "2026.03"}],
                "description": "Example description",
            },
        },
    )

    exit_code = module.main(["PROJ-123"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "key: PROJ-123" in captured.out

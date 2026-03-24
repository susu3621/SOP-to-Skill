#!/usr/bin/env python3
"""Get Jira issue details by issue key."""

import argparse
import json
import sys
from typing import Dict, List, Optional, Sequence

from jira_auth import load_config_from_env


DETAIL_FIELDS = (
    "summary,status,issuetype,priority,reporter,assignee,created,updated,"
    "labels,components,fixVersions,description,comment,parent,subtasks,"
    "issuelinks,resolution,resolutiondate"
)


def get_requests_module():
    """Import requests lazily so tests can import the module without it."""
    try:
        import requests as requests_module
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The 'requests' package is required to fetch Jira issues. Install the script "
            "dependencies first."
        ) from exc
    return requests_module


def fetch_issue(
    config: Dict[str, str],
    issue_key: str,
    session: Optional[object] = None,
) -> Dict:
    """Fetch one Jira issue by key."""
    requests_module = None
    request_session = session
    if request_session is None:
        requests_module = get_requests_module()
        request_session = requests_module.Session()

    try:
        response = request_session.get(
            f"{config['api_base']}/issue/{issue_key}",
            params={"fields": DETAIL_FIELDS, "expand": "changelog"},
            auth=(config["username"], config["password"]),
            timeout=20,
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - narrowed by runtime dependency
        if requests_module is not None:
            request_exception = getattr(requests_module, "RequestException", None)
            if request_exception and isinstance(exc, request_exception):
                raise RuntimeError(f"Jira issue lookup failed: {exc}") from exc
        raise

    return response.json()


def display_name(user: Optional[Dict[str, str]], fallback: str) -> str:
    """Read a Jira user name from the supported fields."""
    if not user:
        return fallback
    for field_name in ("displayName", "name", "accountId"):
        value = user.get(field_name)
        if value:
            return value
    return fallback


def join_named_items(items: List[Dict[str, str]]) -> str:
    """Join Jira field items that expose a name."""
    names = [item.get("name") for item in items if item.get("name")]
    return ", ".join(names) if names else "-"


def format_description(value: object) -> str:
    """Format plain or structured Jira descriptions."""
    if value is None:
        return "-"
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=True)


def format_change_value(value: Optional[str]) -> str:
    """Render Jira changelog values with a stable empty placeholder."""
    return value if value else "-"


def append_section(lines: List[str], title: str, entries: List[str]) -> None:
    """Append a fixed-title section, using '-' when no data is present."""
    lines.append(f"[{title}]")
    if entries:
        lines.extend(entries)
    else:
        lines.append("-")


def issue_summary_line(issue: Optional[Dict], include_assignee: bool = False) -> Optional[str]:
    """Format a compact issue line for parent, subtasks, and linked issues."""
    if not issue:
        return None

    fields = issue.get("fields", {})
    parts = [
        issue.get("key", "<unknown>"),
        fields.get("summary", "<no summary>"),
        (fields.get("status") or {}).get("name", "Unknown"),
    ]
    if include_assignee:
        parts.append(display_name(fields.get("assignee"), "Unassigned"))
    return " | ".join(parts)


def format_linked_issues(links: List[Dict]) -> List[str]:
    """Format linked issues with the relation direction preserved."""
    entries: List[str] = []
    for link in links:
        link_type = link.get("type") or {}
        issue = None
        relation = "relates to"
        if link.get("outwardIssue"):
            issue = link["outwardIssue"]
            relation = link_type.get("outward", relation)
        elif link.get("inwardIssue"):
            issue = link["inwardIssue"]
            relation = link_type.get("inward", relation)

        summary_line = issue_summary_line(issue)
        if summary_line:
            entries.append(f"{relation} | {summary_line}")
    return entries


def format_comments(comment_field: Optional[Dict]) -> List[str]:
    """Format Jira comments as timestamp/author plus body blocks."""
    entries: List[str] = []
    comments = (comment_field or {}).get("comments", [])
    for comment in comments:
        entries.append(
            f"{comment.get('created', '<unknown>')} | "
            f"{display_name(comment.get('author'), 'Unknown')}"
        )
        entries.append(format_description(comment.get("body")))
        entries.append("")
    if entries:
        entries.pop()
    return entries


def format_changelog(changelog: Optional[Dict]) -> List[str]:
    """Format Jira changelog histories and all items in each history entry."""
    entries: List[str] = []
    histories = (changelog or {}).get("histories", [])
    for history in histories:
        entries.append(
            f"{history.get('created', '<unknown>')} | "
            f"{display_name(history.get('author'), 'Unknown')}"
        )
        for item in history.get("items", []):
            entries.append(
                f"{item.get('field', 'Unknown')}: "
                f"{format_change_value(item.get('fromString'))} -> "
                f"{format_change_value(item.get('toString'))}"
            )
        entries.append("")
    if entries:
        entries.pop()
    return entries


def format_issue_details(payload: Dict, base_url: str) -> List[str]:
    """Format Jira issue details for terminal output."""
    fields = payload.get("fields", {})
    key = payload.get("key", "<unknown>")
    lines = [
        f"key: {key}",
        f"summary: {fields.get('summary', '<no summary>')}",
        f"status: {(fields.get('status') or {}).get('name', 'Unknown')}",
        f"issue_type: {(fields.get('issuetype') or {}).get('name', 'Unknown')}",
        f"priority: {(fields.get('priority') or {}).get('name', 'Unknown')}",
        f"reporter: {display_name(fields.get('reporter'), 'Unknown')}",
        f"assignee: {display_name(fields.get('assignee'), 'Unassigned')}",
        f"created: {fields.get('created', '<unknown>')}",
        f"updated: {fields.get('updated', '<unknown>')}",
        f"resolution: {(fields.get('resolution') or {}).get('name', '-')}",
        f"resolution_date: {fields.get('resolutiondate', '-') or '-'}",
        f"labels: {', '.join(fields.get('labels', [])) or '-'}",
        f"components: {join_named_items(fields.get('components', []))}",
        f"fix_versions: {join_named_items(fields.get('fixVersions', []))}",
        f"description: {format_description(fields.get('description'))}",
        f"url: {base_url.rstrip('/')}/browse/{key}",
    ]

    parent_line = issue_summary_line(fields.get("parent"))
    append_section(lines, "parent", [parent_line] if parent_line else [])
    append_section(
        lines,
        "subtasks",
        [
            line
            for line in (
                issue_summary_line(subtask, include_assignee=True)
                for subtask in fields.get("subtasks", [])
            )
            if line
        ],
    )
    append_section(lines, "linked_issues", format_linked_issues(fields.get("issuelinks", [])))
    append_section(lines, "comments", format_comments(fields.get("comment")))
    append_section(lines, "changelog", format_changelog(payload.get("changelog")))

    return lines


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser."""
    parser = argparse.ArgumentParser(description="Get Jira issue details by key.")
    parser.add_argument("issue_key", help="Jira issue key, for example PROJ-123")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_config_from_env()
        payload = fetch_issue(config, args.issue_key)
    except (ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    for line in format_issue_details(payload, config["base_url"]):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())

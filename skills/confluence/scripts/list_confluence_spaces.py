#!/usr/bin/env python3
"""
Confluence Space Listing Utility

Lists Confluence spaces through the read-only REST API so the output can be
used for later department-to-space mapping.
"""

import argparse
import json
import sys
from typing import Dict, List, Optional, Sequence, Tuple
from urllib.parse import urlparse


DEFAULT_LIMIT = 100


def build_confluence_urls(confluence_url: str) -> Tuple[str, str]:
    """Build web and API base URLs for Cloud and self-hosted Confluence."""
    normalized = confluence_url.rstrip("/")
    parsed = urlparse(normalized)

    path = parsed.path.rstrip("/")
    if not path and parsed.netloc.endswith(".atlassian.net"):
        path = "/wiki"

    web_base = f"{parsed.scheme}://{parsed.netloc}{path}"
    api_base = f"{web_base}/rest/api"
    return web_base, api_base


def load_config_from_env(env_file: Optional[str] = None) -> Dict[str, str]:
    """Load Confluence configuration via the shared credential discovery helper."""
    try:
        from confluence_auth import get_confluence_credentials
    except ImportError as exc:
        raise RuntimeError(
            "The shared 'confluence_auth' helper is required to load Confluence credentials."
        ) from exc

    creds = get_confluence_credentials(env_file=env_file)
    web_base, api_base = build_confluence_urls(creds["url"])
    return {
        "web_base": web_base,
        "api_base": api_base,
        "username": creds["username"],
        "token": creds["token"],
    }


def positive_int(value: str) -> int:
    """Validate positive integer CLI values."""
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("limit must be a positive integer")
    return parsed


def build_request_params(
    limit: int,
    space_type: Optional[str] = None,
    status: Optional[str] = None,
) -> Dict[str, object]:
    """Build request parameters for the spaces API."""
    params: Dict[str, object] = {"limit": limit}
    if space_type:
        params["type"] = space_type
    if status:
        params["status"] = status
    return params


def get_requests_module():
    """Import requests lazily so --help works without optional dependencies."""
    try:
        import requests as requests_module
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The 'requests' package is required to list Confluence spaces. "
            "Install the script dependencies first."
        ) from exc
    return requests_module


def fetch_spaces(
    config: Dict[str, str],
    limit: int,
    space_type: Optional[str] = None,
    status: Optional[str] = None,
    session: Optional[object] = None,
) -> Dict:
    """Fetch Confluence spaces using the REST API."""
    requests_module = get_requests_module()
    request_session = session or requests_module.Session()
    params = build_request_params(limit=limit, space_type=space_type, status=status)

    try:
        response = request_session.get(
            f"{config['api_base']}/space",
            params=params,
            auth=(config["username"], config["token"]),
            timeout=20,
        )
        response.raise_for_status()
    except requests_module.RequestException as exc:
        raise RuntimeError(f"Confluence space listing failed: {exc}") from exc
    return response.json()


def reduce_spaces(payload: Dict) -> List[Dict[str, Optional[str]]]:
    """Reduce API results to the fields needed by docs and later mapping."""
    spaces: List[Dict[str, Optional[str]]] = []
    for item in payload.get("results", []):
        homepage_id = item.get("homepage", {}).get("id")
        spaces.append(
            {
                "key": item.get("key", "<unknown>"),
                "name": item.get("name", "<unnamed>"),
                "type": item.get("type", "<unknown>"),
                "status": item.get("status", "<unknown>"),
                "homepage_id": str(homepage_id) if homepage_id is not None else None,
            }
        )
    return spaces


def format_spaces(payload: Dict) -> List[str]:
    """Format spaces for terminal output."""
    lines: List[str] = []
    for space in reduce_spaces(payload):
        homepage_id = space["homepage_id"] or "<none>"
        lines.append(
            f"{space['key']} | {space['name']} | Type: {space['type']} | "
            f"Status: {space['status']} | Homepage: {homepage_id}"
        )

    if not lines:
        return ["No spaces found."]
    return lines


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser."""
    parser = argparse.ArgumentParser(description="List Confluence spaces.")
    parser.add_argument(
        "--limit",
        type=positive_int,
        default=DEFAULT_LIMIT,
        help="Maximum number of spaces to return",
    )
    parser.add_argument("--type", dest="space_type", help="Optional Confluence space type filter")
    parser.add_argument("--status", help="Optional Confluence space status filter")
    parser.add_argument("--env-file", default=None, help="Path to a specific .env file")
    parser.add_argument(
        "--json",
        dest="json_output",
        action="store_true",
        help="Print JSON output for machine-readable processing",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        config = load_config_from_env(env_file=args.env_file)
        payload = fetch_spaces(
            config,
            limit=args.limit,
            space_type=args.space_type,
            status=args.status,
        )
    except (ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json_output:
        print(json.dumps(reduce_spaces(payload), ensure_ascii=False, indent=2))
        return 0

    for line in format_spaces(payload):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())

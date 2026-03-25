#!/usr/bin/env python3
"""
Plan Jira Issue - Set timetracking, sprint, and fixVersions

This script updates planning-related fields on Jira issues including:
- Time tracking (original estimate, remaining estimate)
- Sprint assignment
- Fix versions
- Comments with optional agent signature

Usage:
    # Set time estimates
    python plan_jira_issue.py --issue PROJ-123 --original-estimate "2d 4h"

    # Set sprint (sprint ID from your Jira board)
    python plan_jira_issue.py --issue PROJ-123 --sprint 12345

    # Set fix versions
    python plan_jira_issue.py --issue PROJ-123 --fix-versions v1.0.0 v1.1.0

    # Combine planning updates with comment
    python plan_jira_issue.py --issue PROJ-123 \\
        --original-estimate "3d" \\
        --sprint 12345 \\
        --comment "Updated planning for Q2" \\
        --auto-agent-comment

    # Preview changes
    python plan_jira_issue.py --issue PROJ-123 --original-estimate "2d" --dry-run
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Optional, List

# Add script directory to path for imports
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from jira_auth import load_config_from_env

AGENT_SIGNATURE = "\n\nCo-Authored-By-Agent"


def get_http_session(config: Dict[str, str]):
    """Create authenticated HTTP session."""
    try:
        import requests
        from requests.auth import HTTPBasicAuth
    except ImportError:
        raise ImportError("requests library required. Install with: pip install requests")

    session = requests.Session()
    session.auth = HTTPBasicAuth(config['username'], config['password'])
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    return session


def update_issue_planning(
    session,
    api_base: str,
    issue_key: str,
    original_estimate: Optional[str] = None,
    remaining_estimate: Optional[str] = None,
    sprint_id: Optional[int] = None,
    sprint_field: Optional[str] = None,
    fix_versions: Optional[List[str]] = None,
    custom_fields: Optional[Dict] = None
) -> dict:
    """
    Update planning fields on an issue.

    Args:
        session: Authenticated requests session
        api_base: Base API URL
        issue_key: Issue key to update
        original_estimate: Original time estimate (e.g., "2d 4h")
        remaining_estimate: Remaining time estimate
        sprint_id: Sprint ID to assign
        sprint_field: Custom field name for sprint (default: customfield_10000)
        fix_versions: List of version names
        custom_fields: Additional custom fields

    Returns:
        Response data
    """
    fields = {}

    # Timetracking
    if original_estimate or remaining_estimate:
        timetracking = {}
        if original_estimate:
            timetracking['originalEstimate'] = original_estimate
        if remaining_estimate:
            timetracking['remainingEstimate'] = remaining_estimate
        fields['timetracking'] = timetracking

    # Sprint (custom field)
    if sprint_id:
        field_name = sprint_field or 'customfield_10000'
        fields[field_name] = sprint_id

    # Fix versions
    if fix_versions:
        fields['fixVersions'] = [{'name': v} for v in fix_versions]

    # Additional custom fields
    if custom_fields:
        fields.update(custom_fields)

    if not fields:
        raise ValueError("No planning fields specified for update")

    payload = {'fields': fields}

    response = session.put(
        f"{api_base}/issue/{issue_key}",
        data=json.dumps(payload)
    )
    response.raise_for_status()
    return {'key': issue_key, 'status': 'updated'}


def add_comment(
    session,
    api_base: str,
    issue_key: str,
    comment: str
) -> dict:
    """
    Add a comment to an issue.

    Args:
        session: Authenticated requests session
        api_base: Base API URL
        issue_key: Issue key
        comment: Comment body

    Returns:
        Created comment data
    """
    payload = {'body': comment}

    response = session.post(
        f"{api_base}/issue/{issue_key}/comment",
        data=json.dumps(payload)
    )
    response.raise_for_status()
    return response.json()


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description='Set planning fields on Jira issues (timetracking, sprint, fixVersions)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    # Issue key (required)
    parser.add_argument(
        '--issue', '-i',
        required=True,
        help='Issue key to update (e.g., PROJ-123)'
    )

    # Time tracking
    parser.add_argument(
        '--original-estimate',
        help='Original time estimate (e.g., "2d", "4h", "1w 2d", "2d 4h")'
    )
    parser.add_argument(
        '--remaining-estimate',
        help='Remaining time estimate (same format as original estimate)'
    )

    # Sprint
    parser.add_argument(
        '--sprint',
        type=int,
        help='Sprint ID to assign issue to'
    )
    parser.add_argument(
        '--sprint-field',
        help='Custom field name for sprint (default: customfield_10000)'
    )

    # Fix versions
    parser.add_argument(
        '--fix-versions',
        nargs='+',
        help='Space-separated list of fix version names'
    )

    # Comment
    parser.add_argument(
        '--comment',
        help='Add a comment to the issue'
    )
    parser.add_argument(
        '--auto-agent-comment',
        action='store_true',
        help='Automatically append "Co-Authored-By-Agent" to comments'
    )

    # Custom fields (JSON string)
    parser.add_argument(
        '--custom-fields',
        help='Custom fields as JSON string, e.g., \'{"customfield_10001": "value"}\''
    )

    # Other options
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show payload without making API call'
    )

    args = parser.parse_args()

    # Validate: at least one action required
    has_fields = any([
        args.original_estimate,
        args.remaining_estimate,
        args.sprint,
        args.fix_versions,
        args.custom_fields
    ])
    has_comment = args.comment is not None

    if not has_fields and not has_comment:
        print("Error: At least one planning field or comment is required", file=sys.stderr)
        sys.exit(1)

    # Parse custom fields
    custom_fields = None
    if args.custom_fields:
        try:
            custom_fields = json.loads(args.custom_fields)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in --custom-fields: {e}", file=sys.stderr)
            sys.exit(1)

    # Build payload for dry run or validation
    fields = {}

    if args.original_estimate or args.remaining_estimate:
        timetracking = {}
        if args.original_estimate:
            timetracking['originalEstimate'] = args.original_estimate
        if args.remaining_estimate:
            timetracking['remainingEstimate'] = args.remaining_estimate
        fields['timetracking'] = timetracking

    if args.sprint:
        sprint_field = args.sprint_field or 'customfield_10000'
        fields[sprint_field] = args.sprint

    if args.fix_versions:
        fields['fixVersions'] = [{'name': v} for v in args.fix_versions]

    if custom_fields:
        fields.update(custom_fields)

    # Prepare comment based on context
    # When updating planning fields without user comment: auto-generate change log with signature
    # When user provides comment: use as-is (no signature)
    # --auto-agent-comment: force signature
    final_comment = None
    if has_fields and not args.comment:
        # Auto-generate change log with signature
        changes = []
        if args.original_estimate:
            changes.append(f"Original Estimate: {args.original_estimate}")
        if args.remaining_estimate:
            changes.append(f"Remaining Estimate: {args.remaining_estimate}")
        if args.sprint:
            changes.append(f"Sprint: {args.sprint}")
        if args.fix_versions:
            changes.append(f"Fix Versions: {', '.join(args.fix_versions)}")

        change_log = "\n".join(changes)
        final_comment = f"Planning updated:\n{change_log}{AGENT_SIGNATURE}"
    elif args.comment:
        # User comment: no signature unless forced
        if args.auto_agent_comment:
            final_comment = args.comment + AGENT_SIGNATURE
        else:
            final_comment = args.comment

    # Dry run: show what would be done
    if args.dry_run:
        print(f"=== PLAN ISSUE (Dry Run) ===")
        print(f"Issue: {args.issue}")

        if fields:
            print("\n--- Fields Payload ---")
            print(json.dumps({'fields': fields}, indent=2))

        if final_comment:
            print(f"\n--- Auto-generated Comment ---\n{final_comment}")

        if not fields and not final_comment:
            print("(No changes specified)")

        return

    # Load config and create session
    try:
        config = load_config_from_env()
        session = get_http_session(config)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ImportError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Execute API calls
    try:
        # Update fields if any
        if fields:
            result = update_issue_planning(
                session=session,
                api_base=config['api_base'],
                issue_key=args.issue,
                original_estimate=args.original_estimate,
                remaining_estimate=args.remaining_estimate,
                sprint_id=args.sprint,
                sprint_field=args.sprint_field,
                fix_versions=args.fix_versions,
                custom_fields=custom_fields
            )
            print(f"✅ Issue {args.issue} planning updated successfully!")

            # Summary of changes
            if args.original_estimate:
                print(f"   Original Estimate: {args.original_estimate}")
            if args.remaining_estimate:
                print(f"   Remaining Estimate: {args.remaining_estimate}")
            if args.sprint:
                print(f"   Sprint: {args.sprint}")
            if args.fix_versions:
                print(f"   Fix Versions: {', '.join(args.fix_versions)}")

        # Add comment (auto-generated for planning updates, or user comment)
        if final_comment:
            comment_result = add_comment(
                session=session,
                api_base=config['api_base'],
                issue_key=args.issue,
                comment=final_comment
            )
            if has_fields and not args.comment:
                print(f"✅ Change log added to {args.issue}")
            else:
                sig_note = " (with Co-Authored-By-Agent)" if args.auto_agent_comment else ""
                print(f"✅ Comment added to {args.issue}{sig_note}")

        print(f"   URL: {config['base_url']}/browse/{args.issue}")

    except Exception as e:
        # Try to extract error message from response
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                if 'errorMessages' in error_data:
                    error_msg = '; '.join(error_data['errorMessages'])
                elif 'errors' in error_data:
                    error_msg = '; '.join(f"{k}: {v}" for k, v in error_data['errors'].items())
            except:
                error_msg = f"{e} (Status: {e.response.status_code})"

        print(f"Error: {error_msg}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

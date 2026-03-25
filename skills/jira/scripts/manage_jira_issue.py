#!/usr/bin/env python3
"""
Create or Update Jira Issues

This script creates new Jira issues or updates existing ones.

Usage:
    # Create a new issue
    python manage_jira_issue.py --project PROJ --summary "Issue title" --description "Issue description"

    # Create with additional fields
    python manage_jira_issue.py --project PROJ --summary "Bug report" --type Bug --priority High --assignee username

    # Update an existing issue
    python manage_jira_issue.py --issue PROJ-123 --summary "Updated title" --description "Updated description"

    # Update specific fields only
    python manage_jira_issue.py --issue PROJ-123 --priority Low --assignee username

    # Add a comment (transition issue)
    python manage_jira_issue.py --issue PROJ-123 --comment "This is a comment"

    # Dry run to preview payload
    python manage_jira_issue.py --project PROJ --summary "Test" --dry-run
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Optional

# Add script directory to path for imports
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from jira_auth import load_config_from_env


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


def create_issue(
    session,
    api_base: str,
    project: str,
    summary: str,
    description: Optional[str] = None,
    issue_type: str = "Task",
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    labels: Optional[list] = None,
    components: Optional[list] = None,
    parent_key: Optional[str] = None,
    custom_fields: Optional[Dict] = None
) -> dict:
    """
    Create a new Jira issue.

    Args:
        session: Authenticated requests session
        api_base: Base API URL
        project: Project key
        summary: Issue summary/title
        description: Issue description
        issue_type: Issue type (Task, Bug, Story, etc.)
        priority: Priority name
        assignee: Assignee username
        labels: List of labels
        components: List of component names
        parent_key: Parent issue key for subtasks
        custom_fields: Additional custom fields

    Returns:
        Created issue data
    """
    fields = {
        'project': {'key': project},
        'summary': summary,
        'issuetype': {'name': issue_type}
    }

    if description:
        fields['description'] = description

    if priority:
        fields['priority'] = {'name': priority}

    if assignee:
        fields['assignee'] = {'name': assignee}

    if labels:
        fields['labels'] = labels

    if components:
        fields['components'] = [{'name': c} for c in components]

    if parent_key:
        fields['parent'] = {'key': parent_key}

    if custom_fields:
        fields.update(custom_fields)

    payload = {'fields': fields}

    response = session.post(
        f"{api_base}/issue",
        data=json.dumps(payload)
    )
    response.raise_for_status()
    return response.json()


def update_issue(
    session,
    api_base: str,
    issue_key: str,
    summary: Optional[str] = None,
    description: Optional[str] = None,
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    labels: Optional[list] = None,
    components: Optional[list] = None,
    custom_fields: Optional[Dict] = None
) -> dict:
    """
    Update an existing Jira issue.

    Args:
        session: Authenticated requests session
        api_base: Base API URL
        issue_key: Issue key to update
        summary: New summary
        description: New description
        priority: New priority
        assignee: New assignee
        labels: New labels (replaces existing)
        components: New components (replaces existing)
        custom_fields: Additional custom fields

    Returns:
        Response data (usually empty for updates)
    """
    fields = {}

    if summary is not None:
        fields['summary'] = summary

    if description is not None:
        fields['description'] = description

    if priority is not None:
        fields['priority'] = {'name': priority}

    if assignee is not None:
        fields['assignee'] = {'name': assignee}

    if labels is not None:
        fields['labels'] = labels

    if components is not None:
        fields['components'] = [{'name': c} for c in components]

    if custom_fields:
        fields.update(custom_fields)

    if not fields:
        raise ValueError("No fields specified for update")

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


def get_issue(session, api_base: str, issue_key: str) -> Optional[dict]:
    """Get issue details by key."""
    try:
        response = session.get(f"{api_base}/issue/{issue_key}")
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description='Create or update Jira issues',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    # Mode selection
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        '--project', '-p',
        help='Project key for creating a new issue'
    )
    mode_group.add_argument(
        '--issue', '-i',
        help='Issue key to update (e.g., PROJ-123)'
    )

    # Common fields
    parser.add_argument(
        '--summary', '-s',
        help='Issue summary/title'
    )
    parser.add_argument(
        '--description', '-d',
        help='Issue description'
    )

    # Optional fields
    parser.add_argument(
        '--type', '-t',
        default='Task',
        help='Issue type (default: Task). Examples: Task, Bug, Story, Epic, Subtask'
    )
    parser.add_argument(
        '--priority',
        help='Priority name. Examples: Highest, High, Medium, Low, Lowest'
    )
    parser.add_argument(
        '--assignee', '-a',
        help='Assignee username'
    )
    parser.add_argument(
        '--labels', '-l',
        nargs='+',
        help='Space-separated list of labels'
    )
    parser.add_argument(
        '--components', '-c',
        nargs='+',
        help='Space-separated list of component names'
    )
    parser.add_argument(
        '--parent',
        help='Parent issue key (for creating subtasks)'
    )

    # Comment (for updates)
    parser.add_argument(
        '--comment',
        help='Add a comment to the issue'
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

    # Parse custom fields
    custom_fields = None
    if args.custom_fields:
        try:
            custom_fields = json.loads(args.custom_fields)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in --custom-fields: {e}", file=sys.stderr)
            sys.exit(1)

    # Build payload for dry run or validation
    if args.project:
        # Create mode
        if not args.summary:
            print("Error: --summary is required when creating a new issue", file=sys.stderr)
            sys.exit(1)

        fields = {
            'project': {'key': args.project},
            'summary': args.summary,
            'issuetype': {'name': args.type}
        }

        if args.description:
            fields['description'] = args.description
        if args.priority:
            fields['priority'] = {'name': args.priority}
        if args.assignee:
            fields['assignee'] = {'name': args.assignee}
        if args.labels:
            fields['labels'] = args.labels
        if args.components:
            fields['components'] = [{'name': c} for c in args.components]
        if args.parent:
            fields['parent'] = {'key': args.parent}
        if custom_fields:
            fields.update(custom_fields)

        payload = {'fields': fields}

        if args.dry_run:
            print("=== CREATE ISSUE (Dry Run) ===")
            print(f"Project: {args.project}")
            print(f"Type: {args.type}")
            print(f"Summary: {args.summary}")
            print("\n--- Payload ---")
            print(json.dumps(payload, indent=2))
            return

    else:
        # Update mode
        fields = {}

        if args.summary:
            fields['summary'] = args.summary
        if args.description is not None:
            fields['description'] = args.description
        if args.priority:
            fields['priority'] = {'name': args.priority}
        if args.assignee is not None:
            fields['assignee'] = {'name': args.assignee}
        if args.labels:
            fields['labels'] = args.labels
        if args.components:
            fields['components'] = [{'name': c} for c in args.components]
        if custom_fields:
            fields.update(custom_fields)

        if args.dry_run:
            print("=== UPDATE ISSUE (Dry Run) ===")
            print(f"Issue: {args.issue}")
            print("\n--- Payload ---")
            if fields:
                print(json.dumps({'fields': fields}, indent=2))
            if args.comment:
                print(f"\n--- Comment ---\n{args.comment}")
            if not fields and not args.comment:
                print("(No changes specified)")
            return

        if not fields and not args.comment:
            print("Error: No fields or comment specified for update", file=sys.stderr)
            sys.exit(1)

        payload = {'fields': fields} if fields else None

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

    # Execute API call
    try:
        if args.project:
            # Create issue
            result = create_issue(
                session=session,
                api_base=config['api_base'],
                project=args.project,
                summary=args.summary,
                description=args.description,
                issue_type=args.type,
                priority=args.priority,
                assignee=args.assignee,
                labels=args.labels,
                components=args.components,
                parent_key=args.parent,
                custom_fields=custom_fields
            )

            print(f"✅ Issue created successfully!")
            print(f"   Key: {result.get('key')}")
            print(f"   ID: {result.get('id')}")
            print(f"   URL: {config['base_url']}/browse/{result.get('key')}")

        else:
            # Update issue
            if payload and payload['fields']:
                result = update_issue(
                    session=session,
                    api_base=config['api_base'],
                    issue_key=args.issue,
                    summary=args.summary,
                    description=args.description,
                    priority=args.priority,
                    assignee=args.assignee,
                    labels=args.labels,
                    components=args.components,
                    custom_fields=custom_fields
                )
                print(f"✅ Issue {args.issue} updated successfully!")

            # Add comment if specified
            if args.comment:
                comment_result = add_comment(
                    session=session,
                    api_base=config['api_base'],
                    issue_key=args.issue,
                    comment=args.comment
                )
                print(f"✅ Comment added to {args.issue}")

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

# WorkBuddy Weekly Report Demo Plan

## Goal

Build a UI-only onboarding demo for project managers sending weekly reports. The app should open on an introduction page, then guide the user through one question per page, including a dynamic credentials page that depends on the selected base skills.

## Scope

- Reuse the existing React shell and replace the legacy WorkBuddy demo flow.
- Keep the skill library and installer views intact.
- Implement UI only. No credential storage, no connectivity checks, no real WorkBuddy integration.

## Steps

1. Replace the existing legacy `App.test.tsx` flow tests with a failing test that asserts:
   - page 1 introduces WorkBuddy and requires role selection
   - page 2 supports selecting base skills like Jira and Confluence
   - page 6 shows only the credential fields for the selected skills
   - the final page tells the user setup is complete and they can open WorkBuddy
2. Expand the WorkBuddy wizard content model to represent:
   - role selection on the landing page
   - infrastructure multi-select
   - supported use cases
   - project source link input
   - weekly report rule/template input
   - credential fields derived from selected skills
3. Update `src/App.tsx` to drive the 7-page onboarding flow while preserving the existing skill-management views.
4. Refresh the side panel and styles so the new flow reads like a guided onboarding demo instead of the old desktop scaffold.
5. Run `npm test` and fix any failures.

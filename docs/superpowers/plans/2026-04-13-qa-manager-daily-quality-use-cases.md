# QA Manager Daily Quality Use Cases

## Summary

This update makes `qa-manager` visible in onboarding and replaces its generic work list with five day-to-day quality-management use cases that are realistic for repeated AI execution.

## Added Role Exposure

- Visible role: `质量经理 / QA Manager`
- Existing hidden role id kept: `qa-manager`

## Added Use Cases

- `质量异常汇总与闭环跟进`
- `客诉售后问题分析与回复草稿`
- `变更评审里的质量影响检查`
- `质量周报`
- `供应商质量问题跟踪`

## Implementation Notes

- Each use case is defined in shared onboarding config.
- Each use case includes built-in description text plus structured onboarding questions.
- The structured questions focus on daily execution inputs such as issue trackers, complaint records, change-review references, weekly report sources, supplier trackers, and the related SOP/template links.

## Verification

- `npm test`

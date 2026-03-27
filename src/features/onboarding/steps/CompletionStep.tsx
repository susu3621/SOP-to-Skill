import { getOnboardingAgentNameById } from '../../../content/workbuddy'
import type { OnboardingBatchSyncResult } from '../../../types'

interface CompletionStepProps {
  syncError: string | null
  syncResult: OnboardingBatchSyncResult | null
}

function renderSkillList(skillIds: string[]) {
  if (skillIds.length === 0) {
    return <span className="muted">无</span>
  }

  return (
    <div className="chip-row">
      {skillIds.map((skillId) => (
        <span className="chip" key={skillId}>
          {skillId}
        </span>
      ))}
    </div>
  )
}

export function CompletionStep({ syncError, syncResult }: CompletionStepProps) {
  if (!syncError && !syncResult) {
    return null
  }

  return (
    <div className="field-stack">
      <h2 className="panel__title">同步结果</h2>
      {syncError && <p className="error">{syncError}</p>}
      {syncResult?.agent_results.map((result) => (
        <section className="summary-card" key={result.agent_id}>
          <h3>{getOnboardingAgentNameById(result.agent_id)}</h3>
          <p className={result.success ? 'success' : 'error'}>
            {result.success ? '同步完成' : result.error ?? '同步失败'}
          </p>
          <p>新增技能</p>
          {renderSkillList(result.added_skill_ids)}
          <p>移除技能</p>
          {renderSkillList(result.removed_skill_ids)}
          <p>未变化技能</p>
          {renderSkillList(result.unchanged_skill_ids)}
        </section>
      ))}
    </div>
  )
}

import { getOnboardingAgentNameById } from '../../../content/workbuddy'
import type { Locale, OnboardingBatchSyncResult } from '../../../types'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface CompletionStepProps {
  locale: Locale
  syncError: string | null
  syncResult: OnboardingBatchSyncResult | null
}

function renderSkillList(skillIds: string[], locale: Locale) {
  if (skillIds.length === 0) {
    return <span className="muted">{getOnboardingCopy(locale, onboardingCopy.none)}</span>
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

export function CompletionStep({ locale, syncError, syncResult }: CompletionStepProps) {
  if (!syncError && !syncResult) {
    return null
  }

  return (
    <div className="field-stack">
      <h2 className="panel__title">{getOnboardingCopy(locale, onboardingCopy.syncResultTitle)}</h2>
      {syncError && <p className="error">{syncError}</p>}
      {syncResult?.agent_results.map((result) => (
        <section className="summary-card" key={result.agent_id}>
          <h3>{getOnboardingAgentNameById(result.agent_id, locale)}</h3>
          <p className={result.success ? 'success' : 'error'}>
            {result.success
              ? getOnboardingCopy(locale, onboardingCopy.syncSuccess)
              : result.error ?? getOnboardingCopy(locale, onboardingCopy.syncFailed)}
          </p>
          <p>{getOnboardingCopy(locale, onboardingCopy.addedSkills)}</p>
          {renderSkillList(result.added_skill_ids, locale)}
          <p>{getOnboardingCopy(locale, onboardingCopy.removedSkills)}</p>
          {renderSkillList(result.removed_skill_ids, locale)}
          <p>{getOnboardingCopy(locale, onboardingCopy.unchangedSkills)}</p>
          {renderSkillList(result.unchanged_skill_ids, locale)}
        </section>
      ))}
    </div>
  )
}

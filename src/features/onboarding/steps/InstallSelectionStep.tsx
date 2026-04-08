import {
  getBaseSkillNameById,
  getOnboardingAgentNameById,
  getOnboardingUseCaseNameById,
} from '../../../content/workbuddy'
import type {
  Locale,
  OnboardingAgentSyncPreview,
  OnboardingInstallCandidateGroup,
} from '../../../types'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface InstallSelectionStepProps {
  locale: Locale
  agentPreviews: OnboardingAgentSyncPreview[]
  installCandidateGroups: OnboardingInstallCandidateGroup[]
  selectedAgentIds: string[]
  selectedBaseSkillIds: string[]
  selectedInstallSkillIds: string[]
  onToggleInstallSkill: (skillId: string) => void
}

interface GeneratedSkillToggleProps {
  locale: Locale
  skillId: string
  title: string
  checked: boolean
  onToggle: (skillId: string) => void
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

function GeneratedSkillToggle({
  locale,
  skillId,
  title,
  checked,
  onToggle,
}: GeneratedSkillToggleProps) {
  return (
    <label className="onboarding-install-skill-toggle" aria-label={`${title} ${skillId}`}>
      <input checked={checked} type="checkbox" onChange={() => onToggle(skillId)} />
      <span className="onboarding-install-skill-toggle__copy">
        <span className="onboarding-install-skill-toggle__title">{title}</span>
        <span className="onboarding-install-skill-toggle__id">{skillId}</span>
      </span>
    </label>
  )
}

export function InstallSelectionStep({
  locale,
  agentPreviews,
  installCandidateGroups,
  selectedAgentIds,
  selectedBaseSkillIds,
  selectedInstallSkillIds,
  onToggleInstallSkill,
}: InstallSelectionStepProps) {
  return (
    <div className="field-stack onboarding-install-layout">
      <section className="summary-card">
        <h3>{getOnboardingCopy(locale, onboardingCopy.selectedAgentsTitle)}</h3>
        <p>
          {selectedAgentIds
            .map((agentId) => getOnboardingAgentNameById(agentId, locale))
            .join(locale === 'zh-CN' ? '、' : ', ') ||
            getOnboardingCopy(locale, onboardingCopy.empty)}
        </p>
      </section>

      <section className="summary-card">
        <h3>{getOnboardingCopy(locale, onboardingCopy.homeBaseSkills)}</h3>
        <div className="field-stack">
          {selectedBaseSkillIds.map((skillId) => (
            <label className="field-option field-option--compact" key={skillId}>
              <input
                checked={selectedInstallSkillIds.includes(skillId)}
                type="checkbox"
                onChange={() => onToggleInstallSkill(skillId)}
              />
              <span>{getBaseSkillNameById(skillId, locale)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="summary-card">
        <h3>{getOnboardingCopy(locale, onboardingCopy.generatedSkillsTitle)}</h3>
        {installCandidateGroups.length > 0 ? (
          <div className="onboarding-install-skill-table-wrap">
            <table
              aria-label={getOnboardingCopy(locale, onboardingCopy.generatedSkillsTable)}
              className="onboarding-install-skill-table"
            >
              <thead>
                <tr>
                  <th scope="col">{getOnboardingCopy(locale, onboardingCopy.useCaseColumn)}</th>
                  <th scope="col">{getOnboardingCopy(locale, onboardingCopy.productionColumn)}</th>
                  <th scope="col">{getOnboardingCopy(locale, onboardingCopy.testColumn)}</th>
                </tr>
              </thead>
              <tbody>
                {installCandidateGroups.map((group) => (
                  <tr key={group.use_case_id}>
                    <th
                      className="onboarding-install-skill-table__use-case"
                      data-label={getOnboardingCopy(locale, onboardingCopy.useCaseColumn)}
                      scope="row"
                    >
                      {getOnboardingUseCaseNameById(group.use_case_id, locale) || group.use_case_name}
                    </th>
                    <td data-label={getOnboardingCopy(locale, onboardingCopy.productionColumn)}>
                      <GeneratedSkillToggle
                        locale={locale}
                        checked={selectedInstallSkillIds.includes(group.production_skill_id)}
                        skillId={group.production_skill_id}
                        title={getOnboardingCopy(locale, onboardingCopy.productionColumn)}
                        onToggle={onToggleInstallSkill}
                      />
                    </td>
                    <td data-label={getOnboardingCopy(locale, onboardingCopy.testColumn)}>
                      <GeneratedSkillToggle
                        locale={locale}
                        checked={selectedInstallSkillIds.includes(group.test_skill_id)}
                        skillId={group.test_skill_id}
                        title={getOnboardingCopy(locale, onboardingCopy.testColumn)}
                        onToggle={onToggleInstallSkill}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{getOnboardingCopy(locale, onboardingCopy.noGeneratedSkills)}</p>
        )}
      </section>

      <section className="summary-card">
        <h3>{getOnboardingCopy(locale, onboardingCopy.previewTitle)}</h3>
        <div className="onboarding-preview-list">
          {agentPreviews.map((preview) => (
            <article className="summary-card summary-card--nested" key={preview.agent_id}>
              <p className="onboarding-preview-card__title">
                {getOnboardingAgentNameById(preview.agent_id, locale)}
              </p>
              <p>
                <strong>{getOnboardingCopy(locale, onboardingCopy.previewAdded)}</strong>
              </p>
              {renderSkillList(preview.added_skill_ids, locale)}
              <p>
                <strong>{getOnboardingCopy(locale, onboardingCopy.previewRemoved)}</strong>
              </p>
              {renderSkillList(preview.removed_skill_ids, locale)}
              <p>
                <strong>{getOnboardingCopy(locale, onboardingCopy.previewUnchanged)}</strong>
              </p>
              {renderSkillList(preview.unchanged_skill_ids, locale)}
            </article>
          ))}
        </div>
      </section>

    </div>
  )
}

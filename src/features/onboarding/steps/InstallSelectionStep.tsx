import {
  getBaseSkillNameById,
  getOnboardingAgentNameById,
} from '../../../content/workbuddy'
import type {
  OnboardingAgentSyncPreview,
  OnboardingInstallCandidateGroup,
} from '../../../types'

interface InstallSelectionStepProps {
  agentPreviews: OnboardingAgentSyncPreview[]
  installCandidateGroups: OnboardingInstallCandidateGroup[]
  selectedAgentIds: string[]
  selectedBaseSkillIds: string[]
  selectedInstallSkillIds: string[]
  onToggleInstallSkill: (skillId: string) => void
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

export function InstallSelectionStep({
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
        <h3>已选 Agent</h3>
        <p>{selectedAgentIds.map((agentId) => getOnboardingAgentNameById(agentId)).join('、') || '未选择'}</p>
      </section>

      <section className="summary-card">
        <h3>基础技能</h3>
        <div className="field-stack">
          {selectedBaseSkillIds.map((skillId) => (
            <label className="field-option field-option--compact" key={skillId}>
              <input
                aria-label={`安装 ${getBaseSkillNameById(skillId)}`}
                checked={selectedInstallSkillIds.includes(skillId)}
                type="checkbox"
                onChange={() => onToggleInstallSkill(skillId)}
              />
              <span>{getBaseSkillNameById(skillId)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="summary-card">
        <h3>岗位生成技能</h3>
        <div className="field-stack">
          {installCandidateGroups.map((group) => (
            <div className="onboarding-install-group" key={group.use_case_id}>
              <p className="onboarding-install-group__title">{group.use_case_name}</p>
              <label className="field-option field-option--compact">
                <input
                  aria-label={`${group.use_case_name} 生产包`}
                  checked={selectedInstallSkillIds.includes(group.production_skill_id)}
                  type="checkbox"
                  onChange={() => onToggleInstallSkill(group.production_skill_id)}
                />
                <span>{`${group.use_case_name} 生产包`}</span>
              </label>
              <label className="field-option field-option--compact">
                <input
                  aria-label={`${group.use_case_name} 测试包`}
                  checked={selectedInstallSkillIds.includes(group.test_skill_id)}
                  type="checkbox"
                  onChange={() => onToggleInstallSkill(group.test_skill_id)}
                />
                <span>{`${group.use_case_name} 测试包`}</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="summary-card">
        <h3>同步预览</h3>
        <div className="onboarding-preview-list">
          {agentPreviews.map((preview) => (
            <article className="summary-card summary-card--nested" key={preview.agent_id}>
              <p className="onboarding-preview-card__title">
                {getOnboardingAgentNameById(preview.agent_id)}
              </p>
              <p>
                <strong>预览新增技能</strong>
              </p>
              {renderSkillList(preview.added_skill_ids)}
              <p>
                <strong>预览移除技能</strong>
              </p>
              {renderSkillList(preview.removed_skill_ids)}
              <p>
                <strong>预览未变化技能</strong>
              </p>
              {renderSkillList(preview.unchanged_skill_ids)}
            </article>
          ))}
        </div>
      </section>

    </div>
  )
}

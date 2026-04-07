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

interface GeneratedSkillToggleProps {
  skillId: string
  title: string
  checked: boolean
  onToggle: (skillId: string) => void
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

function GeneratedSkillToggle({ skillId, title, checked, onToggle }: GeneratedSkillToggleProps) {
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
        <h3>公司 IT 工具</h3>
        <div className="field-stack">
          {selectedBaseSkillIds.map((skillId) => (
            <label className="field-option field-option--compact" key={skillId}>
              <input
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
        {installCandidateGroups.length > 0 ? (
          <div className="onboarding-install-skill-table-wrap">
            <table aria-label="岗位生成技能列表" className="onboarding-install-skill-table">
              <thead>
                <tr>
                  <th scope="col">岗位用例</th>
                  <th scope="col">生产用</th>
                  <th scope="col">测试用</th>
                </tr>
              </thead>
              <tbody>
                {installCandidateGroups.map((group) => (
                  <tr key={group.use_case_id}>
                    <th
                      className="onboarding-install-skill-table__use-case"
                      data-label="岗位用例"
                      scope="row"
                    >
                      {group.use_case_name}
                    </th>
                    <td data-label="生产用">
                      <GeneratedSkillToggle
                        checked={selectedInstallSkillIds.includes(group.production_skill_id)}
                        skillId={group.production_skill_id}
                        title="生产用"
                        onToggle={onToggleInstallSkill}
                      />
                    </td>
                    <td data-label="测试用">
                      <GeneratedSkillToggle
                        checked={selectedInstallSkillIds.includes(group.test_skill_id)}
                        skillId={group.test_skill_id}
                        title="测试用"
                        onToggle={onToggleInstallSkill}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">当前岗位暂无可安装的生成技能。</p>
        )}
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

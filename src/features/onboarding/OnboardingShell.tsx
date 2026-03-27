import { AgentSelectionStep } from './steps/AgentSelectionStep'
import { CompletionStep } from './steps/CompletionStep'
import { CredentialsStep } from './steps/CredentialsStep'
import { InstallSelectionStep } from './steps/InstallSelectionStep'
import { RoleBaseSkillsStep } from './steps/RoleBaseSkillsStep'
import { UseCaseConfigStep } from './steps/UseCaseConfigStep'
import { useOnboarding } from './useOnboarding'
import type { InstalledSkillInfo } from '../../types'

interface OnboardingShellProps {
  installedSkills: InstalledSkillInfo[]
  onOpenInstalled: () => void
}

export function OnboardingShell({ installedSkills, onOpenInstalled }: OnboardingShellProps) {
  const {
    credentialFields,
    installCandidateGroups,
    loading,
    preview,
    previewError,
    state,
    syncError,
    syncing,
    syncResult,
    startSync,
    toggleAgent,
    toggleBaseSkill,
    toggleInstallSkill,
    updateCredentialValue,
    updateUseCaseContent,
    selectRole,
  } = useOnboarding(installedSkills)

  if (loading) {
    return <p className="muted">正在加载 onboarding 配置...</p>
  }

  return (
    <div className="onboarding-shell">
      <section className="onboarding-section">
        <div className="onboarding-section__header">
          <div>
            <span className="panel__eyebrow">Onboarding</span>
            <h2 className="panel__title">Agent、岗位和基础技能</h2>
            <p className="panel__body">
              先统一选择要同步的 Agent、岗位和基础技能。后续的岗位用例、安装集合和凭证都会基于这份共享选择。
            </p>
          </div>
          <button className="button--ghost" type="button" onClick={onOpenInstalled}>
            {`已安装 (${installedSkills.length})`}
          </button>
        </div>
        <div className="field-stack">
          <AgentSelectionStep
            selectedAgentIds={state.selected_agent_ids}
            onToggleAgent={toggleAgent}
          />
          <RoleBaseSkillsStep
            selectedRoleId={state.selected_role_id}
            selectedBaseSkillIds={state.selected_base_skill_ids}
            onSelectRole={selectRole}
            onToggleBaseSkill={toggleBaseSkill}
          />
        </div>
      </section>

      <section className="onboarding-section">
        <span className="panel__eyebrow">岗位用例</span>
        <p className="panel__body">当前岗位下的所有适用用例都会被同时编辑和生成。</p>
        <UseCaseConfigStep
          useCases={state.role_use_case_contents}
          onUpdate={updateUseCaseContent}
        />
      </section>

      <section className="onboarding-section">
        <span className="panel__eyebrow">安装选择</span>
        <h2 className="panel__title">共享安装集合</h2>
        <p className="panel__body">
          这一步决定所有已选 Agent 最终要保留哪些基础技能、生产包和测试包。不勾选意味着同步时删除。
        </p>
        {previewError && <p className="error">{previewError}</p>}
        <InstallSelectionStep
          agentPreviews={preview.agent_previews}
          installCandidateGroups={installCandidateGroups}
          selectedAgentIds={state.selected_agent_ids}
          selectedBaseSkillIds={state.selected_base_skill_ids}
          selectedInstallSkillIds={preview.selected_install_skill_ids}
          onToggleInstallSkill={toggleInstallSkill}
        />
      </section>

      <section className="onboarding-section">
        <span className="panel__eyebrow">凭证</span>
        <h2 className="panel__title">账号凭证</h2>
        <p className="panel__body">只显示当前仍被选择的基础技能所需的凭证字段。</p>
        <CredentialsStep
          credentialFields={credentialFields}
          credentialValues={state.credential_values}
          onUpdateCredential={updateCredentialValue}
        />
        <div className="button-row">
          <button
            className="button"
            type="button"
            onClick={startSync}
            disabled={syncing || state.selected_agent_ids.length === 0}
          >
            {syncing ? '同步中...' : '开始同步安装'}
          </button>
        </div>
      </section>

      <section className="onboarding-section">
        <CompletionStep syncError={syncError} syncResult={syncResult} />
      </section>
    </div>
  )
}

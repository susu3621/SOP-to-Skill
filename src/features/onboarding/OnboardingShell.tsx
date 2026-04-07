import { useEffect, useMemo, useState } from 'react'
import { AgentSelectionStep } from './steps/AgentSelectionStep'
import { CompletionStep } from './steps/CompletionStep'
import { CredentialsStep } from './steps/CredentialsStep'
import { InstallSelectionStep } from './steps/InstallSelectionStep'
import { UseCaseConfigStep } from './steps/UseCaseConfigStep'
import { useOnboarding } from './useOnboarding'
import {
  buildGeneratedSkillIdsForRoleUseCase,
  getBaseSkillNameById,
  getOnboardingAgentNameById,
  getRoleNameById,
  onboardingBaseSkills,
  onboardingRoles,
  onboardingUseCases,
} from '../../content/workbuddy'
import type {
  InstalledSkillInfo,
  OnboardingEditableUseCaseRecord,
} from '../../types'

type OnboardingView = 'home' | 'basic' | 'useCases' | 'install'
type BasicEntryView = 'role' | 'baseSkills'

interface EntryCopy {
  title: string
  summary: string
  description: string
  items: string[]
}

const onboardingHomeEntries: Record<Exclude<OnboardingView, 'home'>, EntryCopy> = {
  basic: {
    title: '基础信息设置',
    summary: '选择岗位和基础技能',
    description: '先确认角色和基础技能，再决定后续可配置的用例和安装集合。',
    items: ['选择岗位', '选择基础技能'],
  },
  useCases: {
    title: '用例配置',
    summary: '按用例分别编辑内容',
    description: '先从当前岗位的用例列表中选择一个，再查看或调整预置描述，并补充当前流程 / SOP / 模板。',
    items: onboardingUseCases.map((useCase) => useCase.name),
  },
  install: {
    title: '安装技能',
    summary: '选择目标并执行安装',
    description: '先选择要安装到的目标，再确认基础技能和岗位生成技能的安装集合。',
    items: ['选择安装目标', '确认安装集合', '开始同步安装'],
  },
}

const basicInfoEntries: Record<BasicEntryView, EntryCopy> = {
  role: {
    title: '选择岗位',
    summary: '默认项目经理',
    description: '当前前端仅暴露项目经理角色。岗位仍会决定可编辑的用例集合，以及岗位生成技能的命名和安装范围。',
    items: onboardingRoles.map((role) => role.name),
  },
  baseSkills: {
    title: '选择基础技能',
    summary: '多选基础技能',
    description: '基础技能会决定需要补充的凭证字段，也会进入最终的安装集合。',
    items: onboardingBaseSkills.map((skill) => skill.name),
  },
}

interface ModuleHeaderProps {
  eyebrow: string
  title: string
  description: string
  installedCount: number
  onBack: () => void
  onOpenInstalled: () => void
}

function ModuleHeader({
  eyebrow,
  title,
  description,
  installedCount,
  onBack,
  onOpenInstalled,
}: ModuleHeaderProps) {
  return (
    <div className="onboarding-section__header">
      <div className="field-stack onboarding-module-header__copy">
        <button className="button--ghost onboarding-back-button" type="button" onClick={onBack}>
          返回首页
        </button>
        <div>
          <span className="panel__eyebrow">{eyebrow}</span>
          <h2 className="panel__title">{title}</h2>
          <p className="panel__body">{description}</p>
        </div>
      </div>
      <button className="button--ghost" type="button" onClick={onOpenInstalled}>
        {`已安装 (${installedCount})`}
      </button>
    </div>
  )
}

interface EntryCardProps {
  index: string
  title: string
  summary: string
  active: boolean
  complete: boolean
  onClick: () => void
  onFocus: () => void
  onHover: () => void
  onLeave: () => void
}

interface SaveFeedbackBannerProps {
  feedback: { kind: 'success' | 'error'; message: string } | null | undefined
}

function SaveFeedbackBanner({ feedback }: SaveFeedbackBannerProps) {
  if (!feedback) {
    return null
  }

  return <p className={feedback.kind === 'error' ? 'error onboarding-save-banner' : 'success onboarding-save-banner'}>{feedback.message}</p>
}

function StatusBadge() {
  return <span className="onboarding-status-badge">已设置</span>
}

function EntryCard({
  index,
  title,
  summary,
  active,
  complete,
  onClick,
  onFocus,
  onHover,
  onLeave,
}: EntryCardProps) {
  return (
    <button
      aria-label={title}
      className="onboarding-entry-card"
      data-active={active}
      type="button"
      onClick={onClick}
      onBlur={onLeave}
      onFocus={onFocus}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <span className="onboarding-entry-card__meta">
        <span className="onboarding-entry-card__index">{index}</span>
        {complete && <StatusBadge />}
      </span>
      <span className="onboarding-entry-card__title">{title}</span>
      <span aria-hidden="true" className="onboarding-entry-card__summary">
        {summary}
      </span>
    </button>
  )
}

interface DetailPanelProps {
  eyebrow: string
  title: string
  description: string
  items: string[]
}

interface HomeSummaryGroup {
  label: string
  kind?: 'values' | 'installTable'
  fullWidth?: boolean
  values?: string[]
  rows?: HomeInstallSummaryRow[]
}

interface HomeInstallSummaryRow {
  useCaseName: string
  productionLabel: string
  testLabel: string
}

function DetailPanel({ eyebrow, title, description, items }: DetailPanelProps) {
  return (
    <section aria-live="polite" className="onboarding-detail-panel">
      <p className="onboarding-detail-panel__eyebrow">{eyebrow}</p>
      <h3 className="onboarding-detail-panel__title">{title}</h3>
      <p className="panel__body">{description}</p>
      <ol className="onboarding-detail-panel__items">
        {items.map((item, index) => (
          <li className="onboarding-detail-panel__item" key={item}>
            <span className="onboarding-detail-panel__item-index">{`${index + 1}.`}</span>
            <span className="onboarding-detail-panel__item-title">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function HomeSummarySection({ groups }: { groups: HomeSummaryGroup[] }) {
  return (
    <section
      aria-labelledby="onboarding-home-summary-title"
      className="onboarding-home-summary"
    >
      <h3 className="onboarding-home-summary__title" id="onboarding-home-summary-title">
        已设置内容
      </h3>
      <div className="onboarding-home-summary__grid">
        {groups.map((group) => (
          <section
            className={`onboarding-home-summary__group${group.fullWidth ? ' onboarding-home-summary__group--full-width' : ''}`}
            key={group.label}
          >
            <p className="onboarding-home-summary__label">{group.label}</p>
            {group.kind === 'installTable' ? (
              group.rows && group.rows.length > 0 ? (
                <div className="onboarding-home-install-table-wrap">
                  <table aria-label="安装技能汇总" className="onboarding-home-install-table">
                    <thead>
                      <tr>
                        <th scope="col">岗位用例</th>
                        <th scope="col">生产用</th>
                        <th scope="col">测试用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.useCaseName}>
                          <th data-label="岗位用例" scope="row">
                            {row.useCaseName}
                          </th>
                          <td data-label="生产用">{row.productionLabel}</td>
                          <td data-label="测试用">{row.testLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="onboarding-home-summary__empty">未设置</p>
              )
            ) : group.values && group.values.length > 0 ? (
              <div className="onboarding-home-summary__values">
                {group.values.map((value) => (
                  <span className="onboarding-home-summary__value" key={`${group.label}-${value}`}>
                    {value}
                  </span>
                ))}
              </div>
            ) : (
              <p className="onboarding-home-summary__empty">未设置</p>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}

interface RoleSelectionPanelProps {
  selectedRoleId: string
  onSelectRole: (roleId: string) => void
}

function RoleSelectionPanel({ selectedRoleId, onSelectRole }: RoleSelectionPanelProps) {
  return (
    <div className="field">
      <label>选择岗位</label>
      <div className="options options--cards">
        {onboardingRoles.map((role) => (
          <label className="field-option" key={role.id}>
            <input
              aria-label={role.name}
              checked={selectedRoleId === role.id}
              name="selected-role"
              type="radio"
              onChange={() => onSelectRole(role.id)}
            />
            <span>
              <span>{role.name}</span>
              <span className="field-option__hint">{role.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

interface BaseSkillSelectionPanelProps {
  selectedBaseSkillIds: string[]
  onToggleBaseSkill: (skillId: string) => void
}

function BaseSkillSelectionPanel({
  selectedBaseSkillIds,
  onToggleBaseSkill,
}: BaseSkillSelectionPanelProps) {
  return (
    <div className="field">
      <label>基础技能</label>
      <div className="options options--cards">
        {onboardingBaseSkills.map((skill) => (
          <label className="field-option" key={skill.id}>
            <input
              aria-label={skill.name}
              checked={selectedBaseSkillIds.includes(skill.id)}
              type="checkbox"
              onChange={() => onToggleBaseSkill(skill.id)}
            />
            <span>
              <span>{skill.name}</span>
              <span className="field-option__hint">{skill.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

interface UseCaseListProps {
  activeUseCaseId: string | null
  configuredById: Record<string, boolean>
  useCases: OnboardingEditableUseCaseRecord[]
  onSelect: (useCaseId: string) => void
}

function UseCaseList({ activeUseCaseId, configuredById, useCases, onSelect }: UseCaseListProps) {
  return (
    <div className="onboarding-use-case-list">
      {useCases.map((useCase, index) => (
        <button
          aria-label={useCase.use_case_name}
          className="onboarding-use-case-list__item"
          data-active={activeUseCaseId === useCase.use_case_id}
          key={useCase.use_case_id}
          type="button"
          onClick={() => onSelect(useCase.use_case_id)}
        >
          <span className="onboarding-use-case-list__index">{`${index + 1}`}</span>
          <span className="onboarding-use-case-list__copy">
            <span className="onboarding-use-case-list__title-row">
              <span className="onboarding-use-case-list__title">{useCase.use_case_name}</span>
              {configuredById[useCase.use_case_id] && <StatusBadge />}
            </span>
            <span className="onboarding-use-case-list__subtitle">{useCase.use_case_id}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

interface BasicEditorPanelProps {
  basicEntryView: BasicEntryView | null
  selectedRoleId: string
  selectedBaseSkillIds: string[]
  saveFeedback: { kind: 'success' | 'error'; message: string } | null | undefined
  saveDisabled: boolean
  saving: boolean
  onSave: () => void
  onSelectRole: (roleId: string) => void
  onToggleBaseSkill: (skillId: string) => void
}

function BasicEditorPanel({
  basicEntryView,
  selectedRoleId,
  selectedBaseSkillIds,
  saveFeedback,
  saveDisabled,
  saving,
  onSave,
  onSelectRole,
  onToggleBaseSkill,
}: BasicEditorPanelProps) {
  if (!basicEntryView) {
    return (
      <p className="hint-callout">
        先选择一个二级入口，再进入对应的基础信息编辑界面。
      </p>
    )
  }

  return (
    <section className="summary-card onboarding-subeditor-panel">
      <SaveFeedbackBanner feedback={saveFeedback} />
      <h3>{basicInfoEntries[basicEntryView].title}</h3>
      <p>{basicInfoEntries[basicEntryView].description}</p>
      {basicEntryView === 'role' ? (
        <RoleSelectionPanel selectedRoleId={selectedRoleId} onSelectRole={onSelectRole} />
      ) : (
        <BaseSkillSelectionPanel
          selectedBaseSkillIds={selectedBaseSkillIds}
          onToggleBaseSkill={onToggleBaseSkill}
        />
      )}
      <div className="button-row">
        <button className="button" disabled={saveDisabled} type="button" onClick={onSave}>
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </section>
  )
}

interface InstallModuleProps {
  credentialFields: ReturnType<typeof useOnboarding>['credentialFields']
  installCandidateGroups: ReturnType<typeof useOnboarding>['installCandidateGroups']
  installedCount: number
  onOpenInstalled: () => void
  onBack: () => void
  preview: ReturnType<typeof useOnboarding>['preview']
  previewError: string | null
  selectedAgentIds: string[]
  selectedBaseSkillIds: string[]
  saveDisabled: boolean
  saveFeedback: { kind: 'success' | 'error'; message: string } | null | undefined
  saving: boolean
  syncError: string | null
  syncing: boolean
  syncResult: ReturnType<typeof useOnboarding>['syncResult']
  onSave: () => void
  onStartSync: () => void
  onToggleAgent: (agentId: string) => void
  onToggleInstallSkill: (skillId: string) => void
  credentialValues: Record<string, string>
  onUpdateCredential: (fieldId: string, value: string) => void
}

function InstallModule({
  credentialFields,
  installCandidateGroups,
  installedCount,
  onOpenInstalled,
  onBack,
  preview,
  previewError,
  selectedAgentIds,
  selectedBaseSkillIds,
  saveDisabled,
  saveFeedback,
  saving,
  syncError,
  syncing,
  syncResult,
  onSave,
  onStartSync,
  onToggleAgent,
  onToggleInstallSkill,
  credentialValues,
  onUpdateCredential,
}: InstallModuleProps) {
  return (
    <div className="onboarding-shell">
      <section className="onboarding-section">
        <ModuleHeader
          description="先选择安装目标，再确认基础技能和岗位生成技能的安装集合，最后执行同步安装。"
          eyebrow="安装技能"
          installedCount={installedCount}
          title="安装技能"
          onBack={onBack}
          onOpenInstalled={onOpenInstalled}
        />
        <SaveFeedbackBanner feedback={saveFeedback} />
        <div className="field-stack">
          <AgentSelectionStep selectedAgentIds={selectedAgentIds} onToggleAgent={onToggleAgent} />
          {previewError && <p className="error">{previewError}</p>}
          <InstallSelectionStep
            agentPreviews={preview.agent_previews}
            installCandidateGroups={installCandidateGroups}
            selectedAgentIds={selectedAgentIds}
            selectedBaseSkillIds={selectedBaseSkillIds}
            selectedInstallSkillIds={preview.selected_install_skill_ids}
            onToggleInstallSkill={onToggleInstallSkill}
          />
          <section className="summary-card onboarding-subeditor-panel">
            <h3>账号凭证</h3>
            <p>只显示当前仍被选择的基础技能所需的凭证字段。</p>
            <CredentialsStep
              credentialFields={credentialFields}
              credentialValues={credentialValues}
              onUpdateCredential={onUpdateCredential}
            />
          </section>
          <div className="button-row">
            <button className="button--ghost" disabled={saveDisabled} type="button" onClick={onSave}>
              {saving ? '保存中...' : '保存设置'}
            </button>
            <button
              className="button"
              type="button"
              onClick={onStartSync}
              disabled={syncing || selectedAgentIds.length === 0}
            >
              {syncing ? '同步中...' : '开始同步安装'}
            </button>
          </div>
          <section className="summary-card onboarding-subeditor-panel">
            <CompletionStep syncError={syncError} syncResult={syncResult} />
          </section>
        </div>
      </section>
    </div>
  )
}

interface OnboardingShellProps {
  installedSkills: InstalledSkillInfo[]
  onOpenInstalled: () => void
}

export function OnboardingShell({ installedSkills, onOpenInstalled }: OnboardingShellProps) {
  const {
    completion,
    credentialFields,
    dirty,
    installCandidateGroups,
    loading,
    preview,
    previewError,
    saveFeedbacks,
    saveState,
    savedResolvedSelectedInstallSkillIds,
    savingScope,
    state,
    savedState,
    syncError,
    syncing,
    syncResult,
    startSync,
    toggleAgent,
    toggleBaseSkill,
    getUseCaseSaveScope,
    toggleInstallSkill,
    updateCredentialValue,
    updateUseCaseContent,
    selectRole,
  } = useOnboarding(installedSkills)

  const [view, setView] = useState<OnboardingView>('home')
  const [hoveredHomeEntry, setHoveredHomeEntry] = useState<Exclude<OnboardingView, 'home'> | null>(null)
  const [basicEntryView, setBasicEntryView] = useState<BasicEntryView | null>(null)
  const [hoveredBasicEntry, setHoveredBasicEntry] = useState<BasicEntryView | null>(null)
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedUseCaseId || !state.role_use_case_contents.some((item) => item.use_case_id === selectedUseCaseId)) {
      setSelectedUseCaseId(state.role_use_case_contents[0]?.use_case_id ?? null)
    }
  }, [selectedUseCaseId, state.role_use_case_contents])

  const activeUseCase = useMemo(
    () =>
      state.role_use_case_contents.find((useCase) => useCase.use_case_id === selectedUseCaseId) ??
      state.role_use_case_contents[0] ??
      null,
    [selectedUseCaseId, state.role_use_case_contents]
  )
  const activeBasicScope: 'role' | 'baseSkills' | null =
    basicEntryView === 'role' || basicEntryView === 'baseSkills' ? basicEntryView : null
  const activeUseCaseScope = activeUseCase ? getUseCaseSaveScope(activeUseCase.use_case_id) : null
  const homeSummaryGroups = useMemo<HomeSummaryGroup[]>(
    () => [
      {
        label: '已选岗位',
        kind: 'values',
        values: savedState.selected_role_id ? [getRoleNameById(savedState.selected_role_id)] : [],
      },
      {
        label: '基础技能',
        kind: 'values',
        values: savedState.selected_base_skill_ids.map((skillId) => getBaseSkillNameById(skillId)),
      },
      {
        label: '已配置用例',
        kind: 'values',
        values: savedState.role_use_case_contents
          .filter((useCase) => completion.useCaseIds[useCase.use_case_id])
          .map((useCase) => useCase.use_case_name),
      },
      {
        label: '安装目标',
        kind: 'values',
        values: savedState.selected_agent_ids.map((agentId) => getOnboardingAgentNameById(agentId)),
      },
      {
        label: '安装技能',
        kind: 'installTable',
        fullWidth: true,
        rows: savedState.selected_role_id
          ? savedState.role_use_case_contents.map((useCase) => {
              const generatedSkillIds = buildGeneratedSkillIdsForRoleUseCase(
                savedState.selected_role_id,
                useCase.use_case_id
              )
              return {
                useCaseName: useCase.use_case_name,
                productionLabel: savedResolvedSelectedInstallSkillIds.includes(
                  generatedSkillIds.production_skill_id
                )
                  ? generatedSkillIds.production_skill_id
                  : '未安装',
                testLabel: savedResolvedSelectedInstallSkillIds.includes(
                  generatedSkillIds.test_skill_id
                )
                  ? generatedSkillIds.test_skill_id
                  : '未安装',
              }
            })
          : [],
      },
    ],
    [completion.useCaseIds, savedResolvedSelectedInstallSkillIds, savedState]
  )

  if (loading) {
    return <p className="muted">正在加载 onboarding 配置...</p>
  }

  if (view === 'home') {
    const detail = hoveredHomeEntry ? onboardingHomeEntries[hoveredHomeEntry] : null

    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <div className="onboarding-section__header">
            <div>
              <span className="panel__eyebrow">Onboarding</span>
              <h2 className="panel__title">开始设置</h2>
              <p className="panel__body">
                先从三个模块中选择一个入口。首页只负责导航，详细说明放到下方详情区，避免重新回到长流程页面。
              </p>
            </div>
            <button className="button--ghost" type="button" onClick={onOpenInstalled}>
              {`已安装 (${installedSkills.length})`}
            </button>
          </div>

          <div className="onboarding-entry-grid">
            <EntryCard
              active={hoveredHomeEntry === 'basic'}
              complete={completion.basic}
              index="01"
              summary={onboardingHomeEntries.basic.summary}
              title={onboardingHomeEntries.basic.title}
              onClick={() => {
                setView('basic')
                setBasicEntryView(null)
                setHoveredBasicEntry(null)
              }}
              onFocus={() => setHoveredHomeEntry('basic')}
              onHover={() => setHoveredHomeEntry('basic')}
              onLeave={() => setHoveredHomeEntry(null)}
            />
            <EntryCard
              active={hoveredHomeEntry === 'useCases'}
              complete={completion.useCases}
              index="02"
              summary={onboardingHomeEntries.useCases.summary}
              title={onboardingHomeEntries.useCases.title}
              onClick={() => setView('useCases')}
              onFocus={() => setHoveredHomeEntry('useCases')}
              onHover={() => setHoveredHomeEntry('useCases')}
              onLeave={() => setHoveredHomeEntry(null)}
            />
            <EntryCard
              active={hoveredHomeEntry === 'install'}
              complete={completion.install}
              index="03"
              summary={onboardingHomeEntries.install.summary}
              title={onboardingHomeEntries.install.title}
              onClick={() => setView('install')}
              onFocus={() => setHoveredHomeEntry('install')}
              onHover={() => setHoveredHomeEntry('install')}
              onLeave={() => setHoveredHomeEntry(null)}
            />
          </div>

          {detail && (
            <DetailPanel
              description={detail.description}
              eyebrow="模块说明"
              items={detail.items}
              title={detail.title}
            />
          )}

          <HomeSummarySection groups={homeSummaryGroups} />
        </section>
      </div>
    )
  }

  if (view === 'basic') {
    const detail = hoveredBasicEntry ? basicInfoEntries[hoveredBasicEntry] : null

    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <ModuleHeader
            description="基础信息设置只负责岗位和基础技能，不混入用例编辑或安装执行。"
            eyebrow="基础信息设置"
            installedCount={installedSkills.length}
            title="基础信息设置"
            onBack={() => setView('home')}
            onOpenInstalled={onOpenInstalled}
          />

          <div className="onboarding-entry-grid onboarding-entry-grid--nested">
            <EntryCard
              active={hoveredBasicEntry === 'role'}
              complete={completion.role}
              index="1"
              summary={basicInfoEntries.role.summary}
              title={basicInfoEntries.role.title}
              onClick={() => {
                setBasicEntryView('role')
                setHoveredBasicEntry('role')
              }}
              onFocus={() => setHoveredBasicEntry('role')}
              onHover={() => setHoveredBasicEntry('role')}
              onLeave={() => setHoveredBasicEntry(null)}
            />
            <EntryCard
              active={hoveredBasicEntry === 'baseSkills'}
              complete={completion.baseSkills}
              index="2"
              summary={basicInfoEntries.baseSkills.summary}
              title={basicInfoEntries.baseSkills.title}
              onClick={() => {
                setBasicEntryView('baseSkills')
                setHoveredBasicEntry('baseSkills')
              }}
              onFocus={() => setHoveredBasicEntry('baseSkills')}
              onHover={() => setHoveredBasicEntry('baseSkills')}
              onLeave={() => setHoveredBasicEntry(null)}
            />
          </div>

          {detail && (
            <DetailPanel
              description={detail.description}
              eyebrow="二级入口说明"
              items={detail.items}
              title={detail.title}
            />
          )}

          <BasicEditorPanel
            basicEntryView={basicEntryView}
            saveDisabled={!activeBasicScope || !dirty[activeBasicScope] || savingScope === activeBasicScope}
            saveFeedback={activeBasicScope ? saveFeedbacks[activeBasicScope] : null}
            saving={activeBasicScope ? savingScope === activeBasicScope : false}
            selectedBaseSkillIds={state.selected_base_skill_ids}
            selectedRoleId={state.selected_role_id}
            onSave={() => {
              if (activeBasicScope) {
                void saveState(activeBasicScope)
              }
            }}
            onSelectRole={selectRole}
            onToggleBaseSkill={toggleBaseSkill}
          />
        </section>
      </div>
    )
  }

  if (view === 'useCases') {
    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <ModuleHeader
            description="先从当前岗位的用例列表中选择一个，再查看或调整预置描述，并补充当前流程 / SOP / 模板。"
            eyebrow="用例配置"
            installedCount={installedSkills.length}
            title="用例配置"
            onBack={() => setView('home')}
            onOpenInstalled={onOpenInstalled}
          />

          <div className="onboarding-module-grid">
            <section className="summary-card onboarding-module-grid__sidebar">
              <h3>可配置用例</h3>
              <p>当前岗位下可用的用例入口。</p>
              <UseCaseList
                activeUseCaseId={activeUseCase?.use_case_id ?? null}
                configuredById={completion.useCaseIds}
                useCases={state.role_use_case_contents}
                onSelect={setSelectedUseCaseId}
              />
            </section>

            <section className="summary-card onboarding-module-grid__content">
              {activeUseCase ? (
                <div className="onboarding-subeditor-panel">
                  <SaveFeedbackBanner
                    feedback={activeUseCaseScope ? saveFeedbacks[activeUseCaseScope] : null}
                  />
                  <UseCaseConfigStep
                    useCases={[activeUseCase]}
                    onUpdate={updateUseCaseContent}
                  />
                  <div className="button-row">
                    <button
                      className="button"
                      disabled={
                        !activeUseCaseScope ||
                        !dirty.useCases[activeUseCase.use_case_id] ||
                        savingScope === activeUseCaseScope
                      }
                      type="button"
                      onClick={() => {
                        if (activeUseCaseScope) {
                          void saveState(activeUseCaseScope)
                        }
                      }}
                    >
                      {savingScope === activeUseCaseScope ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="hint-callout">当前岗位没有可配置的用例。</p>
              )}
            </section>
          </div>
        </section>
      </div>
    )
  }

  return (
    <InstallModule
      credentialFields={credentialFields}
      credentialValues={state.credential_values}
      installCandidateGroups={installCandidateGroups}
      installedCount={installedSkills.length}
      preview={preview}
      previewError={previewError}
      saveDisabled={!dirty.install || savingScope === 'install'}
      saveFeedback={saveFeedbacks.install}
      saving={savingScope === 'install'}
      selectedAgentIds={state.selected_agent_ids}
      selectedBaseSkillIds={state.selected_base_skill_ids}
      syncError={syncError}
      syncing={syncing}
      syncResult={syncResult}
      onBack={() => setView('home')}
      onOpenInstalled={onOpenInstalled}
      onSave={() => void saveState('install')}
      onStartSync={startSync}
      onToggleAgent={toggleAgent}
      onToggleInstallSkill={toggleInstallSkill}
      onUpdateCredential={updateCredentialValue}
    />
  )
}

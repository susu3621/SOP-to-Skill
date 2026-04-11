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
  getOnboardingBaseSkillGroupOptions,
  getOnboardingRoleOptions,
  getOnboardingUseCaseNameById,
  getOnboardingUseCaseOptionById,
  getRoleNameById,
} from '../../content/workbuddy'
import type {
  InstalledSkillInfo,
  Locale,
  OnboardingEditableUseCaseRecord,
} from '../../types'
import { getOnboardingCopy, getOnboardingList, onboardingCopy } from './copy'

type OnboardingView = 'home' | 'basic' | 'useCases' | 'install'
type UseCaseTab = 'role' | 'work'

interface EntryCopy {
  title: string
  summary: string
  description: string
  items: string[]
}

function getOnboardingHomeEntries(locale: Locale): Record<Exclude<OnboardingView, 'home'>, EntryCopy> {
  return {
    basic: {
      title: getOnboardingCopy(locale, onboardingCopy.homeEntries.basic.title),
      summary: getOnboardingCopy(locale, onboardingCopy.homeEntries.basic.summary),
      description: getOnboardingCopy(locale, onboardingCopy.homeEntries.basic.description),
      items: getOnboardingList(locale, onboardingCopy.homeEntries.basic.items),
    },
    useCases: {
      title: getOnboardingCopy(locale, onboardingCopy.homeEntries.useCases.title),
      summary: getOnboardingCopy(locale, onboardingCopy.homeEntries.useCases.summary),
      description: getOnboardingCopy(locale, onboardingCopy.homeEntries.useCases.description),
      items: getOnboardingList(locale, onboardingCopy.homeEntries.useCases.items),
    },
    install: {
      title: getOnboardingCopy(locale, onboardingCopy.homeEntries.install.title),
      summary: getOnboardingCopy(locale, onboardingCopy.homeEntries.install.summary),
      description: getOnboardingCopy(locale, onboardingCopy.homeEntries.install.description),
      items: getOnboardingList(locale, onboardingCopy.homeEntries.install.items),
    },
  }
}

interface ModuleHeaderProps {
  locale: Locale
  eyebrow: string
  title?: string
  description: string
  installedCount: number
  onBack: () => void
  onOpenInstalled: () => void
}

function ModuleHeader({
  locale,
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
          {getOnboardingCopy(locale, onboardingCopy.backHome)}
        </button>
        <div>
          <span className="panel__eyebrow">{eyebrow}</span>
          {title ? <h2 className="panel__title">{title}</h2> : null}
          <p className="panel__body">{description}</p>
        </div>
      </div>
      <button className="button--ghost" type="button" onClick={onOpenInstalled}>
        {`${getOnboardingCopy(locale, onboardingCopy.installedCount)} (${installedCount})`}
      </button>
    </div>
  )
}

interface EntryCardProps {
  locale: Locale
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

function StatusBadge({ locale }: { locale: Locale }) {
  return (
    <span className="onboarding-status-badge">
      {getOnboardingCopy(locale, onboardingCopy.configured)}
    </span>
  )
}

function EntryCard({
  locale,
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
        {complete && <StatusBadge locale={locale} />}
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
  className?: string
  placement?: 'left' | 'right'
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

function DetailPanel({
  eyebrow,
  title,
  description,
  items,
  className,
  placement = 'right',
}: DetailPanelProps) {
  return (
    <section
      aria-live="polite"
      className={`onboarding-detail-panel${className ? ` ${className}` : ''}`}
      data-placement={placement}
    >
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

function HomeSummarySection({ groups, locale }: { groups: HomeSummaryGroup[]; locale: Locale }) {
  return (
    <section
      aria-labelledby="onboarding-home-summary-title"
      className="onboarding-home-summary"
    >
      <h3 className="onboarding-home-summary__title" id="onboarding-home-summary-title">
        {getOnboardingCopy(locale, onboardingCopy.homeSummaryTitle)}
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
                  <table
                    aria-label={getOnboardingCopy(locale, onboardingCopy.homeInstalledSkillsTable)}
                    className="onboarding-home-install-table"
                  >
                    <thead>
                      <tr>
                        <th scope="col">{getOnboardingCopy(locale, onboardingCopy.useCaseColumn)}</th>
                        <th scope="col">{getOnboardingCopy(locale, onboardingCopy.productionColumn)}</th>
                        <th scope="col">{getOnboardingCopy(locale, onboardingCopy.testColumn)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.useCaseName}>
                          <th
                            data-label={getOnboardingCopy(locale, onboardingCopy.useCaseColumn)}
                            scope="row"
                          >
                            {row.useCaseName}
                          </th>
                          <td data-label={getOnboardingCopy(locale, onboardingCopy.productionColumn)}>
                            {row.productionLabel}
                          </td>
                          <td data-label={getOnboardingCopy(locale, onboardingCopy.testColumn)}>
                            {row.testLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="onboarding-home-summary__empty">
                  {getOnboardingCopy(locale, onboardingCopy.empty)}
                </p>
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
              <p className="onboarding-home-summary__empty">
                {getOnboardingCopy(locale, onboardingCopy.empty)}
              </p>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}

interface RoleSelectionPanelProps {
  locale: Locale
  selectedRoleId: string
  onSelectRole: (roleId: string) => void
}

function RoleSelectionPanel({ locale, selectedRoleId, onSelectRole }: RoleSelectionPanelProps) {
  const roles = getOnboardingRoleOptions(locale)

  return (
    <div className="field">
      <div className="options options--cards">
        {roles.map((role) => (
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
  locale: Locale
  selectedBaseSkillIds: string[]
  onToggleBaseSkill: (skillId: string) => void
}

function BaseSkillSelectionPanel({
  locale,
  selectedBaseSkillIds,
  onToggleBaseSkill,
}: BaseSkillSelectionPanelProps) {
  const groups = getOnboardingBaseSkillGroupOptions(locale)

  return (
    <div className="field">
      <div className="onboarding-base-skill-groups">
        {groups.map((group) => (
          <section className="onboarding-base-skill-group" key={group.id}>
            <div className="onboarding-base-skill-group__header">
              <h4>{group.name}</h4>
              <p>{group.description}</p>
            </div>
            <div className="options options--cards onboarding-base-skill-group__options">
              {group.skills.map((skill) => (
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
          </section>
        ))}
      </div>
    </div>
  )
}

interface UseCaseListProps {
  locale: Locale
  activeUseCaseId: string | null
  configuredById: Record<string, boolean>
  useCases: OnboardingEditableUseCaseRecord[]
  onSelect: (useCaseId: string) => void
}

function UseCaseList({
  locale,
  activeUseCaseId,
  configuredById,
  useCases,
  onSelect,
}: UseCaseListProps) {
  return (
    <div className="onboarding-use-case-list">
      {useCases.map((useCase, index) => (
        (() => {
          const isCustomUseCase = getOnboardingUseCaseOptionById(useCase.use_case_id) == null

          return (
            <button
              aria-label={
                getOnboardingUseCaseNameById(useCase.use_case_id, locale) || useCase.use_case_name
              }
              className="onboarding-use-case-list__item"
              data-active={activeUseCaseId === useCase.use_case_id}
              key={useCase.use_case_id}
              type="button"
              onClick={() => onSelect(useCase.use_case_id)}
            >
              <span className="onboarding-use-case-list__index">{`${index + 1}`}</span>
              <span className="onboarding-use-case-list__copy">
                <span className="onboarding-use-case-list__title-row">
                  <span className="onboarding-use-case-list__title">
                    {getOnboardingUseCaseNameById(useCase.use_case_id, locale) ||
                      useCase.use_case_name}
                  </span>
                  {configuredById[useCase.use_case_id] && <StatusBadge locale={locale} />}
                </span>
                <span className="onboarding-use-case-list__subtitle">
                  {isCustomUseCase
                    ? getOnboardingCopy(locale, onboardingCopy.customUseCase)
                    : useCase.use_case_id}
                </span>
              </span>
            </button>
          )
        })()
      ))}
    </div>
  )
}

interface InstallModuleProps {
  locale: Locale
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
}

function InstallModule({
  locale,
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
}: InstallModuleProps) {
  return (
    <div className="onboarding-shell">
      <section className="onboarding-section">
        <ModuleHeader
          locale={locale}
          description={getOnboardingCopy(locale, onboardingCopy.installModuleDescription)}
          eyebrow={getOnboardingCopy(locale, onboardingCopy.homeEntries.install.title)}
          installedCount={installedCount}
          onBack={onBack}
          onOpenInstalled={onOpenInstalled}
        />
        <SaveFeedbackBanner feedback={saveFeedback} />
        <div className="field-stack">
          <AgentSelectionStep
            locale={locale}
            selectedAgentIds={selectedAgentIds}
            onToggleAgent={onToggleAgent}
          />
          {previewError && <p className="error">{previewError}</p>}
          <InstallSelectionStep
            locale={locale}
            agentPreviews={preview.agent_previews}
            installCandidateGroups={installCandidateGroups}
            selectedAgentIds={selectedAgentIds}
            selectedBaseSkillIds={selectedBaseSkillIds}
            selectedInstallSkillIds={preview.selected_install_skill_ids}
            onToggleInstallSkill={onToggleInstallSkill}
          />
          <div className="button-row">
            <button className="button--ghost" disabled={saveDisabled} type="button" onClick={onSave}>
              {saving
                ? getOnboardingCopy(locale, onboardingCopy.saving)
                : getOnboardingCopy(locale, onboardingCopy.saveSettings)}
            </button>
            <button
              className="button"
              type="button"
              onClick={onStartSync}
              disabled={syncing || selectedAgentIds.length === 0}
            >
              {syncing
                ? getOnboardingCopy(locale, onboardingCopy.syncing)
                : getOnboardingCopy(locale, onboardingCopy.sync)}
            </button>
          </div>
          <section className="summary-card onboarding-subeditor-panel">
            <CompletionStep locale={locale} syncError={syncError} syncResult={syncResult} />
          </section>
        </div>
      </section>
    </div>
  )
}

interface OnboardingShellProps {
  locale: Locale
  installedSkills: InstalledSkillInfo[]
  onOpenInstalled: () => void
}

export function OnboardingShell({ locale, installedSkills, onOpenInstalled }: OnboardingShellProps) {
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
    addUseCase,
    updateCredentialValue,
    updateUseCaseContent,
    selectRole,
  } = useOnboarding(installedSkills, locale)

  const [view, setView] = useState<OnboardingView>('home')
  const [activeUseCaseTab, setActiveUseCaseTab] = useState<UseCaseTab>('role')
  const [hoveredHomeEntry, setHoveredHomeEntry] = useState<Exclude<OnboardingView, 'home'> | null>(null)
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null)
  const [showNewUseCaseForm, setShowNewUseCaseForm] = useState(false)
  const [newUseCaseName, setNewUseCaseName] = useState('')
  const [newUseCaseError, setNewUseCaseError] = useState<string | null>(null)
  const onboardingHomeEntries = useMemo(() => getOnboardingHomeEntries(locale), [locale])

  const openView = (nextView: OnboardingView) => {
    setView(nextView)

    if (nextView === 'useCases') {
      setActiveUseCaseTab('role')
    }
  }

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
  const activeUseCaseScope = activeUseCase ? getUseCaseSaveScope(activeUseCase.use_case_id) : null
  const handleAddUseCase = () => {
    const trimmedUseCaseName = newUseCaseName.trim()

    if (!trimmedUseCaseName) {
      setNewUseCaseError(getOnboardingCopy(locale, onboardingCopy.newUseCaseEmptyError))
      return
    }

    if (
      state.role_use_case_contents.some(
        (useCase) =>
          useCase.role_id === state.selected_role_id &&
          useCase.use_case_name.trim() === trimmedUseCaseName
      )
    ) {
      setNewUseCaseError(getOnboardingCopy(locale, onboardingCopy.newUseCaseDuplicateError))
      return
    }

    const createdUseCaseId = addUseCase(trimmedUseCaseName)
    if (!createdUseCaseId) {
      setNewUseCaseError(getOnboardingCopy(locale, onboardingCopy.newUseCaseFailedError))
      return
    }

    setSelectedUseCaseId(createdUseCaseId)
    setNewUseCaseName('')
    setNewUseCaseError(null)
    setShowNewUseCaseForm(false)
  }
  const homeSummaryGroups = useMemo<HomeSummaryGroup[]>(
    () => [
      {
        label: getOnboardingCopy(locale, onboardingCopy.homeSelectedRole),
        kind: 'values',
        values: savedState.selected_role_id ? [getRoleNameById(savedState.selected_role_id, locale)] : [],
      },
      {
        label: getOnboardingCopy(locale, onboardingCopy.homeBaseSkills),
        kind: 'values',
        values: savedState.selected_base_skill_ids.map((skillId) =>
          getBaseSkillNameById(skillId, locale)
        ),
      },
      {
        label: getOnboardingCopy(locale, onboardingCopy.homeConfiguredWork),
        kind: 'values',
        values: savedState.role_use_case_contents
          .filter((useCase) => completion.useCaseIds[useCase.use_case_id])
          .map((useCase) => getOnboardingUseCaseNameById(useCase.use_case_id, locale) || useCase.use_case_name),
      },
      {
        label: getOnboardingCopy(locale, onboardingCopy.homeInstallTargets),
        kind: 'values',
        values: savedState.selected_agent_ids.map((agentId) =>
          getOnboardingAgentNameById(agentId, locale)
        ),
      },
      {
        label: getOnboardingCopy(locale, onboardingCopy.homeInstalledSkills),
        kind: 'installTable',
        fullWidth: true,
        rows: savedState.selected_role_id
          ? savedState.role_use_case_contents.map((useCase) => {
              const generatedSkillIds = buildGeneratedSkillIdsForRoleUseCase(
                savedState.selected_role_id,
                useCase.use_case_id
              )
              return {
                useCaseName:
                  getOnboardingUseCaseNameById(useCase.use_case_id, locale) || useCase.use_case_name,
                productionLabel: savedResolvedSelectedInstallSkillIds.includes(
                  generatedSkillIds.production_skill_id
                )
                  ? generatedSkillIds.production_skill_id
                  : getOnboardingCopy(locale, onboardingCopy.notInstalled),
                testLabel: savedResolvedSelectedInstallSkillIds.includes(
                  generatedSkillIds.test_skill_id
                )
                  ? generatedSkillIds.test_skill_id
                  : getOnboardingCopy(locale, onboardingCopy.notInstalled),
              }
            })
          : [],
      },
    ],
    [completion.useCaseIds, locale, savedResolvedSelectedInstallSkillIds, savedState]
  )

  if (loading) {
    return <p className="muted">{getOnboardingCopy(locale, onboardingCopy.loading)}</p>
  }

  if (view === 'home') {
    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <div className="onboarding-section__header">
            <div>
              <span className="panel__eyebrow">
                {getOnboardingCopy(locale, onboardingCopy.homeEyebrow)}
              </span>
              <p className="panel__body">
                {getOnboardingCopy(locale, onboardingCopy.homeBody)}
              </p>
            </div>
            <button className="button--ghost" type="button" onClick={onOpenInstalled}>
              {`${getOnboardingCopy(locale, onboardingCopy.installedCount)} (${installedSkills.length})`}
            </button>
          </div>

          <div className="onboarding-entry-grid">
            <div className="onboarding-entry-card-shell onboarding-entry-card-shell--uniform">
              <EntryCard
                locale={locale}
                active={hoveredHomeEntry === 'basic'}
                complete={completion.baseSkills}
                index="01"
                summary={onboardingHomeEntries.basic.summary}
                title={onboardingHomeEntries.basic.title}
                onClick={() => openView('basic')}
                onFocus={() => setHoveredHomeEntry('basic')}
                onHover={() => setHoveredHomeEntry('basic')}
                onLeave={() => setHoveredHomeEntry(null)}
              />
              {hoveredHomeEntry === 'basic' && (
                <DetailPanel
                  className="onboarding-detail-panel--bubble"
                  description={onboardingHomeEntries.basic.description}
                  eyebrow={getOnboardingCopy(locale, onboardingCopy.moduleGuideEyebrow)}
                  items={onboardingHomeEntries.basic.items}
                  placement="right"
                  title={onboardingHomeEntries.basic.title}
                />
              )}
            </div>
            <div className="onboarding-entry-card-shell onboarding-entry-card-shell--uniform">
              <EntryCard
                locale={locale}
                active={hoveredHomeEntry === 'useCases'}
                complete={completion.role && completion.useCases}
                index="02"
                summary={onboardingHomeEntries.useCases.summary}
                title={onboardingHomeEntries.useCases.title}
                onClick={() => openView('useCases')}
                onFocus={() => setHoveredHomeEntry('useCases')}
                onHover={() => setHoveredHomeEntry('useCases')}
                onLeave={() => setHoveredHomeEntry(null)}
              />
              {hoveredHomeEntry === 'useCases' && (
                <DetailPanel
                  className="onboarding-detail-panel--bubble"
                  description={onboardingHomeEntries.useCases.description}
                  eyebrow={getOnboardingCopy(locale, onboardingCopy.moduleGuideEyebrow)}
                  items={onboardingHomeEntries.useCases.items}
                  placement="right"
                  title={onboardingHomeEntries.useCases.title}
                />
              )}
            </div>
            <div className="onboarding-entry-card-shell onboarding-entry-card-shell--uniform">
              <EntryCard
                locale={locale}
                active={hoveredHomeEntry === 'install'}
                complete={completion.install}
                index="03"
                summary={onboardingHomeEntries.install.summary}
                title={onboardingHomeEntries.install.title}
                onClick={() => openView('install')}
                onFocus={() => setHoveredHomeEntry('install')}
                onHover={() => setHoveredHomeEntry('install')}
                onLeave={() => setHoveredHomeEntry(null)}
              />
              {hoveredHomeEntry === 'install' && (
                <DetailPanel
                  className="onboarding-detail-panel--bubble"
                  description={onboardingHomeEntries.install.description}
                  eyebrow={getOnboardingCopy(locale, onboardingCopy.moduleGuideEyebrow)}
                  items={onboardingHomeEntries.install.items}
                  placement="left"
                  title={onboardingHomeEntries.install.title}
                />
              )}
            </div>
          </div>

          <HomeSummarySection groups={homeSummaryGroups} locale={locale} />
        </section>
      </div>
    )
  }

  if (view === 'basic') {
    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <ModuleHeader
            locale={locale}
            description={getOnboardingCopy(locale, onboardingCopy.basicModuleDescription)}
            eyebrow={getOnboardingCopy(locale, onboardingCopy.homeEntries.basic.title)}
            installedCount={installedSkills.length}
            onBack={() => setView('home')}
            onOpenInstalled={onOpenInstalled}
          />

          <section className="summary-card onboarding-subeditor-panel">
            <SaveFeedbackBanner feedback={saveFeedbacks.baseSkills} />
            <BaseSkillSelectionPanel
              locale={locale}
              selectedBaseSkillIds={state.selected_base_skill_ids}
              onToggleBaseSkill={toggleBaseSkill}
            />
            <section className="summary-card onboarding-subeditor-panel">
              <h3>{getOnboardingCopy(locale, onboardingCopy.credentialsTitle)}</h3>
              <p>{getOnboardingCopy(locale, onboardingCopy.credentialsBody)}</p>
              <CredentialsStep
                locale={locale}
                credentialFields={credentialFields}
                credentialValues={state.credential_values}
                onUpdateCredential={updateCredentialValue}
              />
            </section>
            <div className="button-row">
              <button
                className="button"
                disabled={!dirty.baseSkills || savingScope === 'baseSkills'}
                type="button"
                onClick={() => void saveState('baseSkills')}
              >
                {savingScope === 'baseSkills'
                  ? getOnboardingCopy(locale, onboardingCopy.saving)
                  : getOnboardingCopy(locale, onboardingCopy.saveSettings)}
              </button>
            </div>
          </section>
        </section>
      </div>
    )
  }

  if (view === 'useCases') {
    return (
      <div className="onboarding-shell">
        <section className="onboarding-section">
          <ModuleHeader
            locale={locale}
            description={getOnboardingCopy(locale, onboardingCopy.useCasesModuleDescription)}
            eyebrow={getOnboardingCopy(locale, onboardingCopy.homeEntries.useCases.title)}
            installedCount={installedSkills.length}
            onBack={() => setView('home')}
            onOpenInstalled={onOpenInstalled}
          />

          <div className="onboarding-work-tabs">
            <div
              aria-label={getOnboardingCopy(locale, onboardingCopy.workTabAriaLabel)}
              className="onboarding-tablist"
              role="tablist"
            >
              <button
                aria-controls="onboarding-role-tabpanel"
                aria-selected={activeUseCaseTab === 'role'}
                className="onboarding-tab"
                id="onboarding-role-tab"
                role="tab"
                tabIndex={activeUseCaseTab === 'role' ? 0 : -1}
                type="button"
                onClick={() => setActiveUseCaseTab('role')}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    setActiveUseCaseTab('work')
                  }
                }}
              >
                {getOnboardingCopy(locale, onboardingCopy.roleTab)}
              </button>
              <button
                aria-controls="onboarding-work-tabpanel"
                aria-selected={activeUseCaseTab === 'work'}
                className="onboarding-tab"
                id="onboarding-work-tab"
                role="tab"
                tabIndex={activeUseCaseTab === 'work' ? 0 : -1}
                type="button"
                onClick={() => setActiveUseCaseTab('work')}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') {
                    setActiveUseCaseTab('role')
                  }
                }}
              >
                {getOnboardingCopy(locale, onboardingCopy.workTab)}
              </button>
            </div>

            {activeUseCaseTab === 'role' ? (
              <section
                aria-labelledby="onboarding-role-tab"
                className="summary-card onboarding-subeditor-panel"
                id="onboarding-role-tabpanel"
                role="tabpanel"
              >
                <RoleSelectionPanel
                  locale={locale}
                  selectedRoleId={state.selected_role_id}
                  onSelectRole={selectRole}
                />
                <SaveFeedbackBanner feedback={saveFeedbacks.role} />
                <div className="button-row">
                  <button
                    className="button"
                    disabled={!dirty.role || savingScope === 'role'}
                    type="button"
                    onClick={() => void saveState('role')}
                  >
                    {savingScope === 'role'
                      ? getOnboardingCopy(locale, onboardingCopy.saving)
                      : getOnboardingCopy(locale, onboardingCopy.saveRole)}
                  </button>
                </div>
              </section>
            ) : (
              <section
                aria-labelledby="onboarding-work-tab"
                className="summary-card"
                id="onboarding-work-tabpanel"
                role="tabpanel"
              >
                <div className="onboarding-module-grid onboarding-module-grid--work">
                  <div className="onboarding-module-grid__sidebar onboarding-subeditor-panel">
                    <div className="onboarding-use-case-panel-header">
                      <div>
                        <h3>{getOnboardingCopy(locale, onboardingCopy.useCasePanelTitle)}</h3>
                        <p>{getOnboardingCopy(locale, onboardingCopy.useCasePanelBody)}</p>
                      </div>
                      <button
                        className="button--ghost"
                        type="button"
                        onClick={() => {
                          setShowNewUseCaseForm((current) => !current)
                          setNewUseCaseError(null)
                          if (showNewUseCaseForm) {
                            setNewUseCaseName('')
                          }
                        }}
                      >
                        {getOnboardingCopy(locale, onboardingCopy.addUseCase)}
                      </button>
                    </div>
                    {showNewUseCaseForm && (
                      <form
                        className="onboarding-use-case-create-panel"
                        onSubmit={(event) => {
                          event.preventDefault()
                          handleAddUseCase()
                        }}
                      >
                        <div className="field">
                          <label htmlFor="new-onboarding-use-case-name">
                            {getOnboardingCopy(locale, onboardingCopy.newUseCaseName)}
                          </label>
                          <input
                            id="new-onboarding-use-case-name"
                            placeholder={getOnboardingCopy(locale, onboardingCopy.newUseCasePlaceholder)}
                            value={newUseCaseName}
                            onChange={(event) => {
                              setNewUseCaseName(event.target.value)
                              if (newUseCaseError) {
                                setNewUseCaseError(null)
                              }
                            }}
                          />
                        </div>
                        {newUseCaseError && <p className="error">{newUseCaseError}</p>}
                        <div className="button-row">
                          <button className="button" type="submit">
                            {getOnboardingCopy(locale, onboardingCopy.addUseCaseSubmit)}
                          </button>
                          <button
                            className="button--ghost"
                            type="button"
                            onClick={() => {
                              setShowNewUseCaseForm(false)
                              setNewUseCaseName('')
                              setNewUseCaseError(null)
                            }}
                          >
                            {getOnboardingCopy(locale, onboardingCopy.cancel)}
                          </button>
                        </div>
                      </form>
                    )}
                    <UseCaseList
                      locale={locale}
                      activeUseCaseId={activeUseCase?.use_case_id ?? null}
                      configuredById={completion.useCaseIds}
                      useCases={state.role_use_case_contents}
                      onSelect={setSelectedUseCaseId}
                    />
                  </div>

                  <div className="onboarding-module-grid__content">
                    {activeUseCase ? (
                      <div className="onboarding-subeditor-panel">
                        <SaveFeedbackBanner
                          feedback={activeUseCaseScope ? saveFeedbacks[activeUseCaseScope] : null}
                        />
                        <UseCaseConfigStep
                          locale={locale}
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
                            {savingScope === activeUseCaseScope
                              ? getOnboardingCopy(locale, onboardingCopy.saving)
                              : getOnboardingCopy(locale, onboardingCopy.saveSettings)}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="hint-callout">
                        {getOnboardingCopy(locale, onboardingCopy.useCaseEmptyHint)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <InstallModule
      locale={locale}
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
    />
  )
}

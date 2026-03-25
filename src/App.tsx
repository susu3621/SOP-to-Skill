import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useSkills } from './hooks/useSkills'
import { useUpdates } from './hooks/useUpdates'
import { pageCopy, getCopy } from './content/copy'
import {
  getAgentLabels,
  getBaseSkillLabels,
  getCredentialFields,
  getRoleLabel,
  workbuddyAgentApps,
  workbuddySteps,
} from './content/workbuddy'
import { getText, isStepComplete, splitAnswerValues, toggleAnswerValue } from './lib/wizard'
import type {
  InstalledSkillInfo,
  InstallWizardState,
  SkillInfo,
  ViewType,
  WizardAnswers,
  WizardField,
} from './types'
import './styles.css'

const locale = 'zh-CN' as const

const allCredentialFieldIds = [
  'jiraUsername',
  'jiraPassword',
  'confluenceUsername',
  'confluencePassword',
  'saleseasyUsername',
  'saleseasyPassword',
  'notionUsername',
  'notionPassword',
  'zentaoUsername',
  'zentaoPassword',
]

const onboardingMilestones = [
  'Agent 应用',
  '选择岗位',
  '基础工具',
  '岗位用例',
  '基础信息来源',
  '用例规则',
  '账号凭证',
  '设置完成',
]

function formatVersionLabel(version?: string) {
  if (!version) return '-'
  return version === 'local' ? '本地包' : `v${version}`
}

function joinLabels(labels: string[]) {
  return labels.length > 0 ? labels.join('、') : '未选择'
}

function pruneCredentialAnswers(
  nextAnswers: WizardAnswers,
  selectedBaseSkills: string[]
): WizardAnswers {
  const allowedIds = new Set(getCredentialFields(selectedBaseSkills).map((field) => field.id))

  return Object.fromEntries(
    Object.entries(nextAnswers).filter(
      ([key]) => !allCredentialFieldIds.includes(key) || allowedIds.has(key)
    )
  )
}

function App() {
  const [view, setView] = useState<ViewType>('welcome')
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null)
  const [wizardState, setWizardState] = useState<InstallWizardState | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})
  const [installing, setInstalling] = useState(false)
  const [installResult, setInstallResult] = useState<{
    success?: boolean
    message?: string
  } | null>(null)

  const {
    skills,
    installed,
    targetApps: availableApps,
    loading,
    error,
    installSkill,
    uninstallSkill,
  } = useSkills()
  const { hasUpdates, checkUpdates } = useUpdates()

  const currentStep = workbuddySteps[currentStepIndex] ?? workbuddySteps[0]
  const selectedAgentApps = useMemo(
    () => splitAnswerValues(answers.agentApps),
    [answers.agentApps]
  )
  const selectedAgentLabels = useMemo(
    () => getAgentLabels(selectedAgentApps),
    [selectedAgentApps]
  )
  const selectedBaseSkills = useMemo(
    () => splitAnswerValues(answers.baseSkills),
    [answers.baseSkills]
  )
  const selectedBaseSkillLabels = useMemo(
    () => getBaseSkillLabels(selectedBaseSkills),
    [selectedBaseSkills]
  )
  const credentialFields = useMemo(
    () => getCredentialFields(selectedBaseSkills),
    [selectedBaseSkills]
  )

  useEffect(() => {
    const unlisten = listen<string>('tray-navigate', (event) => {
      const path = event.payload
      if (path === '/installed') {
        setView('installed')
      } else if (path === '/settings') {
        setView('settings')
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleSelectSkill = useCallback((skill: SkillInfo) => {
    setSelectedSkill(skill)
    setView('skill-detail')
  }, [])

  const handleStartInstall = useCallback((skill: SkillInfo) => {
    setSelectedSkill(skill)
    setWizardState({
      skillId: skill.id,
      selectedAppId: skill.targets[0] || '',
      currentStep: 0,
      variables: {},
    })
    setInstallResult(null)
    setView('install-wizard')
  }, [])

  const handleInstall = useCallback(async () => {
    if (!wizardState) return

    setInstalling(true)
    const result = await installSkill(
      wizardState.skillId,
      wizardState.selectedAppId,
      wizardState.variables
    )
    setInstalling(false)

    if (result.success) {
      setInstallResult({
        success: true,
        message: `成功安装到 ${result.success.app_name}`,
      })
      return
    }

    setInstallResult({
      success: false,
      message: result.error || '安装失败',
    })
  }, [installSkill, wizardState])

  const handleUninstall = useCallback(
    async (skill: InstalledSkillInfo) => {
      const result = await uninstallSkill(skill.skill_id, skill.app_id)
      if (result.error) {
        alert(`卸载失败: ${result.error}`)
      }
    },
    [uninstallSkill]
  )

  const startDemo = useCallback(() => {
    setView('welcome')
    setCurrentStepIndex(0)
    setAnswers({})
  }, [])

  const updateDemoAnswer = useCallback((fieldId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }, [])

  const toggleDemoAnswer = useCallback((fieldId: string, value: string) => {
    setAnswers((current) => {
      const nextAnswers = {
        ...current,
        [fieldId]: toggleAnswerValue(current[fieldId], value),
      }

      if (fieldId !== 'baseSkills') {
        return nextAnswers
      }

      const nextBaseSkills = splitAnswerValues(nextAnswers.baseSkills)
      return pruneCredentialAnswers(nextAnswers, nextBaseSkills)
    })
  }, [])

  const updateInstallVariable = useCallback((fieldId: string, value: string) => {
    setWizardState((current) =>
      current
        ? {
            ...current,
            variables: {
              ...current.variables,
              [fieldId]: value,
            },
          }
        : null
    )
  }, [])

  const goBack = useCallback(() => {
    if (view === 'wizard') {
      if (currentStepIndex > 1) {
        setCurrentStepIndex((index) => index - 1)
      } else {
        setView('welcome')
        setCurrentStepIndex(0)
      }
      return
    }

    if (view === 'result') {
      setView('wizard')
      setCurrentStepIndex(workbuddySteps.length - 1)
      return
    }

    if (view === 'skill-detail') {
      setView('skills-list')
      return
    }

    if (view === 'install-wizard') {
      setView('skill-detail')
      if (installResult) {
        setInstallResult(null)
      }
      setWizardState(null)
      return
    }

    if (view === 'skills-list' || view === 'installed' || view === 'settings') {
      setView('welcome')
    }
  }, [currentStepIndex, installResult, view])

  const goForward = useCallback(() => {
    if (view === 'welcome') {
      setCurrentStepIndex(1) // Skip step 0 (agent-apps) since welcome already handles it
      setView('wizard')
      return
    }

    if (view === 'wizard' && currentStepIndex < workbuddySteps.length - 1) {
      setCurrentStepIndex((index) => index + 1)
      return
    }

    if (view === 'wizard') {
      setView('result')
    }
  }, [currentStepIndex, view])

  const wizardStepComplete =
    currentStep.id === 'credentials'
      ? credentialFields.every(
          (field) => !field.required || (answers[field.id] ?? '').trim().length > 0
        )
      : isStepComplete(currentStep, answers)

  const canMoveForward =
    view === 'welcome'
      ? selectedAgentApps.length > 0
      : view === 'wizard'
        ? wizardStepComplete
        : true

  const progressIndex =
    view === 'welcome' ? 0 : view === 'wizard' ? currentStepIndex + 1 : view === 'result' ? 7 : -1

  const progressLabel =
    view === 'welcome'
      ? '1 / 8'
      : view === 'wizard'
        ? `${currentStepIndex + 2} / 8`
        : view === 'result'
          ? '8 / 8'
          : 'Skills'

  const demoSummary = [
    {
      label: 'Agent 应用',
      value: joinLabels(selectedAgentLabels),
    },
    {
      label: '岗位',
      value: getRoleLabel(answers.role),
    },
    {
      label: '基础工具',
      value: joinLabels(selectedBaseSkillLabels),
    },
    {
      label: '岗位用例',
      value: answers.useCase || '未选择',
    },
    {
      label: '基础信息来源',
      value: answers.infoSources || '未提供',
    },
    {
      label: '用例规则',
      value: answers.reportRules || '未提供',
    },
  ]

  const renderField = (field: WizardField) => {
    if (field.type === 'single-select' && field.options) {
      return (
        <div className="options options--cards">
          {field.options.map((option) => {
            const optionLabel = getText(locale, option.label)

            return (
              <label className="field-option" key={option.value}>
                <input
                  aria-label={optionLabel}
                  checked={answers[field.id] === option.value}
                  name={field.id}
                  type="radio"
                  value={option.value}
                  onChange={(event) => updateDemoAnswer(field.id, event.target.value)}
                />
                <span>
                  <span>{optionLabel}</span>
                  {option.hint && (
                    <span className="field-option__hint">{getText(locale, option.hint)}</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      )
    }

    if (field.type === 'multi-select' && field.options) {
      const selectedValues = splitAnswerValues(answers[field.id])

      return (
        <div className="options options--cards">
          {field.options.map((option) => {
            const optionLabel = getText(locale, option.label)

            return (
              <label className="field-option" key={option.value}>
                <input
                  aria-label={optionLabel}
                  checked={selectedValues.includes(option.value)}
                  name={field.id}
                  type="checkbox"
                  value={option.value}
                  onChange={() => toggleDemoAnswer(field.id, option.value)}
                />
                <span>
                  <span>{optionLabel}</span>
                  {option.hint && (
                    <span className="field-option__hint">{getText(locale, option.hint)}</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          id={field.id}
          rows={6}
          value={answers[field.id] ?? ''}
          placeholder={field.placeholder ? getText(locale, field.placeholder) : ''}
          onChange={(event) => updateDemoAnswer(field.id, event.target.value)}
        />
      )
    }

    const inputType = field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'

    return (
      <input
        id={field.id}
        type={inputType}
        value={answers[field.id] ?? ''}
        placeholder={field.placeholder ? getText(locale, field.placeholder) : ''}
        onChange={(event) => updateDemoAnswer(field.id, event.target.value)}
      />
    )
  }

  // Track navigation direction for animation
  const prevViewRef = useRef<ViewType>(view)
  const prevStepRef = useRef<number>(currentStepIndex)
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    // Determine direction based on view/step changes
    if (view !== prevViewRef.current) {
      if (view === 'wizard' || (view === 'result' && prevViewRef.current === 'wizard')) {
        setAnimationDirection('forward')
      } else {
        setAnimationDirection('backward')
      }
    } else if (view === 'wizard' && currentStepIndex !== prevStepRef.current) {
      setAnimationDirection(currentStepIndex > prevStepRef.current ? 'forward' : 'backward')
    }
    prevViewRef.current = view
    prevStepRef.current = currentStepIndex
  }, [view, currentStepIndex])

  // Summary visibility state
  const [summaryVisible, setSummaryVisible] = useState(false)

  const isOnboardingView = view === 'welcome' || view === 'wizard' || view === 'result'

  return (
    <main className="shell">
      <div className="shell__inner">
        <header className="masthead">
          <div>
            <h1 className="masthead__title">{getCopy(locale, pageCopy.appTitle)}</h1>
            <p className="masthead__subtitle">{getCopy(locale, pageCopy.heroBody)}</p>
          </div>
          <button className="tag tag--button" type="button" onClick={checkUpdates}>
            {getCopy(locale, pageCopy.localeTag)}
            {hasUpdates && <span className="update-badge">更新</span>}
          </button>
        </header>

        {/* Floating summary - left corner, auto-hide */}
        {isOnboardingView && (
          <>
            <button
              className="summary-toggle"
              type="button"
              onClick={() => setSummaryVisible(!summaryVisible)}
              onBlur={() => setSummaryVisible(false)}
            >
              📋 配置摘要
            </button>
            <aside
              className={`floating-summary ${summaryVisible ? 'visible' : ''}`}
              onMouseEnter={() => setSummaryVisible(true)}
              onMouseLeave={() => setSummaryVisible(false)}
            >
              <div className="floating-summary__header">
                <span className="floating-summary__title">当前配置</span>
                <button
                  className="floating-summary__toggle"
                  type="button"
                  onClick={() => setSummaryVisible(false)}
                >
                  ✕
                </button>
              </div>
              <div className="floating-summary__content">
                {demoSummary.map((item) => (
                  <div className="floating-summary__row" key={item.label}>
                    <span className="floating-summary__label">{item.label}</span>
                    <span className="floating-summary__value">{item.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        <section className="layout">
          <div className="layout__main">
            <article
              className="panel"
              key={`${view}-${currentStepIndex}`}
              data-animation={animationDirection}
            >
            {view === 'welcome' && (
              <>
                <span className="panel__eyebrow">Step 1 / 8</span>
                <h2 className="panel__title">先选择你要使用的 Agent 应用</h2>
                <p className="panel__body">
                  先勾选你希望接入这套周报引导的 Agent 应用。后面的岗位、基础工具、岗位用例和凭证信息都会基于这套选择继续配置。
                </p>

                <div className="field-stack">
                  <div className="field">
                    <label>选择 Agent 应用（可多选）</label>
                    <div className="options options--cards">
                      {workbuddyAgentApps.map((agent) => {
                        const agentLabel = getText(locale, agent.label)

                        return (
                          <label className="field-option" key={agent.value}>
                            <input
                              aria-label={agentLabel}
                              checked={selectedAgentApps.includes(agent.value)}
                              name="agentApps"
                              type="checkbox"
                              value={agent.value}
                              onChange={() => toggleDemoAnswer('agentApps', agent.value)}
                            />
                            <span>
                              <span>{agentLabel}</span>
                              {agent.hint && (
                                <span className="field-option__hint">
                                  {getText(locale, agent.hint)}
                                </span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="button-row">
                  <button
                    className="button"
                    type="button"
                    onClick={goForward}
                    disabled={!canMoveForward}
                  >
                    {getCopy(locale, pageCopy.next)}
                  </button>
                  <button
                    className="button--ghost"
                    type="button"
                    onClick={() => setView('installed')}
                  >
                    已安装 ({installed.length})
                  </button>
                </div>
              </>
            )}

            {view === 'wizard' && (
              <>
                <span className="panel__eyebrow">{`Step ${currentStepIndex + 2} / 8`}</span>
                <h2 className="panel__title">{getText(locale, currentStep.title)}</h2>
                <p className="panel__body">{getText(locale, currentStep.description)}</p>

                {currentStep.id === 'credentials' ? (
                  <div className="field-stack">
                    <p className="hint-callout">
                      这版只是界面确认，不会真正校验、发送或安全存储这些凭证。
                    </p>
                    {credentialFields.map((field) => (
                      <div className="field" key={field.id}>
                        <label htmlFor={field.id}>{getText(locale, field.label)}</label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="field-stack">
                    {currentStep.fields.map((field) => (
                      <div className="field" key={field.id}>
                        <label htmlFor={field.id}>{getText(locale, field.label)}</label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={goForward}
                    disabled={!canMoveForward}
                  >
                    {currentStep.id === 'credentials' ? '完成设置' : getCopy(locale, pageCopy.next)}
                  </button>
                </div>
              </>
            )}

            {view === 'result' && (
              <>
                <span className="panel__eyebrow">Step 8 / 8</span>
                <h2 className="panel__title">设置完成</h2>
                <p className="panel__body">
                  现在可以在你选中的 Agent 应用里继续使用所选的岗位用例能力。后续接入真实能力时，会按照你刚才确认的岗位、基础信息来源、用例规则和账号信息继续完善。
                </p>

                <div className="summary-grid">
                  {demoSummary.map((item) => (
                    <section className="summary-card" key={item.label}>
                      <h3>{item.label}</h3>
                      <p>{item.value}</p>
                    </section>
                  ))}
                </div>

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                  <button className="button" type="button" onClick={startDemo}>
                    {getCopy(locale, pageCopy.restart)}
                  </button>
                </div>
              </>
            )}

            {view === 'skills-list' && (
              <>
                <span className="panel__eyebrow">Skills 库</span>
                <h2 className="panel__title">可用 Skills</h2>
                <p className="panel__body">浏览并安装 Skills 到你的目标应用程序。</p>

                {loading && <p>加载中...</p>}
                {error && <p className="error">{error}</p>}

                <div className="skills-grid">
                  {skills.map((skill) => (
                    <section
                      key={skill.id}
                      className="app-card"
                      onClick={() => handleSelectSkill(skill)}
                    >
                      <span className="app-card__status">
                        {skill.is_installed ? '已安装' : '未安装'}
                      </span>
                      <h3>{skill.name['zh-CN'] || skill.id}</h3>
                      <p>{skill.description?.['zh-CN'] || '暂无描述'}</p>
                      <div className="skill-meta">
                        <span>{formatVersionLabel(skill.version)}</span>
                        <span>{skill.targets.join(', ')}</span>
                      </div>
                    </section>
                  ))}
                </div>

                {skills.length === 0 && !loading && (
                  <p className="muted">
                    暂无可用 Skills。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。
                  </p>
                )}

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                </div>
              </>
            )}

            {view === 'skill-detail' && selectedSkill && (
              <>
                <span className="panel__eyebrow">Skill 详情</span>
                <h2 className="panel__title">
                  {selectedSkill.name['zh-CN'] || selectedSkill.id}
                </h2>
                <p className="panel__body">
                  {selectedSkill.description?.['zh-CN'] || '暂无描述'}
                </p>

                <div className="detail-grid">
                  <div>
                    <strong>版本</strong>
                    <p>{formatVersionLabel(selectedSkill.version)}</p>
                  </div>
                  <div>
                    <strong>作者</strong>
                    <p>{selectedSkill.author || '未知'}</p>
                  </div>
                  <div>
                    <strong>支持的目标</strong>
                    <p>{selectedSkill.targets.join(', ')}</p>
                  </div>
                  <div>
                    <strong>状态</strong>
                    <p>
                      {selectedSkill.is_installed
                        ? `已安装 (${formatVersionLabel(selectedSkill.installed_version)})`
                        : '未安装'}
                    </p>
                  </div>
                </div>

                {selectedSkill.variables.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3>配置变量</h3>
                    <ul className="variables-list">
                      {selectedSkill.variables.map((variable) => (
                        <li key={variable.id}>
                          <strong>{variable.label['zh-CN'] || variable.id}</strong>
                          {variable.required && <span className="required">*</span>}
                          <span className="muted">({variable.var_type})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleStartInstall(selectedSkill)}
                  >
                    {selectedSkill.is_installed ? '重新安装' : '安装'}
                  </button>
                </div>
              </>
            )}

            {view === 'install-wizard' && selectedSkill && wizardState && (
              <>
                <span className="panel__eyebrow">
                  安装向导 · {wizardState.currentStep + 1} / 3
                </span>
                <h2 className="panel__title">
                  {getCopy(locale, pageCopy.wizardTitle)} - {selectedSkill.name['zh-CN']}
                </h2>

                {!installResult ? (
                  <>
                    {wizardState.currentStep === 0 && (
                      <>
                        <p className="panel__body">选择目标应用程序：</p>
                        <div className="options">
                          {availableApps
                            .filter((app) => selectedSkill.targets.includes(app.id))
                            .map((app) => (
                              <label className="field-option" key={app.id}>
                                <input
                                  checked={wizardState.selectedAppId === app.id}
                                  name="targetApp"
                                  type="radio"
                                  value={app.id}
                                  onChange={(event) =>
                                    setWizardState((current) =>
                                      current
                                        ? { ...current, selectedAppId: event.target.value }
                                        : null
                                    )
                                  }
                                />
                                <span>
                                  <span>{app.name}</span>
                                  <span className="field-option__hint">{app.description}</span>
                                </span>
                              </label>
                            ))}
                        </div>
                      </>
                    )}

                    {wizardState.currentStep === 1 && (
                      <>
                        <p className="panel__body">填写配置变量：</p>
                        <div className="field-stack">
                          {selectedSkill.variables.map((variable) => (
                            <div className="field" key={variable.id}>
                              <label htmlFor={variable.id}>
                                {variable.label['zh-CN'] || variable.id}
                                {variable.required && <span className="required">*</span>}
                              </label>

                              {variable.var_type === 'select' && variable.options.length > 0 ? (
                                <div className="options">
                                  {variable.options.map((option) => (
                                    <label className="field-option" key={option.value}>
                                      <input
                                        checked={wizardState.variables[variable.id] === option.value}
                                        name={variable.id}
                                        type="radio"
                                        value={option.value}
                                        onChange={(event) =>
                                          updateInstallVariable(variable.id, event.target.value)
                                        }
                                      />
                                      <span>{option.label['zh-CN'] || option.value}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <input
                                  id={variable.id}
                                  type={variable.var_type === 'number' ? 'number' : 'text'}
                                  value={wizardState.variables[variable.id] || variable.default || ''}
                                  placeholder={variable.placeholder?.['zh-CN'] || ''}
                                  onChange={(event) =>
                                    updateInstallVariable(variable.id, event.target.value)
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {wizardState.currentStep === 2 && (
                      <>
                        <p className="panel__body">确认安装配置：</p>
                        <div className="summary-grid">
                          <section className="summary-card">
                            <h3>目标应用</h3>
                            <p>
                              {availableApps.find((app) => app.id === wizardState.selectedAppId)?.name ||
                                wizardState.selectedAppId}
                            </p>
                          </section>
                          <section className="summary-card">
                            <h3>Skill</h3>
                            <p>{selectedSkill.name['zh-CN']}</p>
                          </section>
                          <section className="summary-card">
                            <h3>版本</h3>
                            <p>{formatVersionLabel(selectedSkill.version)}</p>
                          </section>
                        </div>

                        {Object.keys(wizardState.variables).length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <h3>变量</h3>
                            <ul>
                              {Object.entries(wizardState.variables).map(([key, value]) => (
                                <li key={key}>
                                  <strong>{key}:</strong> {value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    <div className="button-row">
                      <button
                        className="button--ghost"
                        type="button"
                        onClick={() =>
                          setWizardState((current) =>
                            current ? { ...current, currentStep: current.currentStep - 1 } : null
                          )
                        }
                        disabled={wizardState.currentStep === 0}
                      >
                        {getCopy(locale, pageCopy.previous)}
                      </button>
                      {wizardState.currentStep < 2 ? (
                        <button
                          className="button"
                          type="button"
                          onClick={() =>
                            setWizardState((current) =>
                              current ? { ...current, currentStep: current.currentStep + 1 } : null
                            )
                          }
                        >
                          {getCopy(locale, pageCopy.next)}
                        </button>
                      ) : (
                        <button
                          className="button"
                          type="button"
                          onClick={handleInstall}
                          disabled={installing}
                        >
                          {installing ? '安装中...' : '确认安装'}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="panel__body">{installResult.message}</p>
                    <div className="button-row">
                      <button className="button" type="button" onClick={goBack}>
                        完成
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {view === 'installed' && (
              <>
                <span className="panel__eyebrow">已安装</span>
                <h2 className="panel__title">已安装的 Skills</h2>
                <p className="panel__body">管理已安装到各目标应用的 Skills。</p>

                {installed.length === 0 ? (
                  <p className="muted">暂无已安装的 Skills。</p>
                ) : (
                  <div className="installed-list">
                    {installed.map((skill) => (
                      <section key={`${skill.skill_id}-${skill.app_id}`} className="summary-card">
                        <div>
                          <h3>{skill.skill_id}</h3>
                          <p className="muted">
                            {skill.app_name} · {formatVersionLabel(skill.installed_version)}
                          </p>
                          <p className="muted" style={{ fontSize: '0.8rem' }}>
                            {skill.output_path}
                          </p>
                        </div>
                        <button
                          className="button--ghost"
                          type="button"
                          onClick={() => handleUninstall(skill)}
                        >
                          卸载
                        </button>
                      </section>
                    ))}
                  </div>
                )}

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                </div>
              </>
            )}

            {view === 'settings' && (
              <>
                <span className="panel__eyebrow">设置</span>
                <h2 className="panel__title">应用设置</h2>
                <p className="panel__body">配置 Skill Configurator。</p>

                <div className="settings-grid">
                  <section className="summary-card">
                    <h3>数据目录</h3>
                    <p className="muted" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      ~/Library/Application Support/SkillConfigurator
                    </p>
                    <button
                      className="button--ghost"
                      type="button"
                      onClick={async () => {
                        await invoke('open_data_directory')
                      }}
                    >
                      在 Finder 中打开
                    </button>
                  </section>
                </div>

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                </div>
              </>
            )}
          </article>
        </div>

        {/* Bottom progress footer */}
        {isOnboardingView && (
          <footer className="layout__footer">
            <div className="progress-footer">
              {onboardingMilestones.map((step, index) => {
                const state =
                  progressIndex === -1
                    ? 'idle'
                    : index < progressIndex
                      ? 'done'
                      : index === progressIndex
                        ? 'active'
                        : 'upcoming'

                return (
                  <div
                    className={`progress-dot progress-dot--${state}`}
                    key={step}
                    title={step}
                  />
                )
              })}
              <span className="progress-label">{progressLabel}</span>
            </div>
          </footer>
        )}
      </section>
    </div>
  </main>
  )
}

export default App

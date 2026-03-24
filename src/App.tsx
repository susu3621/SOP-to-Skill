import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useSkills, useLocale } from './hooks/useSkills'
import { useUpdates } from './hooks/useUpdates'
import { pageCopy, getCopy } from './content/copy'
import { targetApps } from './content/apps'
import { workbuddySteps } from './content/workbuddy'
import { getText, isStepComplete } from './lib/wizard'
import type {
  ViewType,
  SkillInfo,
  InstalledSkillInfo,
  InstallWizardState,
  TargetAppId,
  WizardAnswers,
  VariableInfo,
} from './types'
import './styles.css'

const locale = 'zh-CN' as const

function formatVersionLabel(version?: string) {
  if (!version) return '-'
  return version === 'local' ? '本地包' : `v${version}`
}

function App() {
  // State
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

  // Hooks
  const {
    skills,
    installed,
    targetApps: availableApps,
    loading,
    error,
    installSkill,
    uninstallSkill,
    loadSkills,
  } = useSkills()
  const { hasUpdates, checkUpdates } = useUpdates()

  // Legacy wizard state for WorkBuddy flow
  const currentStep = workbuddySteps[currentStepIndex]

  // Listen for tray navigation events
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

  // Handlers
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
    setAnswers({})
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
    } else {
      setInstallResult({
        success: false,
        message: result.error || '安装失败',
      })
    }
  }, [wizardState, installSkill])

  const handleUninstall = useCallback(
    async (skill: InstalledSkillInfo) => {
      const result = await uninstallSkill(skill.skill_id, skill.app_id)
      if (result.error) {
        alert(`卸载失败: ${result.error}`)
      }
    },
    [uninstallSkill]
  )

  // Legacy handlers for WorkBuddy flow
  const startFlow = () => {
    setView('selection')
    setSelectedSkill(null)
    setCurrentStepIndex(0)
    setAnswers({})
  }

  const goBack = () => {
    if (view === 'wizard' && currentStepIndex > 0) {
      setCurrentStepIndex((index) => index - 1)
      return
    }

    if (view === 'wizard') {
      setView('selection')
      return
    }

    if (view === 'summary') {
      setView('wizard')
      setCurrentStepIndex(workbuddySteps.length - 1)
      return
    }

    if (view === 'result') {
      setView('summary')
    }

    if (view === 'skill-detail') {
      setView('skills-list')
    }

    if (view === 'install-wizard') {
      if (installResult) {
        setView('skill-detail')
        setWizardState(null)
        setInstallResult(null)
      } else {
        setView('skill-detail')
        setWizardState(null)
      }
    }

    if (view === 'skills-list') {
      setView('welcome')
    }

    if (view === 'installed' || view === 'settings') {
      setView('welcome')
    }
  }

  const goForward = () => {
    if (view === 'selection') {
      setCurrentStepIndex(0)
      setView('wizard')
      return
    }

    if (view === 'wizard' && currentStepIndex < workbuddySteps.length - 1) {
      setCurrentStepIndex((index) => index + 1)
      return
    }

    if (view === 'wizard') {
      setView('summary')
    }
  }

  const updateAnswer = (fieldId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value,
    }))

    // Also update wizard state if in install wizard
    if (wizardState) {
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
    }
  }

  // Computed values
  const summary = [
    {
      label: '目标程序',
      value: selectedSkill?.name['zh-CN'] || '-',
    },
    {
      label: '使用场景',
      value: answers.primaryScenario || '-',
    },
    {
      label: '工作目录',
      value: answers.workspacePath || '-',
    },
  ]

  const canMoveForward =
    view === 'selection'
      ? true
      : view === 'wizard'
        ? isStepComplete(currentStep, answers)
        : true

  const activeStepLabel =
    view === 'wizard' ? `${currentStepIndex + 1} / ${workbuddySteps.length}` : 'Ready'

  return (
    <main className="shell">
      <div className="shell__inner">
        <header className="masthead">
          <div>
            <p className="panel__eyebrow">{getCopy(locale, pageCopy.appSubtitle)}</p>
            <h1 className="masthead__title">{getCopy(locale, pageCopy.appTitle)}</h1>
            <p className="masthead__subtitle">{getCopy(locale, pageCopy.heroBody)}</p>
          </div>
          <div className="tag">
            {getCopy(locale, pageCopy.localeTag)}
            {hasUpdates && <span className="update-badge">更新</span>}
          </div>
        </header>

        <section className="layout">
          <article className="panel">
            {/* Welcome View */}
            {view === 'welcome' && (
              <>
                <span className="panel__eyebrow">Desktop scaffold</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.heroTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.heroBody)}</p>

                <div className="button-row" style={{ gap: '1rem' }}>
                  <button className="button" type="button" onClick={() => setView('skills-list')}>
                    浏览 Skills
                  </button>
                  <button className="button--ghost" type="button" onClick={() => setView('installed')}>
                    已安装 ({installed.length})
                  </button>
                  <button className="button--ghost" type="button" onClick={checkUpdates}>
                    检查更新
                  </button>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <h3>快速开始</h3>
                  <p className="muted">
                    选择一个目标应用程序，然后配置并安装 Skills。
                  </p>
                </div>
              </>
            )}

            {/* Skills List View */}
            {view === 'skills-list' && (
              <>
                <span className="panel__eyebrow">Skills 库</span>
                <h2 className="panel__title">可用 Skills</h2>
                <p className="panel__body">
                  浏览并安装 Skills 到您的目标应用程序。
                </p>

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
                  <button className="button--ghost" type="button" onClick={() => setView('welcome')}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                </div>
              </>
            )}

            {/* Skill Detail View */}
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
                      {selectedSkill.variables.map((v) => (
                        <li key={v.id}>
                          <strong>{v.label['zh-CN'] || v.id}</strong>
                          {v.required && <span className="required">*</span>}
                          <span className="muted">({v.var_type})</span>
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

            {/* Install Wizard View */}
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
                    {/* Step 1: Select Target App */}
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
                                  onChange={(e) =>
                                    setWizardState((current) =>
                                      current
                                        ? { ...current, selectedAppId: e.target.value }
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

                    {/* Step 2: Fill Variables */}
                    {wizardState.currentStep === 1 && (
                      <>
                        <p className="panel__body">填写配置变量：</p>
                        <div className="field-stack">
                          {selectedSkill.variables.map((v) => (
                            <div className="field" key={v.id}>
                              <label htmlFor={v.id}>
                                {v.label['zh-CN'] || v.id}
                                {v.required && <span className="required">*</span>}
                              </label>

                              {v.var_type === 'select' && v.options.length > 0 ? (
                                <div className="options">
                                  {v.options.map((opt) => (
                                    <label className="field-option" key={opt.value}>
                                      <input
                                        checked={
                                          wizardState.variables[v.id] === opt.value
                                        }
                                        name={v.id}
                                        type="radio"
                                        value={opt.value}
                                        onChange={(e) => updateAnswer(v.id, e.target.value)}
                                      />
                                      <span>{opt.label['zh-CN'] || opt.value}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <input
                                  id={v.id}
                                  type={v.var_type === 'number' ? 'number' : 'text'}
                                  value={wizardState.variables[v.id] || v.default || ''}
                                  placeholder={v.placeholder?.['zh-CN'] || ''}
                                  onChange={(e) => updateAnswer(v.id, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Step 3: Confirm */}
                    {wizardState.currentStep === 2 && (
                      <>
                        <p className="panel__body">确认安装配置：</p>
                        <div className="summary-grid">
                          <section className="summary-card">
                            <h3>目标应用</h3>
                            <p>
                              {availableApps.find((a) => a.id === wizardState.selectedAppId)
                                ?.name || wizardState.selectedAppId}
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
                              {Object.entries(wizardState.variables).map(([k, v]) => (
                                <li key={k}>
                                  <strong>{k}:</strong> {v}
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

            {/* Installed Skills View */}
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

            {/* Settings View */}
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

            {/* Legacy Selection View (for backward compatibility) */}
            {view === 'selection' && (
              <>
                <span className="panel__eyebrow">Step 1</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.selectionTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.selectionBody)}</p>

                <div className="grid grid--apps">
                  {targetApps.map((app) => {
                    const selected = false
                    const disabled = app.status !== 'available'

                    return (
                      <section
                        key={app.id}
                        className="app-card"
                        data-selected={selected}
                        aria-label={app.name}
                      >
                        <span className="app-card__status">
                          {disabled
                            ? getCopy(locale, pageCopy.comingSoon)
                            : getText(locale, app.highlight)}
                        </span>
                        <h3>{app.name}</h3>
                        <p>{getText(locale, app.description)}</p>
                        <div className="button-row">
                          <button
                            className={disabled ? 'button--ghost' : 'button'}
                            type="button"
                            disabled={disabled}
                          >
                            {disabled
                              ? getCopy(locale, pageCopy.comingSoon)
                              : `选择 ${app.name}`}
                          </button>
                        </div>
                      </section>
                    )
                  })}
                </div>

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={() => setView('welcome')}>
                    {getCopy(locale, pageCopy.previous)}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={goForward}
                    disabled={!canMoveForward}
                  >
                    {getCopy(locale, pageCopy.next)}
                  </button>
                </div>
              </>
            )}

            {/* Legacy Wizard View */}
            {view === 'wizard' && (
              <>
                <span className="panel__eyebrow">{`WorkBuddy · ${activeStepLabel}`}</span>
                <h2 className="panel__title">{getText(locale, currentStep.title)}</h2>
                <p className="panel__body">{getText(locale, currentStep.description)}</p>

                <div className="field-stack">
                  {currentStep.fields.map((field) => (
                    <div className="field" key={field.id}>
                      <label htmlFor={field.id}>{getText(locale, field.label)}</label>

                      {field.type === 'single-select' && field.options ? (
                        <div className="options">
                          {field.options.map((option) => (
                            <label className="field-option" key={option.value}>
                              <input
                                checked={answers[field.id] === option.value}
                                name={field.id}
                                type="radio"
                                value={option.value}
                                onChange={(event) => updateAnswer(field.id, event.target.value)}
                              />
                              <span>
                                <span>{getText(locale, option.label)}</span>
                                {option.hint && (
                                  <span className="field-option__hint">
                                    {getText(locale, option.hint)}
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          id={field.id}
                          type="text"
                          value={answers[field.id] ?? ''}
                          placeholder={
                            field.placeholder ? getText(locale, field.placeholder) : ''
                          }
                          onChange={(event) => updateAnswer(field.id, event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

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
                    {getCopy(locale, pageCopy.next)}
                  </button>
                </div>
              </>
            )}

            {/* Legacy Summary View */}
            {view === 'summary' && (
              <>
                <span className="panel__eyebrow">Summary</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.summaryTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.summaryBody)}</p>

                <div className="summary-grid">
                  {summary.map((item) => (
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
                  <button className="button" type="button" onClick={() => setView('result')}>
                    {getCopy(locale, pageCopy.generate)}
                  </button>
                </div>
              </>
            )}

            {/* Legacy Result View */}
            {view === 'result' && (
              <>
                <span className="panel__eyebrow">Simulated result</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.resultTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.resultBody)}</p>

                <div className="summary-grid">
                  {summary.map((item) => (
                    <section className="summary-card" key={item.label}>
                      <h3>{item.label}</h3>
                      <p>{item.value}</p>
                    </section>
                  ))}
                </div>

                <h3>{getCopy(locale, pageCopy.resultLocations)}</h3>
                <div className="location-grid">
                  <section className="location-card">
                    <h3>macOS</h3>
                    <p>~/Library/Application Support/WorkBuddy/skills/workbuddy-config.json</p>
                  </section>
                  <section className="location-card">
                    <h3>Windows</h3>
                    <p>%APPDATA%\WorkBuddy\skills\workbuddy-config.json</p>
                  </section>
                </div>

                <div className="button-row">
                  <button className="button--ghost" type="button" onClick={goBack}>
                    {getCopy(locale, pageCopy.backToSummary)}
                  </button>
                  <button className="button" type="button" onClick={startFlow}>
                    {getCopy(locale, pageCopy.restart)}
                  </button>
                </div>
              </>
            )}
          </article>

          <aside className="sidecard">
            <h2>{getCopy(locale, pageCopy.wizardTitle)}</h2>
            <p className="muted">
              Skill Configurator - 管理和安装 Skills 到不同的目标应用程序。
            </p>
            <ul>
              <li>支持 Claude Code、Codex、WorkBuddy</li>
              <li>模板系统支持变量替换</li>
              <li>系统托盘常驻运行</li>
              <li>自动检测版本更新</li>
            </ul>
            <div className="summary-card">
              <h3>当前状态</h3>
              <p>
                {installed.length > 0
                  ? `${installed.length} 个 Skills 已安装`
                  : '暂无已安装的 Skills'}
              </p>
              {hasUpdates && (
                <p className="update-hint">有更新可用</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App

import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { OnboardingShell } from './features/onboarding/OnboardingShell'
import { pageCopy, getCopy } from './content/copy'
import { useSkills } from './hooks/useSkills'
import { useUpdates } from './hooks/useUpdates'
import type {
  InstalledSkillInfo,
  InstallWizardState,
  SkillInfo,
  ViewType,
} from './types'
import './styles.css'

const locale = 'zh-CN' as const

function formatVersionLabel(version?: string) {
  if (!version) return '-'
  return version === 'local' ? '本地包' : `v${version}`
}

function App() {
  const [view, setView] = useState<ViewType>('onboarding')
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null)
  const [wizardState, setWizardState] = useState<InstallWizardState | null>(null)
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

  useEffect(() => {
    const unlisten = listen<string>('tray-navigate', (event) => {
      const path = event.payload
      if (path === '/installed') {
        setView('installed')
      } else if (path === '/settings') {
        setView('settings')
      } else if (path === '/skills') {
        setView('skills-list')
      } else {
        setView('onboarding')
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

  const goBack = useCallback(() => {
    if (view === 'skill-detail') {
      setView('skills-list')
      return
    }

    if (view === 'install-wizard') {
      if (installResult) {
        setInstallResult(null)
      }
      setWizardState(null)
      setView('skill-detail')
      return
    }

    if (view === 'skills-list' || view === 'installed' || view === 'settings') {
      setView('onboarding')
    }
  }, [installResult, view])

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

  return (
    <main className="shell">
      <div className="shell__inner">
        <header className="masthead">
          <div>
            <h1 className="masthead__title">{getCopy(locale, pageCopy.appTitle)}</h1>
            <p className="masthead__subtitle">{getCopy(locale, pageCopy.heroBody)}</p>
          </div>
          <div className="masthead__actions">
            <button className="tag tag--button" type="button" onClick={checkUpdates}>
              {getCopy(locale, pageCopy.localeTag)}
              {hasUpdates && <span className="update-badge">更新</span>}
            </button>
            <div className="header-nav">
              <button className="button--ghost" type="button" onClick={() => setView('onboarding')}>
                Onboarding
              </button>
              <button className="button--ghost" type="button" onClick={() => setView('skills-list')}>
                Skills
              </button>
              <button className="button--ghost" type="button" onClick={() => setView('installed')}>
                已安装
              </button>
              <button className="button--ghost" type="button" onClick={() => setView('settings')}>
                设置
              </button>
            </div>
          </div>
        </header>

        <section className="layout">
          <div className="layout__main">
            <article className="panel">
              <div className="page-content">
                <div className="page-content__scroll">
                  {view === 'onboarding' && (
                    <OnboardingShell
                      installedSkills={installed}
                      onOpenInstalled={() => setView('installed')}
                    />
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
                          暂无可用 Skills。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的
                          `skills/` 目录。
                        </p>
                      )}
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
                                    </label>

                                    {variable.var_type === 'select' && variable.options.length > 0 ? (
                                      <div className="options">
                                        {variable.options.map((option) => (
                                          <label className="field-option" key={option.value}>
                                            <input
                                              checked={
                                                wizardState.variables[variable.id] === option.value
                                              }
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
                                        value={
                                          wizardState.variables[variable.id] || variable.default || ''
                                        }
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
                                    {availableApps.find((app) => app.id === wizardState.selectedAppId)
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
                            </>
                          )}

                          <div className="button-row">
                            <button
                              className="button--ghost"
                              type="button"
                              onClick={() =>
                                setWizardState((current) =>
                                  current
                                    ? { ...current, currentStep: Math.max(current.currentStep - 1, 0) }
                                    : null
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
                                    current
                                      ? {
                                          ...current,
                                          currentStep: Math.min(current.currentStep + 1, 2),
                                        }
                                      : null
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
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App

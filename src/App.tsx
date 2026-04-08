import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { OnboardingShell } from './features/onboarding/OnboardingShell'
import { pageCopy, getCopy } from './content/copy'
import { useLocale, useSkills } from './hooks/useSkills'
import { useUpdates } from './hooks/useUpdates'
import type {
  InstalledSkillInfo,
  InstallWizardState,
  Locale,
  SkillInfo,
  ViewType,
} from './types'
import './styles.css'

function formatVersionLabel(locale: Locale, version?: string) {
  if (!version) return '-'
  return version === 'local' ? getCopy(locale, pageCopy.localPackage) : `v${version}`
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
  const { locale, setLocale } = useLocale()
  const {
    appUpdate,
    hasUpdates,
    checkUpdates,
    installUpdate,
    installing: installingUpdate,
    error: updateError,
  } = useUpdates()

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
        message: `${getCopy(locale, pageCopy.installSuccessPrefix)} ${result.success.app_name}`,
      })
      return
    }

    setInstallResult({
      success: false,
      message: result.error || getCopy(locale, pageCopy.installFailed),
    })
  }, [installSkill, locale, wizardState])

  const handleUninstall = useCallback(
    async (skill: InstalledSkillInfo) => {
      const result = await uninstallSkill(skill.skill_id, skill.app_id)
      if (result.error) {
        alert(`${getCopy(locale, pageCopy.uninstallFailedPrefix)}: ${result.error}`)
      }
    },
    [locale, uninstallSkill]
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
            <div className="masthead__utility">
              <div className="masthead__update">
                {hasUpdates && appUpdate ? (
                  <>
                    <button
                      className="tag tag--button"
                      type="button"
                      onClick={() => {
                        void installUpdate()
                      }}
                      disabled={installingUpdate}
                    >
                      {installingUpdate
                        ? getCopy(locale, pageCopy.installingUpdate)
                        : getCopy(locale, pageCopy.installUpdate)}
                      <span className="update-badge">{getCopy(locale, pageCopy.updateAvailable)}</span>
                    </button>
                    <p className="update-hint">
                      {getCopy(locale, pageCopy.updateHintPrefix)} v{appUpdate.version}
                    </p>
                  </>
                ) : (
                  <button className="tag tag--button" type="button" onClick={checkUpdates}>
                    {getCopy(locale, pageCopy.localeTag)}
                  </button>
                )}
              </div>
              <div className="locale-switcher" role="group" aria-label="Locale switcher">
                <button
                  className="button--ghost"
                  type="button"
                  aria-pressed={locale === 'zh-CN'}
                  onClick={() => {
                    void setLocale('zh-CN')
                  }}
                >
                  {getCopy(locale, pageCopy.localeZh)}
                </button>
                <button
                  className="button--ghost"
                  type="button"
                  aria-pressed={locale === 'en-US'}
                  onClick={() => {
                    void setLocale('en-US')
                  }}
                >
                  {getCopy(locale, pageCopy.localeEn)}
                </button>
              </div>
            </div>
            <div className="header-nav">
              <button className="button--ghost" type="button" onClick={() => setView('onboarding')}>
                {getCopy(locale, pageCopy.navOnboarding)}
              </button>
              <button className="button--ghost" type="button" onClick={() => setView('skills-list')}>
                {getCopy(locale, pageCopy.navSkills)}
              </button>
              <button className="button--ghost" type="button" onClick={() => setView('installed')}>
                {getCopy(locale, pageCopy.navInstalled)}
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
                      locale={locale}
                      installedSkills={installed}
                      onOpenInstalled={() => setView('installed')}
                    />
                  )}

                  {view === 'skills-list' && (
                    <>
                      <span className="panel__eyebrow">{getCopy(locale, pageCopy.skillsLibraryEyebrow)}</span>
                      <h2 className="panel__title">{getCopy(locale, pageCopy.skillsLibraryTitle)}</h2>
                      <p className="panel__body">{getCopy(locale, pageCopy.skillsLibraryBody)}</p>

                      {loading && <p>{getCopy(locale, pageCopy.loading)}</p>}
                      {error && <p className="error">{error}</p>}

                      <div className="skills-grid">
                        {skills.map((skill) => (
                          <section
                            key={skill.id}
                            className="app-card"
                            onClick={() => handleSelectSkill(skill)}
                          >
                            <span className="app-card__status">
                              {skill.is_installed
                                ? getCopy(locale, pageCopy.installedStatus)
                                : getCopy(locale, pageCopy.notInstalledStatus)}
                            </span>
                            <h3>{skill.name[locale] || skill.name['zh-CN'] || skill.id}</h3>
                            <p>{skill.description?.[locale] || skill.description?.['zh-CN'] || getCopy(locale, pageCopy.noDescription)}</p>
                            <div className="skill-meta">
                              <span>{formatVersionLabel(locale, skill.version)}</span>
                              <span>{skill.targets.join(', ')}</span>
                            </div>
                          </section>
                        ))}
                      </div>

                      {skills.length === 0 && !loading && (
                        <p className="muted">{getCopy(locale, pageCopy.skillsLibraryEmpty)}</p>
                      )}
                    </>
                  )}

                  {view === 'skill-detail' && selectedSkill && (
                    <>
                      <span className="panel__eyebrow">{getCopy(locale, pageCopy.skillDetailEyebrow)}</span>
                      <h2 className="panel__title">
                        {selectedSkill.name[locale] || selectedSkill.name['zh-CN'] || selectedSkill.id}
                      </h2>
                      <p className="panel__body">
                        {selectedSkill.description?.[locale] ||
                          selectedSkill.description?.['zh-CN'] ||
                          getCopy(locale, pageCopy.noDescription)}
                      </p>

                      <div className="detail-grid">
                        <div>
                          <strong>{getCopy(locale, pageCopy.versionLabel)}</strong>
                          <p>{formatVersionLabel(locale, selectedSkill.version)}</p>
                        </div>
                        <div>
                          <strong>{getCopy(locale, pageCopy.authorLabel)}</strong>
                          <p>{selectedSkill.author || getCopy(locale, pageCopy.unknownAuthor)}</p>
                        </div>
                        <div>
                          <strong>{getCopy(locale, pageCopy.targetsLabel)}</strong>
                          <p>{selectedSkill.targets.join(', ')}</p>
                        </div>
                        <div>
                          <strong>{getCopy(locale, pageCopy.statusLabel)}</strong>
                          <p>
                            {selectedSkill.is_installed
                              ? `${getCopy(locale, pageCopy.installedStatus)} (${formatVersionLabel(
                                  locale,
                                  selectedSkill.installed_version
                                )})`
                              : getCopy(locale, pageCopy.notInstalledStatus)}
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
                          {selectedSkill.is_installed
                            ? getCopy(locale, pageCopy.reinstall)
                            : getCopy(locale, pageCopy.install)}
                        </button>
                      </div>
                    </>
                  )}

                  {view === 'install-wizard' && selectedSkill && wizardState && (
                    <>
                      <span className="panel__eyebrow">
                        {getCopy(locale, pageCopy.installWizardEyebrow)} · {wizardState.currentStep + 1} / 3
                      </span>
                      <h2 className="panel__title">
                        {getCopy(locale, pageCopy.wizardTitle)} - {selectedSkill.name[locale] || selectedSkill.name['zh-CN']}
                      </h2>

                      {!installResult ? (
                        <>
                          {wizardState.currentStep === 0 && (
                            <>
                              <p className="panel__body">{getCopy(locale, pageCopy.chooseTargetApp)}</p>
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
                              <p className="panel__body">{getCopy(locale, pageCopy.fillVariables)}</p>
                              <div className="field-stack">
                                {selectedSkill.variables.map((variable) => (
                                  <div className="field" key={variable.id}>
                                    <label htmlFor={variable.id}>
                                      {variable.label[locale] || variable.label['zh-CN'] || variable.id}
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
                                            <span>{option.label[locale] || option.label['zh-CN'] || option.value}</span>
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
                                        placeholder={variable.placeholder?.[locale] || variable.placeholder?.['zh-CN'] || ''}
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
                              <p className="panel__body">{getCopy(locale, pageCopy.confirmInstallConfig)}</p>
                              <div className="summary-grid">
                                <section className="summary-card">
                                  <h3>{getCopy(locale, pageCopy.targetAppLabel)}</h3>
                                  <p>
                                    {availableApps.find((app) => app.id === wizardState.selectedAppId)
                                      ?.name || wizardState.selectedAppId}
                                  </p>
                                </section>
                                <section className="summary-card">
                                  <h3>Skill</h3>
                                  <p>{selectedSkill.name[locale] || selectedSkill.name['zh-CN']}</p>
                                </section>
                                <section className="summary-card">
                                  <h3>{getCopy(locale, pageCopy.versionLabel)}</h3>
                                  <p>{formatVersionLabel(locale, selectedSkill.version)}</p>
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
                                {installing
                                  ? getCopy(locale, pageCopy.installing)
                                  : getCopy(locale, pageCopy.confirmInstall)}
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="panel__body">{installResult.message}</p>
                          <div className="button-row">
                            <button className="button" type="button" onClick={goBack}>
                              {getCopy(locale, pageCopy.finish)}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {view === 'installed' && (
                    <>
                      <span className="panel__eyebrow">{getCopy(locale, pageCopy.installedLibraryEyebrow)}</span>
                      <h2 className="panel__title">{getCopy(locale, pageCopy.installedLibraryTitle)}</h2>
                      <p className="panel__body">{getCopy(locale, pageCopy.installedLibraryBody)}</p>

                      {installed.length === 0 ? (
                        <p className="muted">{getCopy(locale, pageCopy.installedLibraryEmpty)}</p>
                      ) : (
                        <div className="installed-list">
                          {installed.map((skill) => (
                            <section key={`${skill.skill_id}-${skill.app_id}`} className="summary-card">
                              <div>
                                <h3>{skill.skill_id}</h3>
                                <p className="muted">
                                  {skill.app_name} · {formatVersionLabel(locale, skill.installed_version)}
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
                                {getCopy(locale, pageCopy.uninstall)}
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
                      <span className="panel__eyebrow">{getCopy(locale, pageCopy.settingsEyebrow)}</span>
                      <h2 className="panel__title">{getCopy(locale, pageCopy.settingsTitle)}</h2>
                      <p className="panel__body">{getCopy(locale, pageCopy.settingsBody)}</p>

                      <div className="settings-grid">
                        <section className="summary-card">
                          <h3>{getCopy(locale, pageCopy.appUpdatesTitle)}</h3>
                          {hasUpdates && appUpdate ? (
                            <>
                              <p className="muted">
                                {getCopy(locale, pageCopy.currentVersionPrefix)} v{appUpdate.currentVersion}
                              </p>
                              <p>{getCopy(locale, pageCopy.newVersionPrefix)} v{appUpdate.version}</p>
                              {appUpdate.body && <p className="muted">{appUpdate.body}</p>}
                              <button
                                className="button"
                                type="button"
                                onClick={() => {
                                  void installUpdate()
                                }}
                                disabled={installingUpdate}
                              >
                                {installingUpdate
                                  ? getCopy(locale, pageCopy.installingUpdate)
                                  : getCopy(locale, pageCopy.installUpdate)}
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="muted">{getCopy(locale, pageCopy.noNewVersion)}</p>
                              <button className="button--ghost" type="button" onClick={checkUpdates}>
                                {updateError
                                  ? getCopy(locale, pageCopy.recheckUpdates)
                                  : getCopy(locale, pageCopy.localeTag)}
                              </button>
                            </>
                          )}
                          {updateError && <p className="error">{updateError}</p>}
                        </section>
                        <section className="summary-card">
                          <h3>{getCopy(locale, pageCopy.dataDirectoryTitle)}</h3>
                          <p className="muted" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            ~/Library/Application Support/sop-to-skill
                          </p>
                          <button
                            className="button--ghost"
                            type="button"
                            onClick={async () => {
                              await invoke('open_data_directory')
                            }}
                          >
                            {getCopy(locale, pageCopy.openInFinder)}
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

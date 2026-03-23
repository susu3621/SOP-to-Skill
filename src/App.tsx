import { useMemo, useState } from 'react'
import { pageCopy, defaultLocale, getCopy } from './content/copy'
import { targetApps } from './content/apps'
import { workbuddySteps } from './content/workbuddy'
import { getText, isStepComplete } from './lib/wizard'
import type { TargetAppId, WizardAnswers } from './types'
import './styles.css'

type View = 'welcome' | 'selection' | 'wizard' | 'summary' | 'result'

const locale = defaultLocale

function App() {
  const [view, setView] = useState<View>('welcome')
  const [selectedAppId, setSelectedAppId] = useState<TargetAppId | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answers, setAnswers] = useState<WizardAnswers>({})

  const currentStep = workbuddySteps[currentStepIndex]
  const selectedApp = targetApps.find((app) => app.id === selectedAppId) ?? null

  const summary = useMemo(
    () => [
      {
        label: '目标程序',
        value: selectedApp?.name ?? '-'
      },
      {
        label: '使用场景',
        value: answers.primaryScenario ?? '-'
      },
      {
        label: '工作目录',
        value: answers.workspacePath ?? '-'
      }
    ],
    [answers.primaryScenario, answers.workspacePath, selectedApp?.name]
  )

  const canMoveForward =
    view === 'selection'
      ? selectedAppId === 'workbuddy'
      : view === 'wizard'
        ? isStepComplete(currentStep, answers)
        : true

  const activeStepLabel =
    view === 'wizard' ? `${currentStepIndex + 1} / ${workbuddySteps.length}` : 'Ready'

  const updateAnswer = (fieldId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [fieldId]: value
    }))
  }

  const startFlow = () => {
    setView('selection')
    setSelectedAppId(null)
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

  return (
    <main className="shell">
      <div className="shell__inner">
        <header className="masthead">
          <div>
            <p className="panel__eyebrow">{getCopy(locale, pageCopy.appSubtitle)}</p>
            <h1 className="masthead__title">{getCopy(locale, pageCopy.appTitle)}</h1>
            <p className="masthead__subtitle">{getCopy(locale, pageCopy.heroBody)}</p>
          </div>
          <div className="tag">{getCopy(locale, pageCopy.localeTag)}</div>
        </header>

        <section className="layout">
          <article className="panel">
            {view === 'welcome' && (
              <>
                <span className="panel__eyebrow">Desktop scaffold</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.heroTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.heroBody)}</p>
                <div className="button-row">
                  <button className="button" type="button" onClick={startFlow}>
                    {getCopy(locale, pageCopy.startButton)}
                  </button>
                </div>
              </>
            )}

            {view === 'selection' && (
              <>
                <span className="panel__eyebrow">Step 1</span>
                <h2 className="panel__title">{getCopy(locale, pageCopy.selectionTitle)}</h2>
                <p className="panel__body">{getCopy(locale, pageCopy.selectionBody)}</p>

                <div className="grid grid--apps">
                  {targetApps.map((app) => {
                    const selected = selectedAppId === app.id
                    const disabled = app.status !== 'available'

                    return (
                      <section
                        key={app.id}
                        className="app-card"
                        data-selected={selected}
                        aria-label={app.name}
                      >
                        <span className="app-card__status">
                          {disabled ? getCopy(locale, pageCopy.comingSoon) : getText(locale, app.highlight)}
                        </span>
                        <h3>{app.name}</h3>
                        <p>{getText(locale, app.description)}</p>
                        <div className="button-row">
                          <button
                            className={disabled ? 'button--ghost' : 'button'}
                            type="button"
                            onClick={() => !disabled && setSelectedAppId(app.id)}
                            disabled={disabled}
                            aria-label={disabled ? `${app.name} ${getCopy(locale, pageCopy.comingSoon)}` : `选择 ${app.name}`}
                          >
                            {disabled ? getCopy(locale, pageCopy.comingSoon) : `选择 ${app.name}`}
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
                {!canMoveForward && (
                  <p className="muted">{getCopy(locale, pageCopy.selectionNextHint)}</p>
                )}
              </>
            )}

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
                                  <span className="field-option__hint">{getText(locale, option.hint)}</span>
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
                          placeholder={field.placeholder ? getText(locale, field.placeholder) : ''}
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
                    <p>%APPDATA%\\WorkBuddy\\skills\\workbuddy-config.json</p>
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
              首版只实现可见界面、步骤骨架和模拟结果，保留后续接入真实配置写入的接口边界。
            </p>
            <ul>
              <li>单窗口桌面壳，围绕 WorkBuddy 流程构建。</li>
              <li>未来工具入口先保留为可见占位，不接真实流程。</li>
              <li>问答步骤由独立配置定义，便于未来扩展更多程序。</li>
              <li>默认中文，同时把文案集中在可扩展的双语结构里。</li>
            </ul>
            <div className="summary-card">
              <h3>当前状态</h3>
              <p>{selectedApp ? `${selectedApp.name} 已选中` : '等待选择目标程序'}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App

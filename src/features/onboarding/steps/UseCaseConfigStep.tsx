import { useEffect, useState } from 'react'
import type { Locale, OnboardingEditableUseCaseRecord } from '../../../types'
import { getOnboardingUseCaseOptionById } from '../../../content/workbuddy'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface UseCaseConfigStepProps {
  locale: Locale
  useCases: OnboardingEditableUseCaseRecord[]
  loadPreviewMarkdown: (useCase: OnboardingEditableUseCaseRecord) => Promise<string>
  onUpdateDescription: (useCaseId: string, value: string) => void
  onUpdateQuestionLabel: (useCaseId: string, questionId: string, value: string) => void
  onUpdateQuestionAnswer: (useCaseId: string, questionId: string, value: string) => void
  onAddQuestion: (useCaseId: string) => void
  onRemoveQuestion: (useCaseId: string, questionId: string) => void
}

function getBuiltInDescriptionPreview(description: string) {
  const trimmedDescription = description.trim()

  if (!trimmedDescription) {
    return ''
  }

  const firstSentence = trimmedDescription.match(/^[\s\S]*?(?:[。！？!?]|(?:\.(?=\s|$)))/u)?.[0]
  if (firstSentence) {
    return firstSentence.trim()
  }

  return trimmedDescription.split('\n')[0]?.trim() ?? ''
}

function getPreviewValue(value: string, locale: Locale) {
  return value.trim().length > 0
    ? value
    : getOnboardingCopy(locale, onboardingCopy.previewEmptyValue)
}

interface UseCasePreviewDialogProps {
  locale: Locale
  displayName: string
  error: string | null
  loading: boolean
  markdown: string
  onClose: () => void
}

function UseCasePreviewDialog({
  locale,
  displayName,
  error,
  loading,
  markdown,
  onClose,
}: UseCasePreviewDialogProps) {
  const dialogTitle = `${displayName} ${getOnboardingCopy(locale, onboardingCopy.previewDialogTitle)}`

  return (
    <>
      <div
        aria-hidden="true"
        className="onboarding-use-case-preview-overlay"
        onClick={onClose}
      />
      <section
        aria-label={dialogTitle}
        aria-modal="true"
        className="onboarding-use-case-preview-dialog"
        role="dialog"
      >
        <div className="onboarding-use-case-preview-dialog__header">
          <h4>{dialogTitle}</h4>
          <button className="button--ghost" type="button" onClick={onClose}>
            {getOnboardingCopy(locale, onboardingCopy.closePreview)}
          </button>
        </div>

        <div className="onboarding-use-case-preview-dialog__content">
          <section className="onboarding-use-case-preview-section">
            <p className="onboarding-use-case-section__title">
              {getOnboardingCopy(locale, onboardingCopy.previewMarkdownTitle)}
            </p>
            {loading ? (
              <p className="onboarding-use-case-preview-section__body">
                {getOnboardingCopy(locale, onboardingCopy.previewLoading)}
              </p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : (
              <pre className="onboarding-use-case-preview-markdown">
                {getPreviewValue(markdown, locale)}
              </pre>
            )}
          </section>
        </div>
      </section>
    </>
  )
}

export function UseCaseConfigStep({
  locale,
  loadPreviewMarkdown,
  useCases,
  onUpdateDescription,
  onUpdateQuestionLabel,
  onUpdateQuestionAnswer,
  onAddQuestion,
  onRemoveQuestion,
}: UseCaseConfigStepProps) {
  const [previewUseCaseId, setPreviewUseCaseId] = useState<string | null>(null)
  const [previewMarkdown, setPreviewMarkdown] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewUseCase = useCases.find((useCase) => useCase.use_case_id === previewUseCaseId) ?? null
  const previewDisplayName = previewUseCase
    ? getOnboardingUseCaseOptionById(previewUseCase.use_case_id, locale)?.name ??
      previewUseCase.use_case_name
    : ''

  useEffect(() => {
    if (!previewUseCase) {
      setPreviewMarkdown('')
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }

    let active = true
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewMarkdown('')

    void loadPreviewMarkdown(previewUseCase)
      .then((markdown) => {
        if (!active) {
          return
        }

        setPreviewMarkdown(markdown)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setPreviewError(
          `${getOnboardingCopy(locale, onboardingCopy.previewLoadFailed)} ${String(error)}`
        )
      })
      .finally(() => {
        if (!active) {
          return
        }

        setPreviewLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadPreviewMarkdown, locale, previewUseCase])

  return (
    <>
      <div className="onboarding-use-cases">
        {useCases.map((useCase) => {
          const useCaseOption = getOnboardingUseCaseOptionById(useCase.use_case_id, locale)
          const displayName = useCaseOption?.name ?? useCase.use_case_name
          const isBuiltIn = useCase.description_locked ?? useCaseOption != null
          const questions = useCase.questions ?? []

          return (
            <section className="onboarding-use-case-card" key={useCase.use_case_id}>
              <div className="onboarding-use-case-card__header">
                <h3>{displayName}</h3>
                <button
                  className="button--ghost onboarding-use-case-card__preview"
                  type="button"
                  onClick={() => setPreviewUseCaseId(useCase.use_case_id)}
                >
                  {getOnboardingCopy(locale, onboardingCopy.previewCurrentContent)}
                </button>
              </div>

              <div className="field-stack">
                {isBuiltIn ? (
                  <section className="onboarding-use-case-section onboarding-use-case-section--system">
                    <p className="onboarding-use-case-section__title">
                      {getOnboardingCopy(locale, onboardingCopy.systemUseCaseDescription)}
                    </p>
                    <p className="onboarding-use-case-system-description">
                      {getBuiltInDescriptionPreview(useCase.description)}
                    </p>
                  </section>
                ) : (
                  <div className="field">
                    <label htmlFor={`${useCase.use_case_id}-description`}>
                      {getOnboardingCopy(locale, onboardingCopy.useCaseSummary)}
                    </label>
                    <p className="field__hint">
                      {getOnboardingCopy(locale, onboardingCopy.customUseCaseDescriptionHint)}
                    </p>
                    <textarea
                      className="field__textarea--description"
                      id={`${useCase.use_case_id}-description`}
                      rows={6}
                      value={useCase.description}
                      onChange={(event) =>
                        onUpdateDescription(useCase.use_case_id, event.target.value)
                      }
                    />
                  </div>
                )}

                <section className="onboarding-use-case-section">
                  <div className="onboarding-use-case-section__header">
                    <p className="onboarding-use-case-section__title">
                      {getOnboardingCopy(locale, onboardingCopy.useCaseQuestionsTitle)}
                    </p>
                    {!isBuiltIn && (
                      <button
                        className="button--ghost"
                        type="button"
                        onClick={() => onAddQuestion(useCase.use_case_id)}
                      >
                        {getOnboardingCopy(locale, onboardingCopy.addQuestion)}
                      </button>
                    )}
                  </div>

                  <div className="onboarding-question-list">
                    {questions.map((question, index) => {
                      const answerInputId = `${useCase.use_case_id}-${question.id}-answer`
                      const questionInputId = `${useCase.use_case_id}-${question.id}-label`

                      if (question.locked) {
                        return (
                          <div className="field onboarding-question-card" key={question.id}>
                            <label htmlFor={answerInputId}>{question.label}</label>
                            <input
                              id={answerInputId}
                              placeholder={question.placeholder}
                              value={question.answer}
                              onChange={(event) =>
                                onUpdateQuestionAnswer(
                                  useCase.use_case_id,
                                  question.id,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        )
                      }

                      return (
                        <div
                          className="onboarding-question-card onboarding-question-card--editable"
                          key={question.id}
                        >
                          <div className="field">
                            <label htmlFor={questionInputId}>
                              {`${getOnboardingCopy(locale, onboardingCopy.questionLabelPrefix)} ${index + 1}`}
                            </label>
                            <input
                              id={questionInputId}
                              value={question.label}
                              onChange={(event) =>
                                onUpdateQuestionLabel(
                                  useCase.use_case_id,
                                  question.id,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={answerInputId}>
                              {`${getOnboardingCopy(locale, onboardingCopy.answerLabelPrefix)} ${index + 1}`}
                            </label>
                            <input
                              id={answerInputId}
                              placeholder={question.placeholder}
                              value={question.answer}
                              onChange={(event) =>
                                onUpdateQuestionAnswer(
                                  useCase.use_case_id,
                                  question.id,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div className="button-row onboarding-question-card__actions">
                            <button
                              className="button--ghost"
                              type="button"
                              aria-label={`${getOnboardingCopy(locale, onboardingCopy.removeQuestion)} ${index + 1}`}
                              onClick={() => onRemoveQuestion(useCase.use_case_id, question.id)}
                            >
                              {getOnboardingCopy(locale, onboardingCopy.removeQuestion)}
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {!isBuiltIn && questions.length === 0 && (
                      <p className="hint-callout">
                        {getOnboardingCopy(locale, onboardingCopy.emptyQuestionHint)}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </section>
          )
        })}
      </div>

      {previewUseCase ? (
        <UseCasePreviewDialog
          error={previewError}
          locale={locale}
          displayName={previewDisplayName}
          loading={previewLoading}
          markdown={previewMarkdown}
          onClose={() => setPreviewUseCaseId(null)}
        />
      ) : null}
    </>
  )
}

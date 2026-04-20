import { useState } from 'react'
import type { Locale, OnboardingEditableUseCaseRecord } from '../../../types'
import { getOnboardingUseCaseOptionById } from '../../../content/workbuddy'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface UseCaseConfigStepProps {
  locale: Locale
  useCases: OnboardingEditableUseCaseRecord[]
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

function getBuiltInTemplateValue(description: string, locale: Locale) {
  const startMarkers =
    locale === 'zh-CN'
      ? [
          '如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\n',
          '如果用户填写了公司 SOP / 模板链接，则优先采用用户提供的内容；未填写时，默认按以下模板整理：\n',
        ]
      : [
          'If the user provides a template link, follow the user template first. Otherwise, use this built-in template:\n',
          'If the user provides a template link, follow the user template first. Otherwise, use this built-in structure:\n',
          'If the user provides a company SOP or template link, follow the user-provided content first. Otherwise, use this built-in template:\n',
        ]
  const endMarkers =
    locale === 'zh-CN'
      ? ['\n\n输入（每次执行都需要提供给Skill的信息）：']
      : ['\n\nInput (information required every run):']

  for (const startMarker of startMarkers) {
    const startIndex = description.indexOf(startMarker)

    if (startIndex === -1) {
      continue
    }

    const templateStart = startIndex + startMarker.length
    const endIndex = endMarkers
      .map((marker) => description.indexOf(marker, templateStart))
      .find((index) => index !== -1)

    return description.slice(templateStart, endIndex === undefined ? undefined : endIndex).trim()
  }

  return ''
}

function isBuiltInTemplateQuestion(questionId: string) {
  return /(template-source|sop(?:-source)?)$/u.test(questionId)
}

function getPreviewQuestionAnswer(
  questionId: string,
  value: string,
  locale: Locale,
  builtInTemplateValue: string
) {
  if (value.trim().length > 0) {
    return value
  }

  if (builtInTemplateValue && isBuiltInTemplateQuestion(questionId)) {
    return getOnboardingCopy(locale, onboardingCopy.previewUsesBuiltInTemplate)
  }

  return getOnboardingCopy(locale, onboardingCopy.previewEmptyValue)
}

interface UseCasePreviewDialogProps {
  locale: Locale
  useCase: OnboardingEditableUseCaseRecord
  displayName: string
  onClose: () => void
}

function UseCasePreviewDialog({
  locale,
  useCase,
  displayName,
  onClose,
}: UseCasePreviewDialogProps) {
  const dialogTitle = `${displayName} ${getOnboardingCopy(locale, onboardingCopy.previewDialogTitle)}`
  const questions = useCase.questions ?? []
  const builtInTemplateValue = getBuiltInTemplateValue(useCase.description, locale)

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
              {getOnboardingCopy(locale, onboardingCopy.useCaseSummary)}
            </p>
            <p className="onboarding-use-case-preview-section__body">
              {getPreviewValue(useCase.description, locale)}
            </p>
          </section>

          {builtInTemplateValue ? (
            <section className="onboarding-use-case-preview-section">
              <p className="onboarding-use-case-section__title">
                {getOnboardingCopy(locale, onboardingCopy.previewBuiltInTemplateTitle)}
              </p>
              <p className="onboarding-use-case-preview-section__body">{builtInTemplateValue}</p>
            </section>
          ) : null}

          <section className="onboarding-use-case-preview-section">
            <p className="onboarding-use-case-section__title">
              {getOnboardingCopy(locale, onboardingCopy.useCaseQuestionsTitle)}
            </p>

            {questions.length > 0 ? (
              <div className="onboarding-use-case-preview-question-list">
                {questions.map((question) => (
                  <article className="onboarding-use-case-preview-question-card" key={question.id}>
                    <p className="onboarding-use-case-preview-question-card__label">
                      {question.locked ? question.label : question.label.trim() || question.id}
                    </p>
                    <p className="onboarding-use-case-preview-question-card__answer">
                      {getPreviewQuestionAnswer(
                        question.id,
                        question.answer,
                        locale,
                        builtInTemplateValue
                      )}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="onboarding-use-case-preview-section__body">
                {getOnboardingCopy(locale, onboardingCopy.none)}
              </p>
            )}
          </section>
        </div>
      </section>
    </>
  )
}

export function UseCaseConfigStep({
  locale,
  useCases,
  onUpdateDescription,
  onUpdateQuestionLabel,
  onUpdateQuestionAnswer,
  onAddQuestion,
  onRemoveQuestion,
}: UseCaseConfigStepProps) {
  const [previewUseCaseId, setPreviewUseCaseId] = useState<string | null>(null)
  const previewUseCase = useCases.find((useCase) => useCase.use_case_id === previewUseCaseId) ?? null
  const previewDisplayName = previewUseCase
    ? getOnboardingUseCaseOptionById(previewUseCase.use_case_id, locale)?.name ??
      previewUseCase.use_case_name
    : ''

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
          locale={locale}
          useCase={previewUseCase}
          displayName={previewDisplayName}
          onClose={() => setPreviewUseCaseId(null)}
        />
      ) : null}
    </>
  )
}

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

export function UseCaseConfigStep({
  locale,
  useCases,
  onUpdateDescription,
  onUpdateQuestionLabel,
  onUpdateQuestionAnswer,
  onAddQuestion,
  onRemoveQuestion,
}: UseCaseConfigStepProps) {
  return (
    <div className="onboarding-use-cases">
      {useCases.map((useCase) => {
        const useCaseOption = getOnboardingUseCaseOptionById(useCase.use_case_id, locale)
        const displayName = useCaseOption?.name ?? useCase.use_case_name
        const isBuiltIn = useCase.description_locked ?? useCaseOption != null
        const questions = useCase.questions ?? []

        return (
          <section className="onboarding-use-case-card" key={useCase.use_case_id}>
            <h3>{displayName}</h3>
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
                      <div className="onboarding-question-card onboarding-question-card--editable" key={question.id}>
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
  )
}

import type { Locale, OnboardingEditableUseCaseRecord } from '../../../types'
import {
  getOnboardingUseCaseNameById,
  getOnboardingUseCaseOptionById,
} from '../../../content/workbuddy'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface UseCaseConfigStepProps {
  locale: Locale
  useCases: OnboardingEditableUseCaseRecord[]
  onUpdate: (
    useCaseId: string,
    field: keyof Pick<OnboardingEditableUseCaseRecord, 'description' | 'rules'>,
    value: string
  ) => void
}

export function UseCaseConfigStep({ locale, useCases, onUpdate }: UseCaseConfigStepProps) {
  return (
    <div className="onboarding-use-cases">
      {useCases.map((useCase) => {
        const useCaseOption = getOnboardingUseCaseOptionById(useCase.use_case_id, locale)

        return (
          <section className="onboarding-use-case-card" key={useCase.use_case_id}>
            <h3>{getOnboardingUseCaseNameById(useCase.use_case_id, locale) || useCase.use_case_name}</h3>
            <div className="field-stack">
              <div className="field">
                <label htmlFor={`${useCase.use_case_id}-description`}>
                  {getOnboardingCopy(locale, onboardingCopy.useCaseDescription)}
                </label>
                <p className="field__hint">
                  {getOnboardingCopy(locale, onboardingCopy.useCaseDescriptionHint)}
                </p>
                <textarea
                  className="field__textarea--description"
                  id={`${useCase.use_case_id}-description`}
                  rows={10}
                  value={useCase.description}
                  onChange={(event) =>
                    onUpdate(useCase.use_case_id, 'description', event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`${useCase.use_case_id}-rules`}>
                  {getOnboardingCopy(locale, onboardingCopy.sopLabel)}
                </label>
                <p className="field__hint">{getOnboardingCopy(locale, onboardingCopy.sopHint)}</p>
                <textarea
                  id={`${useCase.use_case_id}-rules`}
                  rows={4}
                  placeholder={useCaseOption?.rules_prompt ?? ''}
                  value={useCase.rules}
                  onChange={(event) => onUpdate(useCase.use_case_id, 'rules', event.target.value)}
                />
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

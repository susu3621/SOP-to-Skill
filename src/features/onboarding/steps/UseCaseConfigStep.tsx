import type { OnboardingEditableUseCaseRecord } from '../../../types'

interface UseCaseConfigStepProps {
  useCases: OnboardingEditableUseCaseRecord[]
  onUpdate: (
    useCaseId: string,
    field: keyof Pick<OnboardingEditableUseCaseRecord, 'description' | 'info_sources' | 'rules'>,
    value: string
  ) => void
}

export function UseCaseConfigStep({ useCases, onUpdate }: UseCaseConfigStepProps) {
  return (
    <div className="onboarding-use-cases">
      {useCases.map((useCase) => (
        <section className="onboarding-use-case-card" key={useCase.use_case_id}>
          <h3>{useCase.use_case_name}</h3>
          <div className="field-stack">
            <div className="field">
              <label htmlFor={`${useCase.use_case_id}-description`}>用例描述</label>
              <textarea
                id={`${useCase.use_case_id}-description`}
                rows={3}
                value={useCase.description}
                onChange={(event) =>
                  onUpdate(useCase.use_case_id, 'description', event.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`${useCase.use_case_id}-sources`}>基础信息来源</label>
              <textarea
                id={`${useCase.use_case_id}-sources`}
                rows={4}
                value={useCase.info_sources}
                onChange={(event) =>
                  onUpdate(useCase.use_case_id, 'info_sources', event.target.value)
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`${useCase.use_case_id}-rules`}>用例规则</label>
              <textarea
                id={`${useCase.use_case_id}-rules`}
                rows={4}
                value={useCase.rules}
                onChange={(event) => onUpdate(useCase.use_case_id, 'rules', event.target.value)}
              />
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

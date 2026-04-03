import type { OnboardingEditableUseCaseRecord } from '../../../types'
import { getOnboardingUseCaseOptionById } from '../../../content/workbuddy'

interface UseCaseConfigStepProps {
  useCases: OnboardingEditableUseCaseRecord[]
  onUpdate: (
    useCaseId: string,
    field: keyof Pick<OnboardingEditableUseCaseRecord, 'description' | 'rules'>,
    value: string
  ) => void
}

export function UseCaseConfigStep({ useCases, onUpdate }: UseCaseConfigStepProps) {
  return (
    <div className="onboarding-use-cases">
      {useCases.map((useCase) => {
        const useCaseOption = getOnboardingUseCaseOptionById(useCase.use_case_id)

        return (
          <section className="onboarding-use-case-card" key={useCase.use_case_id}>
            <h3>{useCase.use_case_name}</h3>
            <div className="field-stack">
              <div className="field">
                <label htmlFor={`${useCase.use_case_id}-description`}>用例描述</label>
                <p className="field__hint">已预置一版描述，可按实际业务改写；重点写清输入是什么，最终要输出什么。</p>
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
                <label htmlFor={`${useCase.use_case_id}-rules`}>当前流程 / SOP / 模板</label>
                <p className="field__hint">如果公司内部已经有固定流程、模板、语气或输出格式，在这里补充。</p>
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

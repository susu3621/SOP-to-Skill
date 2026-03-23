import type { Locale, LocalizedText, WizardAnswers, WizardStep } from '../types'

export function getText(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}

export function isStepComplete(step: WizardStep, answers: WizardAnswers): boolean {
  return step.fields.every((field) => {
    if (!field.required) {
      return true
    }

    return (answers[field.id] ?? '').trim().length > 0
  })
}

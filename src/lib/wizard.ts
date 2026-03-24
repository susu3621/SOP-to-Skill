import type { Locale, LocalizedText, WizardAnswers, WizardStep } from '../types'

export function getText(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}

export function splitAnswerValues(value?: string): string[] {
  return (value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function toggleAnswerValue(currentValue: string | undefined, nextValue: string): string {
  const values = new Set(splitAnswerValues(currentValue))

  if (values.has(nextValue)) {
    values.delete(nextValue)
  } else {
    values.add(nextValue)
  }

  return Array.from(values).join('|')
}

export function isStepComplete(step: WizardStep, answers: WizardAnswers): boolean {
  return step.fields.every((field) => {
    if (!field.required) {
      return true
    }

    if (field.type === 'multi-select') {
      return splitAnswerValues(answers[field.id]).length > 0
    }

    return (answers[field.id] ?? '').trim().length > 0
  })
}

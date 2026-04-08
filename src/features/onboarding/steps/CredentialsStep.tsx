import type { Locale, WizardField } from '../../../types'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface CredentialsStepProps {
  locale: Locale
  credentialFields: WizardField[]
  credentialValues: Record<string, string>
  onUpdateCredential: (fieldId: string, value: string) => void
}

export function CredentialsStep({
  locale,
  credentialFields,
  credentialValues,
  onUpdateCredential,
}: CredentialsStepProps) {
  return (
    <div className="field-stack">
      {credentialFields.length === 0 && (
        <p className="muted">{getOnboardingCopy(locale, onboardingCopy.noCredentials)}</p>
      )}
      {credentialFields.map((field) => (
        <div className="field" key={field.id}>
          <label htmlFor={field.id}>{field.label[locale] ?? field.label['zh-CN']}</label>
          <input
            id={field.id}
            type={field.type === 'password' ? 'password' : 'text'}
            value={credentialValues[field.id] ?? ''}
            placeholder={field.placeholder?.[locale] ?? field.placeholder?.['zh-CN'] ?? ''}
            onChange={(event) => onUpdateCredential(field.id, event.target.value)}
          />
        </div>
      ))}
    </div>
  )
}

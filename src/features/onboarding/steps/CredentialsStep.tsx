import type { WizardField } from '../../../types'

interface CredentialsStepProps {
  credentialFields: WizardField[]
  credentialValues: Record<string, string>
  onUpdateCredential: (fieldId: string, value: string) => void
}

export function CredentialsStep({
  credentialFields,
  credentialValues,
  onUpdateCredential,
}: CredentialsStepProps) {
  return (
    <div className="field-stack">
      {credentialFields.length === 0 && <p className="muted">当前没有需要补充的凭证字段。</p>}
      {credentialFields.map((field) => (
        <div className="field" key={field.id}>
          <label htmlFor={field.id}>{field.label['zh-CN']}</label>
          <input
            id={field.id}
            type={field.type === 'password' ? 'password' : 'text'}
            value={credentialValues[field.id] ?? ''}
            placeholder={field.placeholder?.['zh-CN'] ?? ''}
            onChange={(event) => onUpdateCredential(field.id, event.target.value)}
          />
        </div>
      ))}
    </div>
  )
}

import type {
  Locale,
  OnboardingConnectionTestState,
  OnboardingCredentialGroup,
} from '../../../types'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface CredentialsStepProps {
  locale: Locale
  credentialGroups: OnboardingCredentialGroup[]
  connectionTests: Record<string, OnboardingConnectionTestState>
  credentialValues: Record<string, string>
  onUpdateCredential: (fieldId: string, value: string) => void
  onRunConnectionTest: (serviceId: string) => void
}

function getConnectionTestStatusText(
  locale: Locale,
  connectionTest: OnboardingConnectionTestState | undefined
) {
  switch (connectionTest?.status) {
    case 'pending':
      return getOnboardingCopy(locale, onboardingCopy.connectionTestPending)
    case 'success':
      return getOnboardingCopy(locale, onboardingCopy.connectionTestSuccess)
    case 'error':
      return getOnboardingCopy(locale, onboardingCopy.connectionTestError)
    default:
      return getOnboardingCopy(locale, onboardingCopy.connectionTestIdle)
  }
}

function getConnectionTestTriggerText(
  locale: Locale,
  connectionTest: OnboardingConnectionTestState | undefined
) {
  if (connectionTest?.last_trigger === 'automatic') {
    return getOnboardingCopy(locale, onboardingCopy.connectionTestAutoTrigger)
  }

  if (connectionTest?.last_trigger === 'manual') {
    return getOnboardingCopy(locale, onboardingCopy.connectionTestManualTrigger)
  }

  return null
}

export function CredentialsStep({
  locale,
  credentialGroups,
  connectionTests,
  credentialValues,
  onUpdateCredential,
  onRunConnectionTest,
}: CredentialsStepProps) {
  return (
    <div className="field-stack">
      {credentialGroups.length === 0 && (
        <p className="muted">{getOnboardingCopy(locale, onboardingCopy.noCredentials)}</p>
      )}
      {credentialGroups.map((group) => {
        const connectionTest = connectionTests[group.service_id]
        const isComplete = group.required_field_ids.every(
          (fieldId) => (credentialValues[fieldId] ?? '').trim().length > 0
        )
        const statusText = getConnectionTestStatusText(locale, connectionTest)
        const triggerText = getConnectionTestTriggerText(locale, connectionTest)

        return (
          <section className="summary-card onboarding-subeditor-panel" key={group.service_id}>
            <div className="field-stack">
              <div>
                <h4>{group.service_name}</h4>
                <p>{group.service_description}</p>
                <p className="muted">
                  {getOnboardingCopy(locale, onboardingCopy.connectionTestAutoHint)}
                </p>
              </div>

              {group.fields.map((field) => (
                <div className="field" key={field.id}>
                  <label htmlFor={field.id}>{field.label[locale] ?? field.label['zh-CN']}</label>
                  {field.type === 'single-select' ? (
                    <select
                      id={field.id}
                      value={credentialValues[field.id] ?? field.options?.[0]?.value ?? ''}
                      onChange={(event) => onUpdateCredential(field.id, event.target.value)}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label[locale] ?? option.label['zh-CN']}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.id}
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={credentialValues[field.id] ?? ''}
                      placeholder={field.placeholder?.[locale] ?? field.placeholder?.['zh-CN'] ?? ''}
                      onChange={(event) => onUpdateCredential(field.id, event.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="button-row">
                <p
                  className={
                    connectionTest?.status === 'error'
                      ? 'error'
                      : connectionTest?.status === 'success'
                        ? 'success'
                        : 'muted'
                  }
                >
                  {statusText}
                </p>
                <button
                  className="button--ghost"
                  disabled={!isComplete || connectionTest?.status === 'pending'}
                  type="button"
                  onClick={() => onRunConnectionTest(group.service_id)}
                >
                  {getOnboardingCopy(locale, onboardingCopy.testConnection)}
                </button>
              </div>

              {connectionTest?.summary && connectionTest.summary !== statusText && (
                <p
                  className={
                    connectionTest.status === 'error'
                      ? 'error'
                      : connectionTest.status === 'success'
                        ? 'success'
                        : 'muted'
                  }
                >
                  {connectionTest.summary}
                </p>
              )}

              {connectionTest?.status === 'error' && connectionTest.details && (
                <p className="error">{connectionTest.details}</p>
              )}

              {triggerText && <p className="muted">{triggerText}</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

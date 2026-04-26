import type {
  Locale,
  OnboardingConnectionTestState,
  OnboardingCredentialGroup,
  OnboardingEnvironmentCheckState,
  OnboardingEnvironmentInstallState,
  OnboardingLinuxDeviceRecord,
  OnboardingSvnRepositoryRecord,
} from '../../../types'
import { DirectoryPickerInput } from '../../../components/DirectoryPickerInput'
import { getOnboardingCopy, onboardingCopy } from '../copy'

interface CredentialsStepProps {
  locale: Locale
  credentialGroups: OnboardingCredentialGroup[]
  connectionTests: Record<string, OnboardingConnectionTestState>
  linuxDeviceConnectionTests: Record<string, OnboardingConnectionTestState>
  environmentChecks: Record<string, OnboardingEnvironmentCheckState>
  environmentInstalls: Record<string, OnboardingEnvironmentInstallState>
  credentialValues: Record<string, string>
  linuxDevices: OnboardingLinuxDeviceRecord[]
  svnRepositories: OnboardingSvnRepositoryRecord[]
  svnRepositoryConnectionTests: Record<string, OnboardingConnectionTestState>
  onUpdateCredential: (fieldId: string, value: string) => void
  onAddLinuxDevice: () => void
  onRemoveLinuxDevice: (deviceId: string) => void
  onUpdateLinuxDeviceField: (
    deviceId: string,
    field: keyof Omit<OnboardingLinuxDeviceRecord, 'id'>,
    value: string
  ) => void
  onRunLinuxDeviceConnectionTest: (deviceId: string) => void
  onAddSvnRepository: () => void
  onRemoveSvnRepository: (repositoryId: string) => void
  onUpdateSvnRepositoryField: (
    repositoryId: string,
    field: keyof Omit<OnboardingSvnRepositoryRecord, 'id'>,
    value: string
  ) => void
  onRunSvnRepositoryConnectionTest: (repositoryId: string) => void
  onRunConnectionTest: (serviceId: string) => void
  onInstallEnvironment: (serviceId: string) => void
}

function isLinuxDeviceComplete(device: OnboardingLinuxDeviceRecord) {
  return [device.name, device.host, device.username, device.password].every(
    (value) => value.trim().length > 0
  )
}

function isSvnRepositoryComplete(repository: OnboardingSvnRepositoryRecord) {
  return [repository.name, repository.url, repository.username, repository.password].every(
    (value) => value.trim().length > 0
  )
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

function getEnvironmentStatusText(
  locale: Locale,
  environmentCheck: OnboardingEnvironmentCheckState | undefined
) {
  switch (environmentCheck?.status) {
    case 'pending':
      return getOnboardingCopy(locale, onboardingCopy.environmentPending)
    case 'ready':
      return getOnboardingCopy(locale, onboardingCopy.environmentReady)
    case 'missing':
      return environmentCheck.summary ?? getOnboardingCopy(locale, onboardingCopy.environmentMissing)
    case 'unsupported':
      return environmentCheck.summary ?? getOnboardingCopy(locale, onboardingCopy.environmentUnsupported)
    case 'error':
      return environmentCheck.summary ?? getOnboardingCopy(locale, onboardingCopy.environmentError)
    default:
      return getOnboardingCopy(locale, onboardingCopy.environmentIdle)
  }
}

function getStatusClass(status: string | undefined) {
  if (status === 'error' || status === 'missing' || status === 'unsupported') {
    return 'error'
  }

  if (status === 'success' || status === 'ready') {
    return 'success'
  }

  return 'muted'
}

export function CredentialsStep({
  locale,
  credentialGroups,
  connectionTests,
  linuxDeviceConnectionTests,
  environmentChecks,
  environmentInstalls,
  credentialValues,
  linuxDevices,
  svnRepositories,
  svnRepositoryConnectionTests,
  onUpdateCredential,
  onAddLinuxDevice,
  onRemoveLinuxDevice,
  onUpdateLinuxDeviceField,
  onRunLinuxDeviceConnectionTest,
  onAddSvnRepository,
  onRemoveSvnRepository,
  onUpdateSvnRepositoryField,
  onRunSvnRepositoryConnectionTest,
  onRunConnectionTest,
  onInstallEnvironment,
}: CredentialsStepProps) {
  const hasPendingEnvironmentChecks = credentialGroups.some(
    (group) => environmentChecks[group.service_id]?.status === 'pending'
  )

  return (
    <div className="field-stack">
      {credentialGroups.length === 0 && (
        <p className="muted">{getOnboardingCopy(locale, onboardingCopy.noCredentials)}</p>
      )}
      {hasPendingEnvironmentChecks && (
        <p className="muted">
          {getOnboardingCopy(locale, onboardingCopy.environmentPendingHint)}
        </p>
      )}
      {credentialGroups.map((group) => {
        const connectionTest = connectionTests[group.service_id]
        const environmentCheck = environmentChecks[group.service_id]
        const environmentInstall = environmentInstalls[group.service_id]
        const isComplete = group.required_field_ids.every(
          (fieldId) => (credentialValues[fieldId] ?? '').trim().length > 0
        )
        const statusText = getConnectionTestStatusText(locale, connectionTest)
        const triggerText = getConnectionTestTriggerText(locale, connectionTest)
        const environmentStatusText = getEnvironmentStatusText(locale, environmentCheck)
        const environmentStatusClass = getStatusClass(environmentCheck?.status)
        const installStatusClass = getStatusClass(environmentInstall?.status)
        const showInstallButton =
          environmentCheck?.status === 'missing' &&
          environmentCheck.install_supported &&
          environmentCheck.missing_requirement_ids.length > 0
        const installButtonText =
          environmentInstall?.status === 'running'
            ? getOnboardingCopy(locale, onboardingCopy.environmentInstallRunning)
            : getOnboardingCopy(locale, onboardingCopy.environmentInstallButton)

        return (
          <section className="summary-card onboarding-credential-card" key={group.service_id}>
            <div className="onboarding-credential-card__header">
              <div>
                <h4>{group.service_name}</h4>
                <p>{group.service_description}</p>
              </div>
            </div>

            <div className="onboarding-credential-card__content">
              <div className="field-stack onboarding-credential-card__credentials">
                {group.editor_type === 'linux-devices' ? (
                  <>
                    <p className="muted">
                      {getOnboardingCopy(locale, onboardingCopy.linuxDevicesBody)}
                    </p>
                    <div className="button-row">
                      <button className="button--ghost" type="button" onClick={onAddLinuxDevice}>
                        {getOnboardingCopy(locale, onboardingCopy.linuxAddDevice)}
                      </button>
                    </div>
                    {linuxDevices.length === 0 ? (
                      <p className="muted">
                        {getOnboardingCopy(locale, onboardingCopy.linuxDeviceListEmpty)}
                      </p>
                    ) : (
                      <div className="onboarding-linux-device-list">
                        {linuxDevices.map((device) => {
                          const deviceConnectionTest = linuxDeviceConnectionTests[device.id]
                          const deviceStatusText = getConnectionTestStatusText(
                            locale,
                            deviceConnectionTest
                          )
                          const deviceTriggerText = getConnectionTestTriggerText(
                            locale,
                            deviceConnectionTest
                          )
                          const deviceComplete = isLinuxDeviceComplete(device)

                          return (
                            <section className="onboarding-linux-device-card" key={device.id}>
                              <div className="onboarding-linux-device-card__header">
                                <div>
                                  <p className="onboarding-linux-device-card__title">
                                    {device.name.trim() ||
                                      getOnboardingCopy(locale, onboardingCopy.linuxDeviceName)}
                                  </p>
                                  <p className={getStatusClass(deviceConnectionTest?.status)}>
                                    {deviceStatusText}
                                  </p>
                                </div>
                                <div className="onboarding-linux-device-card__actions">
                                  <button
                                    className="button--ghost"
                                    disabled={
                                      !deviceComplete || deviceConnectionTest?.status === 'pending'
                                    }
                                    type="button"
                                    onClick={() => onRunLinuxDeviceConnectionTest(device.id)}
                                  >
                                    {getOnboardingCopy(locale, onboardingCopy.testConnection)}
                                  </button>
                                  <button
                                    className="button--ghost"
                                    type="button"
                                    onClick={() => onRemoveLinuxDevice(device.id)}
                                  >
                                    {getOnboardingCopy(locale, onboardingCopy.linuxRemoveDevice)}
                                  </button>
                                </div>
                              </div>
                              <div className="onboarding-linux-device-grid">
                                <div className="field">
                                  <label htmlFor={`${device.id}-name`}>
                                    {getOnboardingCopy(locale, onboardingCopy.linuxDeviceName)}
                                  </label>
                                  <input
                                    id={`${device.id}-name`}
                                    type="text"
                                    value={device.name}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.linuxDeviceNamePlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateLinuxDeviceField(device.id, 'name', event.target.value)
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${device.id}-host`}>
                                    {getOnboardingCopy(locale, onboardingCopy.linuxDeviceHost)}
                                  </label>
                                  <input
                                    id={`${device.id}-host`}
                                    type="text"
                                    value={device.host}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.linuxDeviceHostPlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateLinuxDeviceField(device.id, 'host', event.target.value)
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${device.id}-username`}>
                                    {getOnboardingCopy(locale, onboardingCopy.linuxDeviceUsername)}
                                  </label>
                                  <input
                                    id={`${device.id}-username`}
                                    type="text"
                                    value={device.username}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.linuxDeviceUsernamePlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateLinuxDeviceField(
                                        device.id,
                                        'username',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${device.id}-password`}>
                                    {getOnboardingCopy(locale, onboardingCopy.linuxDevicePassword)}
                                  </label>
                                  <input
                                    id={`${device.id}-password`}
                                    type="password"
                                    value={device.password}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.linuxDevicePasswordPlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateLinuxDeviceField(
                                        device.id,
                                        'password',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {deviceConnectionTest?.summary &&
                                deviceConnectionTest.summary !== deviceStatusText && (
                                  <p className={getStatusClass(deviceConnectionTest.status)}>
                                    {deviceConnectionTest.summary}
                                  </p>
                                )}

                              {deviceConnectionTest?.status === 'error' &&
                                deviceConnectionTest.details && (
                                  <p className="error">{deviceConnectionTest.details}</p>
                                )}

                              {deviceTriggerText && <p className="muted">{deviceTriggerText}</p>}
                            </section>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : group.editor_type === 'svn-repositories' ? (
                  <>
                    <p className="muted">
                      {getOnboardingCopy(locale, onboardingCopy.svnRepositoriesBody)}
                    </p>
                    <div className="button-row">
                      <button className="button--ghost" type="button" onClick={onAddSvnRepository}>
                        {getOnboardingCopy(locale, onboardingCopy.svnAddRepository)}
                      </button>
                    </div>
                    {svnRepositories.length === 0 ? (
                      <p className="muted">
                        {getOnboardingCopy(locale, onboardingCopy.svnRepositoryListEmpty)}
                      </p>
                    ) : (
                      <div className="onboarding-linux-device-list onboarding-svn-repository-list">
                        {svnRepositories.map((repository) => {
                          const repositoryConnectionTest =
                            svnRepositoryConnectionTests[repository.id]
                          const repositoryStatusText = getConnectionTestStatusText(
                            locale,
                            repositoryConnectionTest
                          )
                          const repositoryTriggerText = getConnectionTestTriggerText(
                            locale,
                            repositoryConnectionTest
                          )
                          const repositoryComplete = isSvnRepositoryComplete(repository)

                          return (
                            <section
                              className="onboarding-linux-device-card onboarding-svn-repository-card"
                              key={repository.id}
                            >
                              <div className="onboarding-linux-device-card__header">
                                <div>
                                  <p className="onboarding-linux-device-card__title">
                                    {repository.name.trim() ||
                                      getOnboardingCopy(locale, onboardingCopy.svnRepositoryName)}
                                  </p>
                                  <p className={getStatusClass(repositoryConnectionTest?.status)}>
                                    {repositoryStatusText}
                                  </p>
                                </div>
                                <div className="onboarding-linux-device-card__actions">
                                  <button
                                    className="button--ghost"
                                    disabled={
                                      !repositoryComplete ||
                                      repositoryConnectionTest?.status === 'pending'
                                    }
                                    type="button"
                                    onClick={() =>
                                      onRunSvnRepositoryConnectionTest(repository.id)
                                    }
                                  >
                                    {getOnboardingCopy(locale, onboardingCopy.testConnection)}
                                  </button>
                                  <button
                                    className="button--ghost"
                                    type="button"
                                    onClick={() => onRemoveSvnRepository(repository.id)}
                                  >
                                    {getOnboardingCopy(locale, onboardingCopy.svnRemoveRepository)}
                                  </button>
                                </div>
                              </div>
                              <div className="onboarding-linux-device-grid">
                                <div className="field">
                                  <label htmlFor={`${repository.id}-name`}>
                                    {getOnboardingCopy(locale, onboardingCopy.svnRepositoryName)}
                                  </label>
                                  <input
                                    id={`${repository.id}-name`}
                                    type="text"
                                    value={repository.name}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.svnRepositoryNamePlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateSvnRepositoryField(
                                        repository.id,
                                        'name',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${repository.id}-url`}>
                                    {getOnboardingCopy(locale, onboardingCopy.svnRepositoryUrl)}
                                  </label>
                                  <input
                                    id={`${repository.id}-url`}
                                    type="text"
                                    value={repository.url}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.svnRepositoryUrlPlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateSvnRepositoryField(
                                        repository.id,
                                        'url',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${repository.id}-username`}>
                                    {getOnboardingCopy(locale, onboardingCopy.svnRepositoryUsername)}
                                  </label>
                                  <input
                                    id={`${repository.id}-username`}
                                    type="text"
                                    value={repository.username}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.svnRepositoryUsernamePlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateSvnRepositoryField(
                                        repository.id,
                                        'username',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="field">
                                  <label htmlFor={`${repository.id}-password`}>
                                    {getOnboardingCopy(locale, onboardingCopy.svnRepositoryPassword)}
                                  </label>
                                  <input
                                    id={`${repository.id}-password`}
                                    type="password"
                                    value={repository.password}
                                    placeholder={getOnboardingCopy(
                                      locale,
                                      onboardingCopy.svnRepositoryPasswordPlaceholder
                                    )}
                                    onChange={(event) =>
                                      onUpdateSvnRepositoryField(
                                        repository.id,
                                        'password',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              {repositoryConnectionTest?.summary &&
                                repositoryConnectionTest.summary !== repositoryStatusText && (
                                  <p className={getStatusClass(repositoryConnectionTest.status)}>
                                    {repositoryConnectionTest.summary}
                                  </p>
                                )}

                              {repositoryConnectionTest?.status === 'error' &&
                                repositoryConnectionTest.details && (
                                  <p className="error">{repositoryConnectionTest.details}</p>
                                )}

                              {repositoryTriggerText && (
                                <p className="muted">{repositoryTriggerText}</p>
                              )}
                            </section>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
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
                        ) : field.type === 'path' ? (
                          <DirectoryPickerInput
                            id={field.id}
                            locale={locale}
                            value={credentialValues[field.id] ?? ''}
                            placeholder={
                              field.placeholder?.[locale] ?? field.placeholder?.['zh-CN'] ?? ''
                            }
                            onChange={(value) => onUpdateCredential(field.id, value)}
                          />
                        ) : (
                          <input
                            id={field.id}
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={credentialValues[field.id] ?? ''}
                            placeholder={
                              field.placeholder?.[locale] ?? field.placeholder?.['zh-CN'] ?? ''
                            }
                            onChange={(event) => onUpdateCredential(field.id, event.target.value)}
                          />
                        )}
                      </div>
                    ))}

                    {group.supports_connection_test && (
                      <>
                        <div className="button-row">
                          <p className={getStatusClass(connectionTest?.status)}>{statusText}</p>
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
                          <p className={getStatusClass(connectionTest.status)}>
                            {connectionTest.summary}
                          </p>
                        )}

                        {connectionTest?.status === 'error' && connectionTest.details && (
                          <p className="error">{connectionTest.details}</p>
                        )}

                        {triggerText && <p className="muted">{triggerText}</p>}
                        <p className="muted">
                          {getOnboardingCopy(locale, onboardingCopy.connectionTestAutoHint)}
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>

              <aside className="onboarding-credential-card__environment">
                <div className="onboarding-credential-card__environment-header">
                  <h5>{getOnboardingCopy(locale, onboardingCopy.environmentTitle)}</h5>
                  <p className={environmentStatusClass}>{environmentStatusText}</p>
                </div>

                {environmentCheck?.details ? (
                  <p className={environmentStatusClass}>{environmentCheck.details}</p>
                ) : (
                  <p className="muted">{getOnboardingCopy(locale, onboardingCopy.environmentAutoHint)}</p>
                )}

                {environmentCheck?.requirements.length ? (
                  <div className="onboarding-environment-list">
                    {environmentCheck.requirements.map((requirement) => (
                      <div className="onboarding-environment-list__item" key={requirement.id}>
                        <div>
                          <p className="onboarding-environment-list__title">{requirement.label}</p>
                          {requirement.details && <p className="muted">{requirement.details}</p>}
                        </div>
                        <p className={getStatusClass(requirement.status)}>
                          {requirement.status === 'ready'
                            ? getOnboardingCopy(locale, onboardingCopy.environmentRequirementReady)
                            : getOnboardingCopy(locale, onboardingCopy.environmentRequirementMissing)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {environmentCheck?.install_support_message && (
                  <p className="muted">{environmentCheck.install_support_message}</p>
                )}

                {showInstallButton && (
                  <button
                    className="button"
                    disabled={environmentInstall?.status === 'running'}
                    type="button"
                    onClick={() => onInstallEnvironment(group.service_id)}
                  >
                    {installButtonText}
                  </button>
                )}

                {environmentInstall && environmentInstall.status !== 'idle' && (
                  <div className="onboarding-environment-progress">
                    <div className="onboarding-environment-progress__meta">
                      <p className={installStatusClass}>
                        {environmentInstall.step ??
                          getOnboardingCopy(locale, onboardingCopy.environmentInstallRunning)}
                      </p>
                      <span>{`${environmentInstall.progress_percent}%`}</span>
                    </div>
                    <div className="onboarding-environment-progress__track" role="progressbar">
                      <span
                        className="onboarding-environment-progress__fill"
                        style={{ width: `${environmentInstall.progress_percent}%` }}
                      />
                    </div>

                    {environmentInstall.summary && (
                      <p className={installStatusClass}>{environmentInstall.summary}</p>
                    )}

                    {environmentInstall.logs.length > 0 && (
                      <div className="onboarding-environment-logs">
                        <p className="onboarding-environment-logs__title">
                          {getOnboardingCopy(locale, onboardingCopy.environmentInstallLogs)}
                        </p>
                        <div className="onboarding-environment-logs__body">
                          {environmentInstall.logs.map((line, index) => (
                            <p key={`${group.service_id}-log-${index}`}>{line}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </section>
        )
      })}
    </div>
  )
}

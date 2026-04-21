import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  buildGeneratedSkillIdsForRoleUseCase,
  createCustomRoleUseCaseContent,
  createDefaultRoleUseCaseContents,
  getCredentialFields,
  getCredentialGroups,
  getRoleNameById,
  onboardingBaseSkills,
  onboardingSupportedAgents,
  onboardingUseCases,
  sharedConfig,
} from '../../content/workbuddy'
import type {
  InstalledSkillInfo,
  Locale,
  OnboardingAgentState,
  OnboardingAgentSyncPreview,
  OnboardingBatchSyncResult,
  OnboardingConnectionTestInput,
  OnboardingConnectionTestResult,
  OnboardingConnectionTestState,
  OnboardingConnectionTestTrigger,
  OnboardingCredentialGroup,
  OnboardingEnvironmentCheckInput,
  OnboardingEnvironmentCheckResult,
  OnboardingEnvironmentCheckState,
  OnboardingEnvironmentInstallInput,
  OnboardingEnvironmentInstallProgressEvent,
  OnboardingEnvironmentInstallResult,
  OnboardingEnvironmentInstallState,
  OnboardingEnvironmentTrigger,
  OnboardingEditableUseCaseRecord,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingLinuxDeviceRecord,
  OnboardingSvnRepositoryRecord,
  OnboardingState,
  OnboardingUseCaseQuestionRecord,
  OnboardingUseCase,
  SkillResult,
  StagedOnboardingPackages,
} from '../../types'
import { getOnboardingCopy, onboardingCopy } from './copy'
import { usesBuiltInTemplateFallback } from './useCaseTemplate'

interface SaveFeedback {
  kind: 'success' | 'error'
  message: string
}

interface OnboardingDirtyState {
  role: boolean
  baseSkills: boolean
  install: boolean
  any: boolean
  useCases: Record<string, boolean>
}

interface OnboardingCompletionState {
  basic: boolean
  role: boolean
  baseSkills: boolean
  useCases: boolean
  install: boolean
  useCaseIds: Record<string, boolean>
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

const implicitDefaultBaseSkillIds = ['document-template'] as const

function buildNextQuestionId(records: OnboardingUseCaseQuestionRecord[]) {
  let suffix = records.length + 1
  let candidate = `question-${suffix}`

  while (records.some((record) => record.id === candidate)) {
    suffix += 1
    candidate = `question-${suffix}`
  }

  return {
    id: candidate,
    index: suffix,
  }
}

function buildNextLinuxDeviceId(records: OnboardingLinuxDeviceRecord[]) {
  let suffix = records.length + 1
  let candidate = `linux-device-${suffix}`

  while (records.some((record) => record.id === candidate)) {
    suffix += 1
    candidate = `linux-device-${suffix}`
  }

  return candidate
}

function createEmptyLinuxDevice(
  records: OnboardingLinuxDeviceRecord[] = []
): OnboardingLinuxDeviceRecord {
  return {
    id: buildNextLinuxDeviceId(records),
    name: '',
    host: '',
    username: '',
    password: '',
  }
}

function buildNextSvnRepositoryId(records: OnboardingSvnRepositoryRecord[]) {
  let suffix = records.length + 1
  let candidate = `svn-repository-${suffix}`

  while (records.some((record) => record.id === candidate)) {
    suffix += 1
    candidate = `svn-repository-${suffix}`
  }

  return candidate
}

function createEmptySvnRepository(
  records: OnboardingSvnRepositoryRecord[] = []
): OnboardingSvnRepositoryRecord {
  return {
    id: buildNextSvnRepositoryId(records),
    name: '',
    url: '',
    username: '',
    password: '',
  }
}

function isBaseSkillId(skillId: string) {
  return onboardingBaseSkills.some((skill) => skill.id === skillId)
}

function withImplicitDefaultBaseSkills(
  state: Pick<OnboardingState, 'selected_base_skill_ids' | 'selected_install_skill_ids_initialized'>
) {
  const selectedBaseSkillIds = unique(
    state.selected_base_skill_ids.filter((skillId) =>
      onboardingBaseSkills.some((skill) => skill.id === skillId)
    )
  )

  if (selectedBaseSkillIds.length > 0 || state.selected_install_skill_ids_initialized) {
    return selectedBaseSkillIds
  }

  return unique([
    ...selectedBaseSkillIds,
    ...implicitDefaultBaseSkillIds.filter((skillId) => isBaseSkillId(skillId)),
  ])
}

function isRoleId(roleId: string) {
  return Object.prototype.hasOwnProperty.call(sharedConfig.roles, roleId)
}

function buildManagedSkillIds(
  roleId: string,
  baseSkillIds: string[],
  roleUseCaseContents: OnboardingEditableUseCaseRecord[]
) {
  const selectedBaseSkillIds = unique(
    baseSkillIds.filter((skillId) => onboardingBaseSkills.some((skill) => skill.id === skillId))
  )
  const generatedSkillIds = roleUseCaseContents
    .filter((record) => record.role_id === roleId)
    .flatMap((record) => {
      const generated = buildGeneratedSkillIdsForRoleUseCase(roleId, record.use_case_id)
      return [generated.production_skill_id, generated.test_skill_id]
    })

  return unique([...selectedBaseSkillIds, ...generatedSkillIds])
}

function buildSelectedUseCases(
  roleUseCaseContents: OnboardingEditableUseCaseRecord[]
): OnboardingUseCase[] {
  const useCasesById = new Map<string, OnboardingUseCase>()

  roleUseCaseContents.forEach((record) => {
    const configuredUseCase = onboardingUseCases.find((useCase) => useCase.id === record.use_case_id)
    const existingUseCase = useCasesById.get(record.use_case_id)

    if (existingUseCase) {
      if (!existingUseCase.applicable_role_ids.includes(record.role_id)) {
        existingUseCase.applicable_role_ids.push(record.role_id)
      }
      return
    }

    useCasesById.set(record.use_case_id, {
      id: record.use_case_id,
      name: record.use_case_name,
      directory: configuredUseCase?.directory ?? record.use_case_id,
      applicable_role_ids: [record.role_id],
    })
  })

  return Array.from(useCasesById.values())
}

function buildInstallCandidateGroups(
  roleId: string,
  roleUseCaseContents: OnboardingEditableUseCaseRecord[]
): OnboardingInstallCandidateGroup[] {
  return roleUseCaseContents
    .filter((record) => record.role_id === roleId)
    .map((record) => ({
      use_case_id: record.use_case_id,
      use_case_name: record.use_case_name,
      ...buildGeneratedSkillIdsForRoleUseCase(roleId, record.use_case_id),
    }))
}

function reconcileInstallSelection(
  state: OnboardingState,
  nextRoleId: string,
  nextBaseSkillIds: string[],
  nextRoleUseCaseContents: OnboardingEditableUseCaseRecord[]
) {
  const currentManagedSkillIds = buildManagedSkillIds(
    state.selected_role_id,
    state.selected_base_skill_ids,
    state.role_use_case_contents
  )
  const currentSelectedSkillIds = resolveSelectedInstallSkillIds(state, currentManagedSkillIds)
  const nextManagedSkillIds = buildManagedSkillIds(
    nextRoleId,
    nextBaseSkillIds,
    nextRoleUseCaseContents
  )
  const explicitlyDeselectedIds = currentManagedSkillIds.filter(
    (skillId) => !currentSelectedSkillIds.includes(skillId) && nextManagedSkillIds.includes(skillId)
  )
  const nextSelectedSkillIds = nextManagedSkillIds.filter(
    (skillId) => !explicitlyDeselectedIds.includes(skillId)
  )

  return {
    selected_install_skill_ids: nextSelectedSkillIds,
    selected_install_candidate_skill_ids: nextManagedSkillIds,
    selected_install_skill_ids_initialized: true,
  }
}

function buildPersistedStateForScope(
  scope: string,
  currentState: OnboardingState,
  savedState: OnboardingState,
  locale: Locale
) {
  if (scope === 'role') {
    const nextRoleUseCaseContents = createDefaultRoleUseCaseContents(
      currentState.selected_role_id,
      savedState.role_use_case_contents,
      locale
    )
    const nextSelection = reconcileInstallSelection(
      savedState,
      currentState.selected_role_id,
      savedState.selected_base_skill_ids,
      nextRoleUseCaseContents
    )

    return normalizeState({
      ...savedState,
      selected_role_id: currentState.selected_role_id,
      role_use_case_contents: nextRoleUseCaseContents,
      ...nextSelection,
    }, locale)
  }

  return normalizeState(currentState, locale)
}

function areSameStringSets(left: string[], right: string[]) {
  const normalizedLeft = unique(left).sort()
  const normalizedRight = unique(right).sort()

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function areSameStringRecords(left: Record<string, string>, right: Record<string, string>) {
  const leftEntries = Object.entries(left).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey)
  )
  const rightEntries = Object.entries(right).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey)
  )

  if (leftEntries.length !== rightEntries.length) {
    return false
  }

  return leftEntries.every(
    ([key, value], index) => key === rightEntries[index]?.[0] && value === rightEntries[index]?.[1]
  )
}

function areSameLinuxDevices(
  left: OnboardingLinuxDeviceRecord[],
  right: OnboardingLinuxDeviceRecord[]
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((device, index) => {
    const matching = right[index]

    return (
      device.id === matching?.id &&
      device.name === matching?.name &&
      device.host === matching?.host &&
      device.username === matching?.username &&
      device.password === matching?.password
    )
  })
}

function areSameSvnRepositories(
  left: OnboardingSvnRepositoryRecord[],
  right: OnboardingSvnRepositoryRecord[]
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((repository, index) => {
    const matching = right[index]

    return (
      repository.id === matching?.id &&
      repository.name === matching?.name &&
      repository.url === matching?.url &&
      repository.username === matching?.username &&
      repository.password === matching?.password
    )
  })
}

function areSameUseCaseRecord(
  left: OnboardingEditableUseCaseRecord | undefined,
  right: OnboardingEditableUseCaseRecord | undefined
) {
  if (!left || !right) {
    return left === right
  }

  return (
    left.role_id === right.role_id &&
    left.use_case_id === right.use_case_id &&
    left.use_case_name === right.use_case_name &&
    left.description === right.description &&
    (left.description_locked ?? false) === (right.description_locked ?? false) &&
    left.info_sources === right.info_sources &&
    left.rules === right.rules &&
    areSameQuestionRecords(left.questions ?? [], right.questions ?? [])
  )
}

function areSameQuestionRecords(
  left: OnboardingUseCaseQuestionRecord[],
  right: OnboardingUseCaseQuestionRecord[]
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((question, index) => {
    const matching = right[index]

    return (
      question.id === matching?.id &&
      question.label === matching?.label &&
      question.placeholder === matching?.placeholder &&
      question.required === matching?.required &&
      question.answer === matching?.answer &&
      question.locked === matching?.locked
    )
  })
}

function isConfiguredText(value: string) {
  return value.trim().length > 0
}

function createIdleConnectionTestState(requestId = 0): OnboardingConnectionTestState {
  return {
    status: 'idle',
    summary: null,
    details: null,
    last_trigger: null,
    tested_fingerprint: null,
    request_id: requestId,
  }
}

function createIdleEnvironmentCheckState(requestId = 0): OnboardingEnvironmentCheckState {
  return {
    status: 'idle',
    summary: null,
    details: null,
    requirements: [],
    missing_requirement_ids: [],
    install_supported: false,
    install_support_message: null,
    last_trigger: null,
    tested_fingerprint: null,
    request_id: requestId,
  }
}

function createPendingEnvironmentCheckState(
  locale: Locale,
  options?: {
    previous?: OnboardingEnvironmentCheckState
    requestId?: number
    trigger?: OnboardingEnvironmentTrigger | null
    testedFingerprint?: string | null
  }
): OnboardingEnvironmentCheckState {
  const previous = options?.previous

  return {
    status: 'pending',
    summary: getOnboardingCopy(locale, onboardingCopy.environmentPending),
    details: null,
    requirements: previous?.requirements ?? [],
    missing_requirement_ids: previous?.missing_requirement_ids ?? [],
    install_supported: previous?.install_supported ?? false,
    install_support_message: previous?.install_support_message ?? null,
    last_trigger: options?.trigger ?? previous?.last_trigger ?? null,
    tested_fingerprint: options?.testedFingerprint ?? previous?.tested_fingerprint ?? null,
    request_id: options?.requestId ?? previous?.request_id ?? 0,
  }
}

function createIdleEnvironmentInstallState(requestId = 0): OnboardingEnvironmentInstallState {
  return {
    status: 'idle',
    install_id: null,
    progress_percent: 0,
    step: null,
    logs: [],
    summary: null,
    details: null,
    request_id: requestId,
  }
}

function isCredentialGroupComplete(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return group.required_field_ids.every((fieldId) => isConfiguredText(credentialValues[fieldId] ?? ''))
}

const LEGACY_SVN_CREDENTIAL_FIELD_IDS = ['svnUrl', 'svnUsername', 'svnPassword'] as const

function buildAllowedCredentialFieldIds(baseSkillIds: string[]) {
  const allowedFieldIds = new Set(getCredentialFields(baseSkillIds).map((field) => field.id))

  if (baseSkillIds.includes('svn')) {
    LEGACY_SVN_CREDENTIAL_FIELD_IDS.forEach((fieldId) => {
      allowedFieldIds.delete(fieldId)
    })
  }

  return allowedFieldIds
}

function buildCredentialFingerprint(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return JSON.stringify(
    group.fields.map((field) => ({
      field_id: field.id,
      value: credentialValues[field.id] ?? '',
    }))
  )
}

function buildLinuxDeviceCredentialValues(device: OnboardingLinuxDeviceRecord) {
  return {
    linuxDeviceName: device.name,
    linuxHost: device.host,
    linuxUsername: device.username,
    linuxPassword: device.password,
  }
}

function buildSvnRepositoryCredentialValues(repository: OnboardingSvnRepositoryRecord) {
  return {
    svnRepositoryName: repository.name,
    svnUrl: repository.url,
    svnUsername: repository.username,
    svnPassword: repository.password,
  }
}

function isLinuxDeviceComplete(device: OnboardingLinuxDeviceRecord) {
  const credentialValues = buildLinuxDeviceCredentialValues(device)
  return Object.values(credentialValues).every((value) => isConfiguredText(value))
}

function buildLinuxDeviceFingerprint(device: OnboardingLinuxDeviceRecord) {
  return JSON.stringify(buildLinuxDeviceCredentialValues(device))
}

function isSvnRepositoryComplete(repository: OnboardingSvnRepositoryRecord) {
  const credentialValues = buildSvnRepositoryCredentialValues(repository)
  return Object.values(credentialValues).every((value) => isConfiguredText(value))
}

function buildSvnRepositoryFingerprint(repository: OnboardingSvnRepositoryRecord) {
  return JSON.stringify(buildSvnRepositoryCredentialValues(repository))
}

function shouldRefreshEnvironmentCheck(
  existing: OnboardingEnvironmentCheckState | undefined,
  nextFingerprint: string
) {
  return !existing || existing.tested_fingerprint !== nextFingerprint || existing.status === 'idle'
}

function pickCredentialValuesForGroup(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return Object.fromEntries(group.fields.map((field) => [field.id, credentialValues[field.id] ?? '']))
}

function buildEnvironmentFingerprint(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  if (group.service_id === 'gerrit') {
    return JSON.stringify({
      service_id: group.service_id,
      auth_mode: credentialValues.gerritAuthMode === 'ssh' ? 'ssh' : 'http',
    })
  }

  return JSON.stringify({
    service_id: group.service_id,
  })
}

function isUseCaseConfigured(record: OnboardingEditableUseCaseRecord) {
  const questions = record.questions ?? []

  if (questions.length > 0) {
    const requiredQuestionsConfigured = questions
      .filter((question) => question.required)
      .every(
        (question) =>
          isConfiguredText(question.answer) ||
          usesBuiltInTemplateFallback(question.id, question.answer, record.description)
      )

    if (record.description_locked) {
      return requiredQuestionsConfigured
    }

    return isConfiguredText(record.description) && requiredQuestionsConfigured
  }

  return isConfiguredText(record.description) && isConfiguredText(record.rules)
}

function getUseCaseSaveScope(useCaseId: string) {
  return `useCase:${useCaseId}`
}

function buildCredentialSyncErrorMessage(locale: Locale, errorMessage: string) {
  return `${getOnboardingCopy(locale, onboardingCopy.credentialSyncFailed)} ${errorMessage}`
}

function resolveSelectedInstallSkillIds(state: OnboardingState, managedSkillIds: string[]) {
  const filteredSelectedIds = unique(
    state.selected_install_skill_ids.filter((skillId) => managedSkillIds.includes(skillId))
  )

  if (!state.selected_install_skill_ids_initialized && filteredSelectedIds.length === 0) {
    return managedSkillIds
  }

  return filteredSelectedIds
}

function buildAgentStates(installedSkills: InstalledSkillInfo[]): OnboardingAgentState[] {
  return onboardingSupportedAgents.map((agent) => ({
    id: agent.id,
    installed_skill_ids: unique(
      installedSkills
        .filter((skill) => skill.app_id === agent.id)
        .map((skill) => skill.skill_id)
    ),
  }))
}

function buildAgentPreviews(
  agentStates: OnboardingAgentState[],
  managedSkillIds: string[],
  selectedAgentIds: string[],
  selectedInstallSkillIds: string[]
): OnboardingAgentSyncPreview[] {
  const selectedAgentIdSet = new Set(selectedAgentIds)
  const managedSkillIdSet = new Set(managedSkillIds)
  const selectedInstallSkillIdSet = new Set(selectedInstallSkillIds)

  return agentStates
    .filter((agent) => selectedAgentIdSet.has(agent.id))
    .map((agent) => {
      const added_skill_ids = selectedInstallSkillIds.filter(
        (skillId) => !agent.installed_skill_ids.includes(skillId)
      )
      const removed_skill_ids = agent.installed_skill_ids.filter(
        (skillId) => managedSkillIdSet.has(skillId) && !selectedInstallSkillIdSet.has(skillId)
      )
      const unchanged_skill_ids = agent.installed_skill_ids.filter(
        (skillId) => !removed_skill_ids.includes(skillId)
      )

      return {
        agent_id: agent.id,
        added_skill_ids,
        removed_skill_ids,
        unchanged_skill_ids,
      }
    })
}

function createEmptyState(): OnboardingState {
  return {
    selected_agent_ids: [],
    selected_role_id: '',
    selected_base_skill_ids: [],
    role_use_case_contents: [],
    selected_install_skill_ids: [],
    selected_install_skill_ids_initialized: false,
    selected_install_candidate_skill_ids: [],
    credential_values: {},
    linux_devices: [],
    svn_repositories: [],
  }
}

function normalizeState(state: OnboardingState, locale: Locale = 'zh-CN'): OnboardingState {
  const selected_role_id = isRoleId(state.selected_role_id)
    ? state.selected_role_id
    : ''
  const selected_agent_ids = unique(
    state.selected_agent_ids.filter((agentId) =>
      onboardingSupportedAgents.some((agent) => agent.id === agentId)
    )
  )
  const selected_base_skill_ids = withImplicitDefaultBaseSkills(state)
  const allowedCredentialFieldIds = buildAllowedCredentialFieldIds(selected_base_skill_ids)
  const linux_devices = selected_base_skill_ids.includes('linux')
    ? (state.linux_devices ?? []).map((device, index) => ({
        id: device?.id?.trim() || `linux-device-${index + 1}`,
        name: device?.name ?? '',
        host: device?.host ?? '',
        username: device?.username ?? '',
        password: device?.password ?? '',
      }))
    : []
  const rawSvnRepositories = selected_base_skill_ids.includes('svn')
    ? (state.svn_repositories ?? []).map((repository, index) => ({
        id: repository?.id?.trim() || `svn-repository-${index + 1}`,
        name: repository?.name ?? '',
        url: repository?.url ?? '',
        username: repository?.username ?? '',
        password: repository?.password ?? '',
      }))
    : []
  const legacySvnRepository =
    selected_base_skill_ids.includes('svn') &&
    rawSvnRepositories.length === 0 &&
    LEGACY_SVN_CREDENTIAL_FIELD_IDS.some((fieldId) => isConfiguredText(state.credential_values?.[fieldId] ?? ''))
      ? [
          {
            id: 'svn-repository-1',
            name: state.credential_values?.svnUrl ?? 'SVN Repository 1',
            url: state.credential_values?.svnUrl ?? '',
            username: state.credential_values?.svnUsername ?? '',
            password: state.credential_values?.svnPassword ?? '',
          },
        ]
      : []
  const svn_repositories = selected_base_skill_ids.includes('svn')
    ? rawSvnRepositories.length > 0
      ? rawSvnRepositories
      : legacySvnRepository
    : []

  return {
    ...state,
    selected_role_id,
    selected_agent_ids,
    selected_base_skill_ids,
    role_use_case_contents: selected_role_id
      ? createDefaultRoleUseCaseContents(selected_role_id, state.role_use_case_contents, locale)
      : [],
    selected_install_skill_ids: unique(state.selected_install_skill_ids),
    selected_install_candidate_skill_ids: unique(state.selected_install_candidate_skill_ids),
    credential_values: Object.fromEntries(
      Object.entries(state.credential_values).filter(([fieldId]) => allowedCredentialFieldIds.has(fieldId))
    ),
    linux_devices,
    svn_repositories,
  }
}


export function useOnboarding(installedSkills: InstalledSkillInfo[], locale: Locale = 'zh-CN') {
  const [state, setState] = useState<OnboardingState>(() => createEmptyState())
  const [savedState, setSavedState] = useState<OnboardingState>(() => createEmptyState())
  const [loading, setLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<OnboardingBatchSyncResult | null>(null)
  const [backendPreview, setBackendPreview] = useState<OnboardingInstallPreview | null>(null)
  const [saveFeedbacks, setSaveFeedbacks] = useState<Record<string, SaveFeedback>>({})
  const [savingScope, setSavingScope] = useState<string | null>(null)
  const [connectionTests, setConnectionTests] = useState<Record<string, OnboardingConnectionTestState>>({})
  const [linuxDeviceConnectionTests, setLinuxDeviceConnectionTests] = useState<
    Record<string, OnboardingConnectionTestState>
  >({})
  const [svnRepositoryConnectionTests, setSvnRepositoryConnectionTests] = useState<
    Record<string, OnboardingConnectionTestState>
  >({})
  const [environmentChecks, setEnvironmentChecks] = useState<
    Record<string, OnboardingEnvironmentCheckState>
  >({})
  const [environmentInstalls, setEnvironmentInstalls] = useState<
    Record<string, OnboardingEnvironmentInstallState>
  >({})
  const connectionTestRequestIdsRef = useRef<Record<string, number>>({})
  const linuxDeviceConnectionTestRequestIdsRef = useRef<Record<string, number>>({})
  const svnRepositoryConnectionTestRequestIdsRef = useRef<Record<string, number>>({})
  const environmentCheckRequestIdsRef = useRef<Record<string, number>>({})
  const environmentInstallRequestIdsRef = useRef<Record<string, number>>({})

  const selectedUseCases = useMemo(
    () => buildSelectedUseCases(state.role_use_case_contents),
    [state.role_use_case_contents]
  )
  const agentStates = useMemo(() => buildAgentStates(installedSkills), [installedSkills])
  const managedSkillIds = useMemo(
    () =>
      buildManagedSkillIds(
        state.selected_role_id,
        state.selected_base_skill_ids,
        state.role_use_case_contents
      ),
    [state.role_use_case_contents, state.selected_base_skill_ids, state.selected_role_id]
  )
  const resolvedSelectedInstallSkillIds = useMemo(
    () => resolveSelectedInstallSkillIds(state, managedSkillIds),
    [managedSkillIds, state]
  )
  const savedManagedSkillIds = useMemo(
    () =>
      buildManagedSkillIds(
        savedState.selected_role_id,
        savedState.selected_base_skill_ids,
        savedState.role_use_case_contents
      ),
    [savedState.role_use_case_contents, savedState.selected_base_skill_ids, savedState.selected_role_id]
  )
  const savedResolvedSelectedInstallSkillIds = useMemo(
    () => resolveSelectedInstallSkillIds(savedState, savedManagedSkillIds),
    [savedManagedSkillIds, savedState]
  )
  const installCandidateGroups = useMemo(
    () => buildInstallCandidateGroups(state.selected_role_id, state.role_use_case_contents),
    [state.role_use_case_contents, state.selected_role_id]
  )
  const previewRequestJson = useDeferredValue(
    useMemo(
      () =>
        JSON.stringify({
          state: {
            selected_agent_ids: state.selected_agent_ids,
            selected_role_id: state.selected_role_id,
            selected_base_skill_ids: state.selected_base_skill_ids,
            role_use_case_contents: state.role_use_case_contents,
            selected_install_skill_ids: state.selected_install_skill_ids,
            selected_install_skill_ids_initialized: state.selected_install_skill_ids_initialized,
            selected_install_candidate_skill_ids: state.selected_install_candidate_skill_ids,
            credential_values: {},
            linux_devices: [],
          } satisfies OnboardingState,
          selectedUseCases,
          agents: agentStates,
        }),
      [
        agentStates,
        selectedUseCases,
        state.role_use_case_contents,
        state.selected_agent_ids,
        state.selected_base_skill_ids,
        state.selected_install_candidate_skill_ids,
        state.selected_install_skill_ids,
        state.selected_install_skill_ids_initialized,
        state.selected_role_id,
      ]
    )
  )
  const credentialGroups = useMemo(
    () => getCredentialGroups(state.selected_base_skill_ids, locale, state.credential_values),
    [locale, state.credential_values, state.selected_base_skill_ids]
  )
  const credentialFields = useMemo(
    () => getCredentialFields(state.selected_base_skill_ids),
    [state.selected_base_skill_ids]
  )
  const credentialGroupById = useMemo(
    () => new Map(credentialGroups.map((group) => [group.service_id, group] as const)),
    [credentialGroups]
  )
  const hasPendingEnvironmentChecks = useMemo(
    () => Object.values(environmentChecks).some((check) => check.status === 'pending'),
    [environmentChecks]
  )
  const preview = useMemo<OnboardingInstallPreview>(() => {
    const fallbackPreview: OnboardingInstallPreview = {
      install_candidate_skill_ids: managedSkillIds,
      generated_skill_ids: installCandidateGroups.map((group) => ({
        production_skill_id: group.production_skill_id,
        test_skill_id: group.test_skill_id,
      })),
      selected_agent_ids: state.selected_agent_ids,
      selected_install_skill_ids: resolvedSelectedInstallSkillIds,
      agent_previews: buildAgentPreviews(
        agentStates,
        managedSkillIds,
        state.selected_agent_ids,
        resolvedSelectedInstallSkillIds
      ),
    }

    if (!backendPreview) {
      return fallbackPreview
    }

    return {
      install_candidate_skill_ids:
        backendPreview.install_candidate_skill_ids.length > 0
          ? backendPreview.install_candidate_skill_ids
          : managedSkillIds,
      generated_skill_ids:
        backendPreview.generated_skill_ids.length > 0
          ? backendPreview.generated_skill_ids
          : fallbackPreview.generated_skill_ids,
      selected_agent_ids: state.selected_agent_ids,
      selected_install_skill_ids: resolvedSelectedInstallSkillIds,
      agent_previews:
        backendPreview.agent_previews.length > 0
          ? backendPreview.agent_previews
          : fallbackPreview.agent_previews,
    }
  }, [
    agentStates,
    backendPreview,
    installCandidateGroups,
    managedSkillIds,
    resolvedSelectedInstallSkillIds,
    state.selected_agent_ids,
  ])

  const dirty = useMemo<OnboardingDirtyState>(() => {
    const savedUseCaseMap = new Map(
      savedState.role_use_case_contents.map((record) => [record.use_case_id, record])
    )
    const useCases = Object.fromEntries(
      state.role_use_case_contents.map((record) => [
        record.use_case_id,
        !areSameUseCaseRecord(record, savedUseCaseMap.get(record.use_case_id)),
      ])
    )
    const role = state.selected_role_id !== savedState.selected_role_id
    const baseSkills =
      !areSameStringSets(state.selected_base_skill_ids, savedState.selected_base_skill_ids) ||
      !areSameStringRecords(state.credential_values, savedState.credential_values) ||
      !areSameLinuxDevices(state.linux_devices, savedState.linux_devices) ||
      !areSameSvnRepositories(state.svn_repositories ?? [], savedState.svn_repositories ?? [])
    const install =
      !areSameStringSets(state.selected_agent_ids, savedState.selected_agent_ids) ||
      !areSameStringSets(resolvedSelectedInstallSkillIds, savedResolvedSelectedInstallSkillIds)

    return {
      role,
      baseSkills,
      install,
      any: role || baseSkills || install || Object.values(useCases).some(Boolean),
      useCases,
    }
  }, [
    resolvedSelectedInstallSkillIds,
    savedResolvedSelectedInstallSkillIds,
    savedState,
    state,
  ])

  const completion = useMemo<OnboardingCompletionState>(() => {
    const role = isConfiguredText(savedState.selected_role_id)
    const baseSkills = savedState.selected_base_skill_ids.length > 0
    const useCaseIds = Object.fromEntries(
      savedState.role_use_case_contents.map((record) => [record.use_case_id, isUseCaseConfigured(record)])
    )
    const useCases =
      savedState.role_use_case_contents.length > 0 &&
      savedState.role_use_case_contents.every(isUseCaseConfigured)
    const install =
      savedState.selected_agent_ids.length > 0 &&
      savedResolvedSelectedInstallSkillIds.length > 0

    return {
      basic: role && baseSkills,
      role,
      baseSkills,
      useCases,
      install,
      useCaseIds,
    }
  }, [savedResolvedSelectedInstallSkillIds, savedState])

  const updateState = useCallback(
    (updater: (current: OnboardingState) => OnboardingState) => {
      setState((current) => {
        return normalizeState(updater(current), locale)
      })
      setSaveFeedbacks({})
      setSyncResult(null)
      setSyncError(null)
    },
    [locale]
  )

  const runConnectionTest = useCallback(
    async (
      serviceId: string,
      trigger: OnboardingConnectionTestTrigger,
      options?: {
        credentialValues?: Record<string, string>
        group?: OnboardingCredentialGroup
      }
    ) => {
      const group = options?.group ?? credentialGroupById.get(serviceId)
      const credentialValues = options?.credentialValues ?? state.credential_values

      if (!group) {
        return
      }

      const requestId = (connectionTestRequestIdsRef.current[serviceId] ?? 0) + 1
      connectionTestRequestIdsRef.current[serviceId] = requestId

      if (!isCredentialGroupComplete(group, credentialValues)) {
        setConnectionTests((current) => ({
          ...current,
          [serviceId]: {
            ...createIdleConnectionTestState(requestId),
            summary: getOnboardingCopy(locale, onboardingCopy.connectionTestIncomplete),
          },
        }))
        return
      }

      const testedFingerprint = buildCredentialFingerprint(group, credentialValues)
      setConnectionTests((current) => ({
        ...current,
        [serviceId]: {
          status: 'pending',
          summary: getOnboardingCopy(locale, onboardingCopy.connectionTestPending),
          details: null,
          last_trigger: trigger,
          tested_fingerprint: testedFingerprint,
          request_id: requestId,
        },
      }))

      try {
        const result = await invoke<SkillResult<OnboardingConnectionTestResult>>(
          'test_onboarding_connection',
          {
            input: {
              service_id: serviceId,
              credential_values: pickCredentialValuesForGroup(group, credentialValues),
              trigger,
              tested_fingerprint: testedFingerprint,
            } satisfies OnboardingConnectionTestInput,
          }
        )

        setConnectionTests((current) => {
          if (current[serviceId]?.request_id !== requestId) {
            return current
          }

          if (result.success) {
            return {
              ...current,
              [serviceId]: {
                status: result.success.success ? 'success' : 'error',
                summary: result.success.summary,
                details: result.success.details,
                last_trigger: trigger,
                tested_fingerprint: result.success.tested_fingerprint,
                request_id: requestId,
              },
            }
          }

          return {
            ...current,
            [serviceId]: {
              status: 'error',
              summary: result.error ?? getOnboardingCopy(locale, onboardingCopy.connectionTestError),
              details: null,
              last_trigger: trigger,
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      } catch (error) {
        setConnectionTests((current) => {
          if (current[serviceId]?.request_id !== requestId) {
            return current
          }

          return {
            ...current,
            [serviceId]: {
              status: 'error',
              summary: String(error),
              details: null,
              last_trigger: trigger,
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      }
    },
    [credentialGroupById, locale, state.credential_values]
  )

  const runManualConnectionTest = useCallback(
    async (serviceId: string) => {
      await runConnectionTest(serviceId, 'manual')
    },
    [runConnectionTest]
  )

  const runManualLinuxDeviceConnectionTest = useCallback(
    async (deviceId: string) => {
      const group = credentialGroupById.get('linux')
      const device = state.linux_devices.find((item) => item.id === deviceId)

      if (!group || !device) {
        return
      }

      const requestId = (linuxDeviceConnectionTestRequestIdsRef.current[deviceId] ?? 0) + 1
      linuxDeviceConnectionTestRequestIdsRef.current[deviceId] = requestId

      if (!isLinuxDeviceComplete(device)) {
        setLinuxDeviceConnectionTests((current) => ({
          ...current,
          [deviceId]: {
            ...createIdleConnectionTestState(requestId),
            summary: getOnboardingCopy(locale, onboardingCopy.connectionTestIncomplete),
          },
        }))
        return
      }

      const credentialValues = buildLinuxDeviceCredentialValues(device)
      const testedFingerprint = buildLinuxDeviceFingerprint(device)

      setLinuxDeviceConnectionTests((current) => ({
        ...current,
        [deviceId]: {
          status: 'pending',
          summary: getOnboardingCopy(locale, onboardingCopy.connectionTestPending),
          details: null,
          last_trigger: 'manual',
          tested_fingerprint: testedFingerprint,
          request_id: requestId,
        },
      }))

      try {
        const result = await invoke<SkillResult<OnboardingConnectionTestResult>>(
          'test_onboarding_connection',
          {
            input: {
              service_id: group.service_id,
              credential_values: credentialValues,
              trigger: 'manual',
              tested_fingerprint: testedFingerprint,
            } satisfies OnboardingConnectionTestInput,
          }
        )

        setLinuxDeviceConnectionTests((current) => {
          if (current[deviceId]?.request_id !== requestId) {
            return current
          }

          if (result.success) {
            return {
              ...current,
              [deviceId]: {
                status: result.success.success ? 'success' : 'error',
                summary: result.success.summary,
                details: result.success.details,
                last_trigger: 'manual',
                tested_fingerprint: result.success.tested_fingerprint,
                request_id: requestId,
              },
            }
          }

          return {
            ...current,
            [deviceId]: {
              status: 'error',
              summary: result.error ?? getOnboardingCopy(locale, onboardingCopy.connectionTestError),
              details: null,
              last_trigger: 'manual',
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      } catch (error) {
        setLinuxDeviceConnectionTests((current) => {
          if (current[deviceId]?.request_id !== requestId) {
            return current
          }

          return {
            ...current,
            [deviceId]: {
              status: 'error',
              summary: String(error),
              details: null,
              last_trigger: 'manual',
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      }
    },
    [credentialGroupById, locale, state.linux_devices]
  )

  const runManualSvnRepositoryConnectionTest = useCallback(
    async (repositoryId: string) => {
      const group = credentialGroupById.get('svn')
      const repository = (state.svn_repositories ?? []).find((item) => item.id === repositoryId)

      if (!group || !repository) {
        return
      }

      const requestId = (svnRepositoryConnectionTestRequestIdsRef.current[repositoryId] ?? 0) + 1
      svnRepositoryConnectionTestRequestIdsRef.current[repositoryId] = requestId

      if (!isSvnRepositoryComplete(repository)) {
        setSvnRepositoryConnectionTests((current) => ({
          ...current,
          [repositoryId]: {
            ...createIdleConnectionTestState(requestId),
            summary: getOnboardingCopy(locale, onboardingCopy.connectionTestIncomplete),
          },
        }))
        return
      }

      const credentialValues = buildSvnRepositoryCredentialValues(repository)
      const testedFingerprint = buildSvnRepositoryFingerprint(repository)

      setSvnRepositoryConnectionTests((current) => ({
        ...current,
        [repositoryId]: {
          status: 'pending',
          summary: getOnboardingCopy(locale, onboardingCopy.connectionTestPending),
          details: null,
          last_trigger: 'manual',
          tested_fingerprint: testedFingerprint,
          request_id: requestId,
        },
      }))

      try {
        const result = await invoke<SkillResult<OnboardingConnectionTestResult>>(
          'test_onboarding_connection',
          {
            input: {
              service_id: group.service_id,
              credential_values: credentialValues,
              trigger: 'manual',
              tested_fingerprint: testedFingerprint,
            } satisfies OnboardingConnectionTestInput,
          }
        )

        setSvnRepositoryConnectionTests((current) => {
          if (current[repositoryId]?.request_id !== requestId) {
            return current
          }

          if (result.success) {
            return {
              ...current,
              [repositoryId]: {
                status: result.success.success ? 'success' : 'error',
                summary: result.success.summary,
                details: result.success.details,
                last_trigger: 'manual',
                tested_fingerprint: result.success.tested_fingerprint,
                request_id: requestId,
              },
            }
          }

          return {
            ...current,
            [repositoryId]: {
              status: 'error',
              summary: result.error ?? getOnboardingCopy(locale, onboardingCopy.connectionTestError),
              details: null,
              last_trigger: 'manual',
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      } catch (error) {
        setSvnRepositoryConnectionTests((current) => {
          if (current[repositoryId]?.request_id !== requestId) {
            return current
          }

          return {
            ...current,
            [repositoryId]: {
              status: 'error',
              summary: String(error),
              details: null,
              last_trigger: 'manual',
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      }
    },
    [credentialGroupById, locale, state.svn_repositories]
  )

  const runEnvironmentCheck = useCallback(
    async (
      serviceId: string,
      trigger: OnboardingEnvironmentTrigger,
      options?: {
        credentialValues?: Record<string, string>
        group?: OnboardingCredentialGroup
      }
    ) => {
      const group = options?.group ?? credentialGroupById.get(serviceId)
      const credentialValues = options?.credentialValues ?? state.credential_values

      if (!group) {
        return
      }

      const requestId = (environmentCheckRequestIdsRef.current[serviceId] ?? 0) + 1
      environmentCheckRequestIdsRef.current[serviceId] = requestId
      const testedFingerprint = buildEnvironmentFingerprint(group, credentialValues)

      setEnvironmentChecks((current) => ({
        ...current,
        [serviceId]: createPendingEnvironmentCheckState(locale, {
          previous: current[serviceId],
          requestId,
          trigger,
          testedFingerprint,
        }),
      }))

      try {
        const result = await invoke<SkillResult<OnboardingEnvironmentCheckResult>>(
          'check_onboarding_skill_environment',
          {
            input: {
              service_id: serviceId,
              credential_values: pickCredentialValuesForGroup(group, credentialValues),
              trigger,
              tested_fingerprint: testedFingerprint,
            } satisfies OnboardingEnvironmentCheckInput,
          }
        )

        setEnvironmentChecks((current) => {
          if (current[serviceId]?.request_id !== requestId) {
            return current
          }

          if (result.success) {
            return {
              ...current,
              [serviceId]: {
                status: result.success.status,
                summary: result.success.summary,
                details: result.success.details,
                requirements: result.success.requirements,
                missing_requirement_ids: result.success.missing_requirement_ids,
                install_supported: result.success.install_supported,
                install_support_message: result.success.install_support_message,
                last_trigger: trigger,
                tested_fingerprint: result.success.tested_fingerprint,
                request_id: requestId,
              },
            }
          }

          return {
            ...current,
            [serviceId]: {
              status: 'error',
              summary: result.error ?? getOnboardingCopy(locale, onboardingCopy.environmentError),
              details: null,
              requirements: [],
              missing_requirement_ids: [],
              install_supported: false,
              install_support_message: null,
              last_trigger: trigger,
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      } catch (error) {
        setEnvironmentChecks((current) => {
          if (current[serviceId]?.request_id !== requestId) {
            return current
          }

          return {
            ...current,
            [serviceId]: {
              status: 'error',
              summary: String(error),
              details: null,
              requirements: [],
              missing_requirement_ids: [],
              install_supported: false,
              install_support_message: null,
              last_trigger: trigger,
              tested_fingerprint: testedFingerprint,
              request_id: requestId,
            },
          }
        })
      }
    },
    [credentialGroupById, locale, state.credential_values]
  )

  const installEnvironment = useCallback(
    async (serviceId: string) => {
      const group = credentialGroupById.get(serviceId)

      if (!group) {
        return
      }

      const requestId = (environmentInstallRequestIdsRef.current[serviceId] ?? 0) + 1
      environmentInstallRequestIdsRef.current[serviceId] = requestId
      const installId = `${serviceId}-${requestId}-${Date.now()}`

      setEnvironmentInstalls((current) => ({
        ...current,
        [serviceId]: {
          status: 'running',
          install_id: installId,
          progress_percent: 0,
          step: getOnboardingCopy(locale, onboardingCopy.environmentInstallRunning),
          logs: [],
          summary: null,
          details: null,
          request_id: requestId,
        },
      }))

      try {
        const result = await invoke<SkillResult<OnboardingEnvironmentInstallResult>>(
          'install_onboarding_skill_environment',
          {
            input: {
              install_id: installId,
              service_id: serviceId,
              credential_values: pickCredentialValuesForGroup(group, state.credential_values),
            } satisfies OnboardingEnvironmentInstallInput,
          }
        )

        setEnvironmentInstalls((current) => {
          if (current[serviceId]?.install_id !== installId) {
            return current
          }

          if (result.success) {
            return {
              ...current,
              [serviceId]: {
                ...current[serviceId],
                status: result.success.success ? 'success' : 'error',
                progress_percent: current[serviceId]?.progress_percent ?? 100,
                step: current[serviceId]?.step ?? result.success.summary,
                summary: result.success.summary,
                details: result.success.details,
              },
            }
          }

          return {
            ...current,
            [serviceId]: {
              ...current[serviceId],
              status: 'error',
              summary: result.error ?? getOnboardingCopy(locale, onboardingCopy.environmentInstallError),
              details: null,
            },
          }
        })
      } catch (error) {
        setEnvironmentInstalls((current) => {
          if (current[serviceId]?.install_id !== installId) {
            return current
          }

          return {
            ...current,
            [serviceId]: {
              ...current[serviceId],
              status: 'error',
              summary: String(error),
              details: null,
            },
          }
        })
      } finally {
        await runEnvironmentCheck(serviceId, 'automatic', {
          credentialValues: state.credential_values,
          group,
        })
      }
    },
    [credentialGroupById, locale, runEnvironmentCheck, state.credential_values]
  )

  useEffect(() => {
    let cancelled = false

    async function loadState() {
      setLoading(true)

      try {
        const result = await invoke<SkillResult<OnboardingState>>('get_onboarding_state')
        if (!cancelled && result.success) {
          const nextState = normalizeState(result.success, locale)
          setState(nextState)
          setSavedState(nextState)
          setSaveFeedbacks({})
        } else if (!cancelled && result.error) {
          setPreviewError(result.error)
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(String(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setState((current) => normalizeState(current, locale))
    setSavedState((current) => normalizeState(current, locale))
  }, [locale])

  useEffect(() => {
    const unlisten = listen<OnboardingEnvironmentInstallProgressEvent>(
      'onboarding-environment-install-progress',
      (event) => {
        const payload = event.payload

        setEnvironmentInstalls((current) => {
          const existing = current[payload.service_id]

          if (!existing || existing.install_id !== payload.install_id) {
            return current
          }

          return {
            ...current,
            [payload.service_id]: {
              ...existing,
              status: payload.status === 'error' ? 'error' : payload.status === 'success' ? 'success' : 'running',
              progress_percent: payload.progress_percent,
              step: payload.step,
              logs: payload.log_line ? [...existing.logs, payload.log_line] : existing.logs,
            },
          }
        })
      }
    )

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      const request = JSON.parse(previewRequestJson) as {
        state: OnboardingState
        selectedUseCases: OnboardingUseCase[]
        agents: OnboardingAgentState[]
      }

      try {
        const result = await invoke<SkillResult<OnboardingInstallPreview>>(
          'get_onboarding_install_preview',
          request
        )

        if (!cancelled) {
          if (result.success) {
            setBackendPreview(result.success)
            setPreviewError(null)
          } else if (result.error) {
            setPreviewError(result.error)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(String(error))
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [previewRequestJson])

  useEffect(() => {
    const selectedServiceIds = new Set(credentialGroups.map((group) => group.service_id))

    setConnectionTests((current) => {
      let changed = false
      const next = Object.fromEntries(
        Object.entries(current).filter(([serviceId]) => {
          const keep = selectedServiceIds.has(serviceId)
          if (!keep) {
            changed = true
          }
          return keep
        })
      )

      credentialGroups.forEach((group) => {
        const existing = next[group.service_id]
        if (!existing) {
          return
        }

        const isComplete = isCredentialGroupComplete(group, state.credential_values)
        const nextFingerprint = isComplete
          ? buildCredentialFingerprint(group, state.credential_values)
          : null
        const shouldReset =
          !isComplete ||
          (existing.tested_fingerprint != null && existing.tested_fingerprint !== nextFingerprint) ||
          (isComplete && existing.tested_fingerprint == null && existing.summary != null)

        if (shouldReset) {
          const resetRequestId = Math.max(
            existing.request_id,
            connectionTestRequestIdsRef.current[group.service_id] ?? 0
          ) + 1
          connectionTestRequestIdsRef.current[group.service_id] = resetRequestId
          const resetState = createIdleConnectionTestState(resetRequestId)
          if (
            existing.status !== resetState.status ||
            existing.summary !== resetState.summary ||
            existing.details !== resetState.details ||
            existing.last_trigger !== resetState.last_trigger ||
            existing.tested_fingerprint !== resetState.tested_fingerprint
          ) {
            next[group.service_id] = resetState
            changed = true
          }
        }
      })

      return changed ? next : current
    })
  }, [credentialGroups, state.credential_values])

  useEffect(() => {
    const linuxSelected = credentialGroups.some((group) => group.service_id === 'linux')

    setLinuxDeviceConnectionTests((current) => {
      if (!linuxSelected) {
        return Object.keys(current).length > 0 ? {} : current
      }

      let changed = false
      const deviceIds = new Set(state.linux_devices.map((device) => device.id))
      const next = Object.fromEntries(
        Object.entries(current).filter(([deviceId]) => {
          const keep = deviceIds.has(deviceId)
          if (!keep) {
            changed = true
          }
          return keep
        })
      )

      state.linux_devices.forEach((device) => {
        const existing = next[device.id]
        if (!existing) {
          return
        }

        const complete = isLinuxDeviceComplete(device)
        const nextFingerprint = complete ? buildLinuxDeviceFingerprint(device) : null
        const shouldReset =
          !complete ||
          (existing.tested_fingerprint != null && existing.tested_fingerprint !== nextFingerprint) ||
          (complete && existing.tested_fingerprint == null && existing.summary != null)

        if (shouldReset) {
          const resetRequestId = Math.max(
            existing.request_id,
            linuxDeviceConnectionTestRequestIdsRef.current[device.id] ?? 0
          ) + 1
          linuxDeviceConnectionTestRequestIdsRef.current[device.id] = resetRequestId
          const resetState = createIdleConnectionTestState(resetRequestId)

          if (
            existing.status !== resetState.status ||
            existing.summary !== resetState.summary ||
            existing.details !== resetState.details ||
            existing.last_trigger !== resetState.last_trigger ||
            existing.tested_fingerprint !== resetState.tested_fingerprint
          ) {
            next[device.id] = resetState
            changed = true
          }
        }
      })

      return changed ? next : current
    })
  }, [credentialGroups, state.linux_devices])

  useEffect(() => {
    const svnSelected = credentialGroups.some((group) => group.service_id === 'svn')

    setSvnRepositoryConnectionTests((current) => {
      if (!svnSelected) {
        return Object.keys(current).length > 0 ? {} : current
      }

      let changed = false
      const repositoryIds = new Set((state.svn_repositories ?? []).map((repository) => repository.id))
      const next = Object.fromEntries(
        Object.entries(current).filter(([repositoryId]) => {
          const keep = repositoryIds.has(repositoryId)
          if (!keep) {
            changed = true
          }
          return keep
        })
      )

      ;(state.svn_repositories ?? []).forEach((repository) => {
        const existing = next[repository.id]
        if (!existing) {
          return
        }

        const complete = isSvnRepositoryComplete(repository)
        const nextFingerprint = complete ? buildSvnRepositoryFingerprint(repository) : null
        const shouldReset =
          !complete ||
          (existing.tested_fingerprint != null && existing.tested_fingerprint !== nextFingerprint) ||
          (complete && existing.tested_fingerprint == null && existing.summary != null)

        if (shouldReset) {
          const resetRequestId = Math.max(
            existing.request_id,
            svnRepositoryConnectionTestRequestIdsRef.current[repository.id] ?? 0
          ) + 1
          svnRepositoryConnectionTestRequestIdsRef.current[repository.id] = resetRequestId
          const resetState = createIdleConnectionTestState(resetRequestId)

          if (
            existing.status !== resetState.status ||
            existing.summary !== resetState.summary ||
            existing.details !== resetState.details ||
            existing.last_trigger !== resetState.last_trigger ||
            existing.tested_fingerprint !== resetState.tested_fingerprint
          ) {
            next[repository.id] = resetState
            changed = true
          }
        }
      })

      return changed ? next : current
    })
  }, [credentialGroups, state.svn_repositories])

  useEffect(() => {
    const selectedServiceIds = new Set(credentialGroups.map((group) => group.service_id))

    setEnvironmentChecks((current) => {
      let changed = false
      const next = Object.fromEntries(
        Object.entries(current).filter(([serviceId]) => {
          const keep = selectedServiceIds.has(serviceId)
          if (!keep) {
            changed = true
          }
          return keep
        })
      )

      return changed ? next : current
    })

    setEnvironmentInstalls((current) => {
      let changed = false
      const next = Object.fromEntries(
        Object.entries(current).filter(([serviceId]) => {
          const keep = selectedServiceIds.has(serviceId)
          if (!keep) {
            changed = true
          }
          return keep
        })
      )

      return changed ? next : current
    })
  }, [credentialGroups])

  useEffect(() => {
    if (credentialGroups.length === 0) {
      return undefined
    }

    setEnvironmentChecks((current) => {
      let changed = false
      const next = { ...current }

      credentialGroups.forEach((group) => {
        const nextFingerprint = buildEnvironmentFingerprint(group, state.credential_values)
        const existing = current[group.service_id]

        if (!shouldRefreshEnvironmentCheck(existing, nextFingerprint)) {
          return
        }

        const nextState = createPendingEnvironmentCheckState(locale, {
          previous: existing,
          trigger: 'automatic',
          testedFingerprint: nextFingerprint,
        })

        if (
          existing?.status === nextState.status &&
          existing?.summary === nextState.summary &&
          existing?.last_trigger === nextState.last_trigger &&
          existing?.tested_fingerprint === nextState.tested_fingerprint
        ) {
          return
        }

        next[group.service_id] = nextState
        changed = true
      })

      return changed ? next : current
    })

    return undefined
  }, [credentialGroups, locale, state.credential_values])

  useEffect(() => {
    if (credentialGroups.length === 0) {
      return undefined
    }

    credentialGroups.forEach((group) => {
      const nextFingerprint = buildEnvironmentFingerprint(group, state.credential_values)
      const existing = environmentChecks[group.service_id]
      const shouldCheck = shouldRefreshEnvironmentCheck(existing, nextFingerprint)

      if (shouldCheck) {
        void runEnvironmentCheck(group.service_id, 'automatic', {
          credentialValues: state.credential_values,
          group,
        })
      }
    })

    return undefined
  }, [credentialGroups, environmentChecks, runEnvironmentCheck, state.credential_values])

  const persistState = useCallback(
    async (scope: string, nextState: OnboardingState) => {
      setSavingScope(scope)
      setSyncError(null)

      try {
        const result = await invoke<SkillResult<OnboardingState>>('set_onboarding_state', {
          state: nextState,
        })

        if (result.success) {
          const normalizedState = normalizeState(result.success, locale)
          if (scope === 'role') {
            setState((current) => normalizeState(current, locale))
          } else {
            setState(normalizedState)
          }
          setSavedState(normalizedState)

          let feedback: SaveFeedback = {
            kind: 'success',
            message: getOnboardingCopy(locale, onboardingCopy.saveSuccess),
          }
          let errorMessage: string | null = null

          if (scope === 'baseSkills') {
            try {
              const syncResult = await invoke<SkillResult<boolean>>('sync_onboarding_credentials', {
                state: normalizedState,
              })

              if (!syncResult.success) {
                errorMessage = buildCredentialSyncErrorMessage(
                  locale,
                  syncResult.error ?? getOnboardingCopy(locale, onboardingCopy.saveFailed)
                )
                feedback = {
                  kind: 'error',
                  message: errorMessage,
                }
              }
            } catch (error) {
              errorMessage = buildCredentialSyncErrorMessage(locale, String(error))
              feedback = {
                kind: 'error',
                message: errorMessage,
              }
            }
          }

          setSaveFeedbacks((current) => ({
            ...current,
            [scope]: feedback,
          }))
          return {
            state: normalizedState,
            error: errorMessage,
          }
        }

        const errorMessage = result.error ?? getOnboardingCopy(locale, onboardingCopy.saveFailed)
        setSaveFeedbacks((current) => ({
          ...current,
          [scope]: {
            kind: 'error',
            message: errorMessage,
          },
        }))
        return {
          state: null,
          error: errorMessage,
        }
      } catch (error) {
        const errorMessage = String(error)
        setSaveFeedbacks((current) => ({
          ...current,
          [scope]: {
            kind: 'error',
            message: errorMessage,
          },
        }))
        return {
          state: null,
          error: errorMessage,
        }
      } finally {
        setSavingScope((current) => (current === scope ? null : current))
      }
    },
    [locale]
  )

  const saveState = useCallback(
    async (scope: string) => {
      const nextState = buildPersistedStateForScope(scope, state, savedState, locale)
      await persistState(scope, nextState)
    },
    [locale, persistState, savedState, state]
  )

  const toggleAgent = useCallback(
    (agentId: string) => {
      updateState((current) => ({
        ...current,
        selected_agent_ids: current.selected_agent_ids.includes(agentId)
          ? current.selected_agent_ids.filter((selectedAgentId) => selectedAgentId !== agentId)
          : [...current.selected_agent_ids, agentId],
      }))
    },
    [updateState]
  )

  const selectRole = useCallback(
    (roleId: string) => {
      updateState((current) => {
        const nextRoleUseCaseContents = createDefaultRoleUseCaseContents(
          roleId,
          current.role_use_case_contents,
          locale
        )
        const nextSelection = reconcileInstallSelection(
          current,
          roleId,
          current.selected_base_skill_ids,
          nextRoleUseCaseContents
        )

        return {
          ...current,
          selected_role_id: roleId,
          role_use_case_contents: nextRoleUseCaseContents,
          ...nextSelection,
        }
      })
    },
    [locale, updateState]
  )

  const toggleBaseSkill = useCallback(
    (skillId: string) => {
      updateState((current) => {
        const nextBaseSkillIds = current.selected_base_skill_ids.includes(skillId)
          ? current.selected_base_skill_ids.filter((selectedSkillId) => selectedSkillId !== skillId)
          : [...current.selected_base_skill_ids, skillId]
        const nextSelection = reconcileInstallSelection(
          current,
          current.selected_role_id,
          nextBaseSkillIds,
          current.role_use_case_contents
        )
        const allowedCredentialFieldIds = buildAllowedCredentialFieldIds(nextBaseSkillIds)
        const nextLinuxDevices =
          skillId === 'linux' && !current.selected_base_skill_ids.includes('linux')
            ? current.linux_devices.length > 0
              ? current.linux_devices
              : [createEmptyLinuxDevice(current.linux_devices)]
            : current.linux_devices
        const nextSvnRepositories =
          skillId === 'svn' && !current.selected_base_skill_ids.includes('svn')
            ? (current.svn_repositories ?? []).length > 0
              ? current.svn_repositories ?? []
              : [createEmptySvnRepository(current.svn_repositories ?? [])]
            : current.svn_repositories ?? []

        return {
          ...current,
          selected_base_skill_ids: nextBaseSkillIds,
          credential_values: Object.fromEntries(
            Object.entries(current.credential_values).filter(([fieldId]) =>
              allowedCredentialFieldIds.has(fieldId)
            )
          ),
          linux_devices: nextLinuxDevices,
          svn_repositories: nextSvnRepositories,
          ...nextSelection,
        }
      })
    },
    [updateState]
  )

  const addLinuxDevice = useCallback(() => {
    updateState((current) => ({
      ...current,
      linux_devices: [...current.linux_devices, createEmptyLinuxDevice(current.linux_devices)],
    }))
  }, [updateState])

  const updateLinuxDeviceField = useCallback(
    (deviceId: string, field: keyof Omit<OnboardingLinuxDeviceRecord, 'id'>, value: string) => {
      updateState((current) => ({
        ...current,
        linux_devices: current.linux_devices.map((device) =>
          device.id === deviceId ? { ...device, [field]: value } : device
        ),
      }))
    },
    [updateState]
  )

  const removeLinuxDevice = useCallback(
    (deviceId: string) => {
      updateState((current) => ({
        ...current,
        linux_devices: current.linux_devices.filter((device) => device.id !== deviceId),
      }))
    },
    [updateState]
  )

  const addSvnRepository = useCallback(() => {
    updateState((current) => ({
      ...current,
      svn_repositories: [
        ...(current.svn_repositories ?? []),
        createEmptySvnRepository(current.svn_repositories ?? []),
      ],
    }))
  }, [updateState])

  const updateSvnRepositoryField = useCallback(
    (repositoryId: string, field: keyof Omit<OnboardingSvnRepositoryRecord, 'id'>, value: string) => {
      updateState((current) => ({
        ...current,
        svn_repositories: (current.svn_repositories ?? []).map((repository) =>
          repository.id === repositoryId ? { ...repository, [field]: value } : repository
        ),
      }))
    },
    [updateState]
  )

  const removeSvnRepository = useCallback(
    (repositoryId: string) => {
      updateState((current) => ({
        ...current,
        svn_repositories: (current.svn_repositories ?? []).filter(
          (repository) => repository.id !== repositoryId
        ),
      }))
    },
    [updateState]
  )

  const updateUseCaseDescription = useCallback(
    (useCaseId: string, value: string) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId ? { ...record, description: value } : record
        ),
      }))
    },
    [updateState]
  )

  const updateUseCaseQuestionLabel = useCallback(
    (useCaseId: string, questionId: string, value: string) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId
            ? {
                ...record,
                questions: (record.questions ?? []).map((question) =>
                  question.id === questionId ? { ...question, label: value } : question
                ),
              }
            : record
        ),
      }))
    },
    [updateState]
  )

  const updateUseCaseQuestionAnswer = useCallback(
    (useCaseId: string, questionId: string, value: string) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId
            ? {
                ...record,
                questions: (record.questions ?? []).map((question) =>
                  question.id === questionId ? { ...question, answer: value } : question
                ),
              }
            : record
        ),
      }))
    },
    [updateState]
  )

  const addUseCaseQuestion = useCallback(
    (useCaseId: string) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) => {
          if (record.use_case_id !== useCaseId) {
            return record
          }

          const existingQuestions = record.questions ?? []
          const nextQuestion = buildNextQuestionId(existingQuestions)

          return {
            ...record,
            questions: [
              ...existingQuestions,
              {
                id: nextQuestion.id,
                label: locale === 'zh-CN' ? `问题 ${nextQuestion.index}` : `Question ${nextQuestion.index}`,
                placeholder: '',
                required: true,
                answer: '',
                locked: false,
              },
            ],
          }
        }),
      }))
    },
    [locale, updateState]
  )

  const removeUseCaseQuestion = useCallback(
    (useCaseId: string, questionId: string) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId
            ? {
                ...record,
                questions: (record.questions ?? []).filter((question) => question.id !== questionId),
              }
            : record
        ),
      }))
    },
    [updateState]
  )

  const addUseCase = useCallback(
    (useCaseName: string) => {
      const trimmedName = useCaseName.trim()
      if (!trimmedName || !state.selected_role_id) {
        return null
      }

      const nextUseCase = createCustomRoleUseCaseContent(
        state.selected_role_id,
        trimmedName,
        state.role_use_case_contents
          .filter((record) => record.role_id === state.selected_role_id)
          .map((record) => record.use_case_id)
      )
      const nextRoleUseCaseContents = [...state.role_use_case_contents, nextUseCase]
      const nextSelection = reconcileInstallSelection(
        state,
        state.selected_role_id,
        state.selected_base_skill_ids,
        nextRoleUseCaseContents
      )

      setState((current) =>
        normalizeState({
          ...current,
          role_use_case_contents: nextRoleUseCaseContents,
          ...nextSelection,
        }, locale)
      )
      setSaveFeedbacks({})
      setSyncResult(null)
      setSyncError(null)

      return nextUseCase.use_case_id
    },
    [locale, state]
  )

  const toggleInstallSkill = useCallback(
    (skillId: string) => {
      updateState((current) => {
        const currentManagedSkillIds = buildManagedSkillIds(
          current.selected_role_id,
          current.selected_base_skill_ids,
          current.role_use_case_contents
        )
        const currentSelectedSkillIds = resolveSelectedInstallSkillIds(current, currentManagedSkillIds)

        if (isBaseSkillId(skillId)) {
          const nextBaseSkillIds = current.selected_base_skill_ids.filter(
            (selectedSkillId) => selectedSkillId !== skillId
          )
          const nextSelection = reconcileInstallSelection(
            current,
            current.selected_role_id,
            nextBaseSkillIds,
            current.role_use_case_contents
          )
          const allowedCredentialFieldIds = new Set(
            getCredentialFields(nextBaseSkillIds).map((field) => field.id)
          )

          return {
            ...current,
            selected_base_skill_ids: nextBaseSkillIds,
            credential_values: Object.fromEntries(
              Object.entries(current.credential_values).filter(([fieldId]) =>
                allowedCredentialFieldIds.has(fieldId)
              )
            ),
            ...nextSelection,
          }
        }

        return {
          ...current,
          selected_install_skill_ids: currentSelectedSkillIds.includes(skillId)
            ? currentSelectedSkillIds.filter((selectedSkillId) => selectedSkillId !== skillId)
            : [...currentSelectedSkillIds, skillId],
          selected_install_skill_ids_initialized: true,
          selected_install_candidate_skill_ids: currentManagedSkillIds,
        }
      })
    },
    [updateState]
  )

  const updateCredentialValue = useCallback(
    (fieldId: string, value: string) => {
      updateState((current) => ({
        ...current,
        credential_values: {
          ...current.credential_values,
          [fieldId]: value,
        },
      }))
    },
    [updateState]
  )

  const startSync = useCallback(async () => {
    let stateToSync = state

    if (dirty.any) {
      const persistedState = await persistState(
        'install',
        buildPersistedStateForScope('install', state, savedState, locale)
      )

      if (!persistedState.state) {
        setSyncResult(null)
        setSyncError(persistedState.error ?? getOnboardingCopy(locale, onboardingCopy.saveFailed))
        return
      }

      stateToSync = persistedState.state
    }

    setSyncing(true)
    setSyncError(null)

    try {
      const selectedUseCasesToSync = buildSelectedUseCases(stateToSync.role_use_case_contents)
      const agentStatesToSync = buildAgentStates(installedSkills)
      const stagedPackages = (
        await Promise.all(
          stateToSync.role_use_case_contents.map(async (useCaseContent) => {
            const matchingUseCase = onboardingUseCases.find(
              (useCase) => useCase.id === useCaseContent.use_case_id
            )

            const result = await invoke<SkillResult<StagedOnboardingPackages>>(
              'stage_onboarding_generated_packages',
              {
                input: {
                  role_id: stateToSync.selected_role_id,
                  role_name: getRoleNameById(stateToSync.selected_role_id),
                  selected_agent_ids: stateToSync.selected_agent_ids,
                  selected_base_skill_ids: stateToSync.selected_base_skill_ids,
                  use_case: useCaseContent,
                  use_case_directory: matchingUseCase?.directory ?? useCaseContent.use_case_id,
                },
              }
            )

            return result.success
          })
        )
      ).filter((value): value is StagedOnboardingPackages => value != null)

      const result = await invoke<SkillResult<OnboardingBatchSyncResult>>(
        'sync_onboarding_installation',
        {
          input: {
            state: stateToSync,
            selected_use_cases: selectedUseCasesToSync,
            agents: agentStatesToSync,
            staged_packages: stagedPackages,
          },
        }
      )

      if (result.success) {
        setSyncResult(result.success)
      } else if (result.error) {
        setSyncError(result.error)
      }
    } catch (error) {
      setSyncError(String(error))
    } finally {
      setSyncing(false)
    }
  }, [dirty.any, installedSkills, locale, persistState, savedState, state])

  return {
    completion,
    connectionTests,
    linuxDeviceConnectionTests,
    svnRepositoryConnectionTests,
    environmentChecks,
    environmentInstalls,
    credentialFields,
    credentialGroups,
    dirty,
    hasPendingEnvironmentChecks,
    installCandidateGroups,
    addLinuxDevice,
    addSvnRepository,
    loading,
    preview,
    previewError,
    saveFeedbacks,
    saveState,
    selectedUseCases,
    savedResolvedSelectedInstallSkillIds,
    savedState,
    savingScope,
    state,
    syncError,
    syncing,
    syncResult,
    startSync,
    removeLinuxDevice,
    removeSvnRepository,
    toggleAgent,
    toggleBaseSkill,
    toggleInstallSkill,
    runManualConnectionTest,
    runManualLinuxDeviceConnectionTest,
    runManualSvnRepositoryConnectionTest,
    installEnvironment,
    updateLinuxDeviceField,
    updateSvnRepositoryField,
    updateCredentialValue,
    updateUseCaseDescription,
    updateUseCaseQuestionAnswer,
    updateUseCaseQuestionLabel,
    addUseCaseQuestion,
    removeUseCaseQuestion,
    selectRole,
    addUseCase,
    getUseCaseSaveScope,
  }
}

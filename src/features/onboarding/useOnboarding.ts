import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
  OnboardingEditableUseCaseRecord,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingState,
  OnboardingUseCase,
  SkillResult,
  StagedOnboardingPackages,
} from '../../types'
import { getOnboardingCopy, onboardingCopy } from './copy'

interface SaveFeedback {
  kind: 'success' | 'error'
  message: string
}

const CONNECTION_TEST_DEBOUNCE_MS = 700

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

function isBaseSkillId(skillId: string) {
  return onboardingBaseSkills.some((skill) => skill.id === skillId)
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
    left.info_sources === right.info_sources &&
    left.rules === right.rules
  )
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

function isCredentialGroupComplete(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return group.required_field_ids.every((fieldId) => isConfiguredText(credentialValues[fieldId] ?? ''))
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

function pickCredentialValuesForGroup(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return Object.fromEntries(group.fields.map((field) => [field.id, credentialValues[field.id] ?? '']))
}

function isUseCaseConfigured(record: OnboardingEditableUseCaseRecord) {
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
  const selected_base_skill_ids = unique(
    state.selected_base_skill_ids.filter((skillId) =>
      onboardingBaseSkills.some((skill) => skill.id === skillId)
    )
  )
  const allowedCredentialFieldIds = new Set(
    getCredentialFields(selected_base_skill_ids).map((field) => field.id)
  )

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
  const connectionTestRequestIdsRef = useRef<Record<string, number>>({})
  const connectionTestTimeoutsRef = useRef<Record<string, number>>({})

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
  const credentialGroups = useMemo(
    () => getCredentialGroups(state.selected_base_skill_ids, locale),
    [locale, state.selected_base_skill_ids]
  )
  const credentialFields = useMemo(
    () => getCredentialFields(state.selected_base_skill_ids),
    [state.selected_base_skill_ids]
  )
  const credentialGroupById = useMemo(
    () => new Map(credentialGroups.map((group) => [group.service_id, group] as const)),
    [credentialGroups]
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
      !areSameStringRecords(state.credential_values, savedState.credential_values)
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

  const clearConnectionTestTimeout = useCallback((serviceId: string) => {
    const timeoutId = connectionTestTimeoutsRef.current[serviceId]
    if (timeoutId != null) {
      window.clearTimeout(timeoutId)
      delete connectionTestTimeoutsRef.current[serviceId]
    }
  }, [])

  const runConnectionTest = useCallback(
    async (serviceId: string, trigger: OnboardingConnectionTestTrigger) => {
      const group = credentialGroupById.get(serviceId)

      if (!group) {
        return
      }

      const requestId = (connectionTestRequestIdsRef.current[serviceId] ?? 0) + 1
      connectionTestRequestIdsRef.current[serviceId] = requestId

      if (!isCredentialGroupComplete(group, state.credential_values)) {
        setConnectionTests((current) => ({
          ...current,
          [serviceId]: {
            ...createIdleConnectionTestState(requestId),
            summary: getOnboardingCopy(locale, onboardingCopy.connectionTestIncomplete),
          },
        }))
        return
      }

      const testedFingerprint = buildCredentialFingerprint(group, state.credential_values)
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
              credential_values: pickCredentialValuesForGroup(group, state.credential_values),
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
      clearConnectionTestTimeout(serviceId)
      await runConnectionTest(serviceId, 'manual')
    },
    [clearConnectionTestTimeout, runConnectionTest]
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
    let cancelled = false

    async function loadPreview() {
      try {
        const result = await invoke<SkillResult<OnboardingInstallPreview>>(
          'get_onboarding_install_preview',
          {
            state,
            selectedUseCases,
            agents: agentStates,
          }
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
  }, [agentStates, selectedUseCases, state])

  useEffect(() => {
    return () => {
      Object.values(connectionTestTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      connectionTestTimeoutsRef.current = {}
    }
  }, [])

  useEffect(() => {
    const selectedServiceIds = new Set(credentialGroups.map((group) => group.service_id))

    Object.keys(connectionTestTimeoutsRef.current).forEach((serviceId) => {
      if (!selectedServiceIds.has(serviceId)) {
        clearConnectionTestTimeout(serviceId)
      }
    })

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

        if (!isCredentialGroupComplete(group, state.credential_values)) {
          const resetState = createIdleConnectionTestState(existing.request_id)
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
  }, [clearConnectionTestTimeout, credentialGroups, state.credential_values])

  useEffect(() => {
    credentialGroups.forEach((group) => {
      clearConnectionTestTimeout(group.service_id)

      if (!isCredentialGroupComplete(group, state.credential_values)) {
        return
      }

      const fingerprint = buildCredentialFingerprint(group, state.credential_values)
      const currentState = connectionTests[group.service_id]

      if (
        currentState?.status === 'pending' &&
        currentState.tested_fingerprint === fingerprint
      ) {
        return
      }

      if (currentState?.tested_fingerprint === fingerprint) {
        return
      }

      connectionTestTimeoutsRef.current[group.service_id] = window.setTimeout(() => {
        void runConnectionTest(group.service_id, 'automatic')
      }, CONNECTION_TEST_DEBOUNCE_MS)
    })
  }, [
    clearConnectionTestTimeout,
    connectionTests,
    credentialGroups,
    runConnectionTest,
    state.credential_values,
  ])

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
      })
    },
    [updateState]
  )

  const updateUseCaseContent = useCallback(
    (
      useCaseId: string,
      field: keyof Pick<OnboardingEditableUseCaseRecord, 'description' | 'info_sources' | 'rules'>,
      value: string
    ) => {
      updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId ? { ...record, [field]: value } : record
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
    credentialFields,
    credentialGroups,
    dirty,
    installCandidateGroups,
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
    toggleAgent,
    toggleBaseSkill,
    toggleInstallSkill,
    runManualConnectionTest,
    updateCredentialValue,
    updateUseCaseContent,
    selectRole,
    addUseCase,
    getUseCaseSaveScope,
  }
}

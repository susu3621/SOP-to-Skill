import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  buildGeneratedSkillIdsForRoleUseCase,
  createDefaultRoleUseCaseContents,
  defaultOnboardingRoleId,
  getApplicableUseCasesForRole,
  getCredentialFields,
  getRoleNameById,
  onboardingBaseSkills,
  onboardingSupportedAgents,
  onboardingUseCases,
  sharedConfig,
} from '../../content/workbuddy'
import type {
  InstalledSkillInfo,
  OnboardingAgentState,
  OnboardingAgentSyncPreview,
  OnboardingBatchSyncResult,
  OnboardingEditableUseCaseRecord,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingState,
  OnboardingUseCase,
  SkillResult,
  StagedOnboardingPackages,
} from '../../types'

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

function isBaseSkillId(skillId: string) {
  return onboardingBaseSkills.some((skill) => skill.id === skillId)
}

function isRoleId(roleId: string) {
  return Object.prototype.hasOwnProperty.call(sharedConfig.roles, roleId)
}

function buildManagedSkillIds(roleId: string, baseSkillIds: string[]) {
  const selectedBaseSkillIds = unique(
    baseSkillIds.filter((skillId) => onboardingBaseSkills.some((skill) => skill.id === skillId))
  )
  const generatedSkillIds = getApplicableUseCasesForRole(roleId).flatMap((useCase) => {
    const generated = buildGeneratedSkillIdsForRoleUseCase(roleId, useCase.directory)
    return [generated.production_skill_id, generated.test_skill_id]
  })

  return unique([...selectedBaseSkillIds, ...generatedSkillIds])
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

function isUseCaseConfigured(record: OnboardingEditableUseCaseRecord) {
  return isConfiguredText(record.description) && isConfiguredText(record.rules)
}

function getUseCaseSaveScope(useCaseId: string) {
  return `useCase:${useCaseId}`
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
    selected_role_id: defaultOnboardingRoleId,
    selected_base_skill_ids: [],
    role_use_case_contents: createDefaultRoleUseCaseContents(defaultOnboardingRoleId),
    selected_install_skill_ids: [],
    selected_install_skill_ids_initialized: false,
    selected_install_candidate_skill_ids: [],
    credential_values: {},
  }
}

function normalizeState(state: OnboardingState): OnboardingState {
  const selected_role_id = isRoleId(state.selected_role_id)
    ? state.selected_role_id
    : defaultOnboardingRoleId
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
      ? createDefaultRoleUseCaseContents(selected_role_id, state.role_use_case_contents)
      : [],
    selected_install_skill_ids: unique(state.selected_install_skill_ids),
    selected_install_candidate_skill_ids: unique(state.selected_install_candidate_skill_ids),
    credential_values: Object.fromEntries(
      Object.entries(state.credential_values).filter(([fieldId]) => allowedCredentialFieldIds.has(fieldId))
    ),
  }
}

function buildSelectedUseCases(): OnboardingUseCase[] {
  return onboardingUseCases.map((useCase) => ({
    id: useCase.id,
    name: useCase.name,
    directory: useCase.directory,
    applicable_role_ids: useCase.applicable_role_ids,
  }))
}

function buildInstallCandidateGroups(roleId: string): OnboardingInstallCandidateGroup[] {
  return getApplicableUseCasesForRole(roleId).map((useCase) => ({
    use_case_id: useCase.id,
    use_case_name: useCase.name,
    ...buildGeneratedSkillIdsForRoleUseCase(roleId, useCase.directory),
  }))
}

function reconcileInstallSelection(
  state: OnboardingState,
  nextRoleId: string,
  nextBaseSkillIds: string[]
) {
  const currentManagedSkillIds = buildManagedSkillIds(state.selected_role_id, state.selected_base_skill_ids)
  const currentSelectedSkillIds = resolveSelectedInstallSkillIds(state, currentManagedSkillIds)
  const nextManagedSkillIds = buildManagedSkillIds(nextRoleId, nextBaseSkillIds)
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
  savedState: OnboardingState
) {
  if (scope === 'role') {
    const nextSelection = reconcileInstallSelection(
      savedState,
      currentState.selected_role_id,
      savedState.selected_base_skill_ids
    )

    return normalizeState({
      ...savedState,
      selected_role_id: currentState.selected_role_id,
      role_use_case_contents: createDefaultRoleUseCaseContents(
        currentState.selected_role_id,
        savedState.role_use_case_contents
      ),
      ...nextSelection,
    })
  }

  return normalizeState(currentState)
}

export function useOnboarding(installedSkills: InstalledSkillInfo[]) {
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

  const selectedUseCases = useMemo(() => buildSelectedUseCases(), [])
  const agentStates = useMemo(() => buildAgentStates(installedSkills), [installedSkills])
  const managedSkillIds = useMemo(
    () => buildManagedSkillIds(state.selected_role_id, state.selected_base_skill_ids),
    [state.selected_base_skill_ids, state.selected_role_id]
  )
  const resolvedSelectedInstallSkillIds = useMemo(
    () => resolveSelectedInstallSkillIds(state, managedSkillIds),
    [managedSkillIds, state]
  )
  const savedManagedSkillIds = useMemo(
    () => buildManagedSkillIds(savedState.selected_role_id, savedState.selected_base_skill_ids),
    [savedState.selected_base_skill_ids, savedState.selected_role_id]
  )
  const savedResolvedSelectedInstallSkillIds = useMemo(
    () => resolveSelectedInstallSkillIds(savedState, savedManagedSkillIds),
    [savedManagedSkillIds, savedState]
  )
  const installCandidateGroups = useMemo(
    () => buildInstallCandidateGroups(state.selected_role_id),
    [state.selected_role_id]
  )
  const credentialFields = useMemo(
    () => getCredentialFields(state.selected_base_skill_ids),
    [state.selected_base_skill_ids]
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
    const baseSkills = !areSameStringSets(
      state.selected_base_skill_ids,
      savedState.selected_base_skill_ids
    )
    const install =
      !areSameStringSets(state.selected_agent_ids, savedState.selected_agent_ids) ||
      !areSameStringSets(
        resolvedSelectedInstallSkillIds,
        savedResolvedSelectedInstallSkillIds
      ) ||
      !areSameStringRecords(state.credential_values, savedState.credential_values)

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
        return normalizeState(updater(current))
      })
      setSaveFeedbacks({})
      setSyncResult(null)
      setSyncError(null)
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    async function loadState() {
      setLoading(true)

      try {
        const result = await invoke<SkillResult<OnboardingState>>('get_onboarding_state')
        if (!cancelled && result.success) {
          const nextState = normalizeState(result.success)
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

  const saveState = useCallback(
    async (scope: string) => {
      const nextState = buildPersistedStateForScope(scope, state, savedState)
      setSavingScope(scope)
      setSyncError(null)

      try {
        const result = await invoke<SkillResult<OnboardingState>>('set_onboarding_state', {
          state: nextState,
        })

        if (result.success) {
          const normalizedState = normalizeState(result.success)
          if (scope === 'role') {
            setState((current) => normalizeState(current))
          } else {
            setState(normalizedState)
          }
          setSavedState(normalizedState)
          setSaveFeedbacks((current) => ({
            ...current,
            [scope]: {
              kind: 'success',
              message: '保存成功',
            },
          }))
          return
        }

        setSaveFeedbacks((current) => ({
          ...current,
          [scope]: {
            kind: 'error',
            message: result.error ?? '保存失败',
          },
        }))
      } catch (error) {
        setSaveFeedbacks((current) => ({
          ...current,
          [scope]: {
            kind: 'error',
            message: String(error),
          },
        }))
      } finally {
        setSavingScope((current) => (current === scope ? null : current))
      }
    },
    [savedState, state]
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
        const nextSelection = reconcileInstallSelection(current, roleId, current.selected_base_skill_ids)

        return {
          ...current,
          selected_role_id: roleId,
          role_use_case_contents: createDefaultRoleUseCaseContents(roleId, current.role_use_case_contents),
          ...nextSelection,
        }
      })
    },
    [updateState]
  )

  const toggleBaseSkill = useCallback(
    (skillId: string) => {
      updateState((current) => {
        const nextBaseSkillIds = current.selected_base_skill_ids.includes(skillId)
          ? current.selected_base_skill_ids.filter((selectedSkillId) => selectedSkillId !== skillId)
          : [...current.selected_base_skill_ids, skillId]
        const nextSelection = reconcileInstallSelection(current, current.selected_role_id, nextBaseSkillIds)
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

  const toggleInstallSkill = useCallback(
    (skillId: string) => {
      updateState((current) => {
        const currentManagedSkillIds = buildManagedSkillIds(
          current.selected_role_id,
          current.selected_base_skill_ids
        )
        const currentSelectedSkillIds = resolveSelectedInstallSkillIds(current, currentManagedSkillIds)

        if (isBaseSkillId(skillId)) {
          const nextBaseSkillIds = current.selected_base_skill_ids.filter(
            (selectedSkillId) => selectedSkillId !== skillId
          )
          const nextSelection = reconcileInstallSelection(current, current.selected_role_id, nextBaseSkillIds)
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
    if (dirty.install) {
      setSyncResult(null)
      setSyncError('请先保存当前安装设置。')
      return
    }

    if (dirty.any) {
      setSyncResult(null)
      setSyncError('请先保存其他页面的设置。')
      return
    }

    setSyncing(true)
    setSyncError(null)

    try {
      const stagedPackages = (
        await Promise.all(
          state.role_use_case_contents.map(async (useCaseContent) => {
            const matchingUseCase = onboardingUseCases.find(
              (useCase) => useCase.id === useCaseContent.use_case_id
            )

            const result = await invoke<SkillResult<StagedOnboardingPackages>>(
              'stage_onboarding_generated_packages',
              {
                input: {
                  role_id: state.selected_role_id,
                  role_name: getRoleNameById(state.selected_role_id),
                  selected_agent_ids: state.selected_agent_ids,
                  selected_base_skill_ids: state.selected_base_skill_ids,
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
            state,
            selected_use_cases: selectedUseCases,
            agents: agentStates,
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
  }, [agentStates, dirty.any, dirty.install, selectedUseCases, state])

  return {
    completion,
    credentialFields,
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
    updateCredentialValue,
    updateUseCaseContent,
    selectRole,
    getUseCaseSaveScope,
  }
}

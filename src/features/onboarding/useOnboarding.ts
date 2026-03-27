import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  buildGeneratedSkillIdsForRoleUseCase,
  createDefaultRoleUseCaseContents,
  getApplicableUseCasesForRole,
  getCredentialFields,
  onboardingBaseSkills,
  onboardingRoles,
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

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function isBaseSkillId(skillId: string) {
  return onboardingBaseSkills.some((skill) => skill.id === skillId)
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
  const selected_agent_ids = sharedConfig.testDefaults.agentApps.filter((agentId) =>
    onboardingSupportedAgents.some((agent) => agent.id === agentId)
  )
  const selected_role_id = sharedConfig.testDefaults.role
  const selected_base_skill_ids = sharedConfig.testDefaults.baseSkills.filter((skillId) =>
    onboardingBaseSkills.some((skill) => skill.id === skillId)
  )

  return {
    selected_agent_ids,
    selected_role_id,
    selected_base_skill_ids,
    role_use_case_contents: createDefaultRoleUseCaseContents(selected_role_id),
    selected_install_skill_ids: [],
    selected_install_skill_ids_initialized: false,
    selected_install_candidate_skill_ids: [],
    credential_values: {},
  }
}

function normalizeState(state: OnboardingState): OnboardingState {
  const selected_role_id = state.selected_role_id || sharedConfig.testDefaults.role || onboardingRoles[0]?.id || ''
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
    role_use_case_contents: createDefaultRoleUseCaseContents(selected_role_id, state.role_use_case_contents),
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

export function useOnboarding(installedSkills: InstalledSkillInfo[]) {
  const [state, setState] = useState<OnboardingState>(() => createEmptyState())
  const [loading, setLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<OnboardingBatchSyncResult | null>(null)
  const [backendPreview, setBackendPreview] = useState<OnboardingInstallPreview | null>(null)

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

  const persistState = useCallback(async (nextState: OnboardingState) => {
    await invoke<SkillResult<OnboardingState>>('set_onboarding_state', { state: nextState })
  }, [])

  const updateState = useCallback(
    async (updater: (current: OnboardingState) => OnboardingState) => {
      setState((current) => {
        const nextState = normalizeState(updater(current))
        void persistState(nextState)
        return nextState
      })
      setSyncResult(null)
      setSyncError(null)
    },
    [persistState]
  )

  useEffect(() => {
    let cancelled = false

    async function loadState() {
      setLoading(true)

      try {
        const result = await invoke<SkillResult<OnboardingState>>('get_onboarding_state')
        if (!cancelled && result.success) {
          setState(normalizeState(result.success))
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

  const toggleAgent = useCallback(
    async (agentId: string) => {
      await updateState((current) => ({
        ...current,
        selected_agent_ids: current.selected_agent_ids.includes(agentId)
          ? current.selected_agent_ids.filter((selectedAgentId) => selectedAgentId !== agentId)
          : [...current.selected_agent_ids, agentId],
      }))
    },
    [updateState]
  )

  const selectRole = useCallback(
    async (roleId: string) => {
      await updateState((current) => {
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
    async (skillId: string) => {
      await updateState((current) => {
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
    async (
      useCaseId: string,
      field: keyof Pick<OnboardingEditableUseCaseRecord, 'description' | 'info_sources' | 'rules'>,
      value: string
    ) => {
      await updateState((current) => ({
        ...current,
        role_use_case_contents: current.role_use_case_contents.map((record) =>
          record.use_case_id === useCaseId ? { ...record, [field]: value } : record
        ),
      }))
    },
    [updateState]
  )

  const toggleInstallSkill = useCallback(
    async (skillId: string) => {
      await updateState((current) => {
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
    async (fieldId: string, value: string) => {
      await updateState((current) => ({
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
                  role_name:
                    onboardingRoles.find((role) => role.id === state.selected_role_id)?.name ??
                    state.selected_role_id,
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
  }, [agentStates, selectedUseCases, state])

  return {
    credentialFields,
    installCandidateGroups,
    loading,
    preview,
    previewError,
    selectedUseCases,
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
  }
}

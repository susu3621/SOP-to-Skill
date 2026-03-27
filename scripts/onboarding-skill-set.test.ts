// @vitest-environment node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadOnboardingSkillSet() {
  return require('./lib/onboarding-skill-set.cjs') as {
    getOnboardingGeneratedSkillIds: (input: {
      roleKey: string
      useCaseDirectory: string
    }) => {
      productionSkillId: string
      testSkillId: string
    }
    getDefaultOnboardingGeneratedInstallCandidates: (input: {
      selectedRole: { id: string; name: string } | null
      sharedConfig: {
        useCases: Record<string, { directory: string }>
      }
      useCases: Array<{
        applicableRoleIds: string[]
        name: string
      }>
    }) => string[]
  }
}

describe('onboarding skill set helpers', () => {
  it('derives production and test ids for the same role/use-case pair', () => {
    const { getOnboardingGeneratedSkillIds } = loadOnboardingSkillSet()

    expect(
      getOnboardingGeneratedSkillIds({
        roleKey: 'project-manager',
        useCaseDirectory: 'weekly-report',
      })
    ).toEqual({
      productionSkillId: 'project-manager-weekly-report',
      testSkillId: 'test-project-manager-weekly-report',
    })
  })

  it('includes both generated variants for every use case under the selected role', () => {
    const { getDefaultOnboardingGeneratedInstallCandidates } = loadOnboardingSkillSet()

    expect(
      getDefaultOnboardingGeneratedInstallCandidates({
        selectedRole: { id: 'project-manager', name: '项目经理' },
        sharedConfig: {
          useCases: {
            项目周报: { directory: 'weekly-report' },
            项目计划: { directory: 'planning' },
            日志记录: { directory: 'daily-log' },
          },
        },
        useCases: [
          { applicableRoleIds: ['project-manager'], name: '项目周报' },
          { applicableRoleIds: ['project-manager', 'qa-manager'], name: '项目计划' },
          { applicableRoleIds: ['sales-manager'], name: '日志记录' },
        ],
      })
    ).toEqual([
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
      'project-manager-planning',
      'test-project-manager-planning',
    ])
  })
})

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
      roleKey: string
      useCaseDirectory: string
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

  it('includes both generated variants in the default install candidates', () => {
    const { getDefaultOnboardingGeneratedInstallCandidates } = loadOnboardingSkillSet()

    expect(
      getDefaultOnboardingGeneratedInstallCandidates({
        roleKey: 'project-manager',
        useCaseDirectory: 'weekly-report',
      })
    ).toEqual(['project-manager-weekly-report', 'test-project-manager-weekly-report'])
  })
})

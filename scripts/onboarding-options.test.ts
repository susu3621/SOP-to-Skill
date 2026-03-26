// @vitest-environment node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadOptions() {
  return require('./lib/onboarding-options.cjs') as {
    parseOnboardingArgs: (args: string[]) => {
      buildSkill: boolean
      headless: boolean
      localOnly: boolean
      outputDir: string
      hasOptions: boolean
    }
  }
}

describe('parseOnboardingArgs', () => {
  it('defaults buildSkill to true when no explicit flag is provided', () => {
    const { parseOnboardingArgs } = loadOptions()

    expect(parseOnboardingArgs([]).buildSkill).toBe(true)
  })

  it('keeps buildSkill enabled when --build-skill is provided', () => {
    const { parseOnboardingArgs } = loadOptions()

    expect(parseOnboardingArgs(['--build-skill']).buildSkill).toBe(true)
  })

  it('treats --local-only as a non-interactive mode switch', () => {
    const { parseOnboardingArgs } = loadOptions()

    const options = parseOnboardingArgs(['--local-only'])

    expect(options.localOnly).toBe(true)
    expect(options.hasOptions).toBe(true)
  })
})

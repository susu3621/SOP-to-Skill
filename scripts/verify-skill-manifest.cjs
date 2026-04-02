#!/usr/bin/env node

const path = require('node:path')
const {
  loadPreviousManifestFromRef,
  loadSkillManifest,
  validateSkillManifest,
} = require('./lib/skill-manifest.cjs')

function parseBaseRef(argv) {
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--base-ref') {
      return argv[index + 1]
    }
  }

  return process.env.SKILL_MANIFEST_BASE_REF || process.env.GITHUB_EVENT_BEFORE || undefined
}

function main() {
  const repoRoot = process.cwd()
  const baseRef = parseBaseRef(process.argv)
  const currentManifest = loadSkillManifest({ repoRoot })
  const previousManifest = loadPreviousManifestFromRef({ repoRoot, ref: baseRef })
  const errors = validateSkillManifest({
    repoRoot,
    currentManifest,
    previousManifest,
  })

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`skill manifest verification failed: ${error}`)
    }
    process.exit(1)
  }

  const manifestPath = path.join(repoRoot, 'skills', 'manifest.json')
  console.log(`skill manifest verified: ${manifestPath}`)
}

main()

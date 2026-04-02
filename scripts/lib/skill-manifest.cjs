const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const MANIFEST_RELATIVE_PATH = path.join('skills', 'manifest.json')
const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const IGNORED_BASENAMES = new Set([
  '.DS_Store',
  '__pycache__',
  '.pytest_cache',
])

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function assertManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('skill manifest must be an object')
  }

  if (!Array.isArray(manifest.skills)) {
    throw new Error('skill manifest must contain a skills array')
  }

  return manifest
}

function loadSkillManifest({ repoRoot, manifestPath } = {}) {
  const resolvedPath =
    manifestPath ?? path.join(repoRoot ?? process.cwd(), MANIFEST_RELATIVE_PATH)
  const content = fs.readFileSync(resolvedPath, 'utf8')
  return assertManifestShape(JSON.parse(content))
}

function collectSkillFiles(skillDir, currentDir = skillDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (IGNORED_BASENAMES.has(entry.name)) {
      continue
    }

    const absolutePath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSkillFiles(skillDir, absolutePath))
      continue
    }

    if (entry.isFile()) {
      if (entry.name.endsWith('.pyc')) {
        continue
      }

      files.push(toPosixPath(path.relative(skillDir, absolutePath)))
    }
  }

  return files.sort()
}

function computeSkillContentHash({ repoRoot, skillPath }) {
  const absoluteSkillPath = path.join(repoRoot, skillPath)
  const files = collectSkillFiles(absoluteSkillPath)
  const hash = crypto.createHash('sha256')

  for (const relativeFile of files) {
    hash.update(`file:${relativeFile}\n`)
    hash.update(fs.readFileSync(path.join(absoluteSkillPath, relativeFile)))
    hash.update('\n')
  }

  return `sha256:${hash.digest('hex')}`
}

function buildSkillMap(manifest) {
  return new Map(
    assertManifestShape(manifest).skills.map((skill) => [skill.id, skill]),
  )
}

function validateSkillManifest({ repoRoot, currentManifest, previousManifest }) {
  const errors = []
  const current = assertManifestShape(currentManifest)
  const previousSkills = previousManifest ? buildSkillMap(previousManifest) : new Map()
  const seenIds = new Set()

  for (const skill of current.skills) {
    if (!skill || typeof skill !== 'object') {
      errors.push('skill entries must be objects')
      continue
    }

    if (!skill.id || typeof skill.id !== 'string') {
      errors.push('skill entries must include a string id')
      continue
    }

    if (seenIds.has(skill.id)) {
      errors.push(`duplicate skill id ${skill.id}`)
    }
    seenIds.add(skill.id)

    if (!skill.path || typeof skill.path !== 'string') {
      errors.push(`missing path for ${skill.id}`)
      continue
    }

    if (!SEMVER_PATTERN.test(skill.version ?? '')) {
      errors.push(`invalid version for ${skill.id}`)
    }

    if (!Array.isArray(skill.targets) || skill.targets.length === 0) {
      errors.push(`missing targets for ${skill.id}`)
    }

    const absoluteSkillPath = path.join(repoRoot, skill.path)
    if (!fs.existsSync(absoluteSkillPath)) {
      errors.push(`missing skill directory for ${skill.id}`)
      continue
    }

    const computedHash = computeSkillContentHash({ repoRoot, skillPath: skill.path })
    if (skill.contentHash !== computedHash) {
      errors.push(`content hash mismatch for ${skill.id}`)
    }

    const previous = previousSkills.get(skill.id)
    if (
      previous &&
      previous.contentHash !== skill.contentHash &&
      previous.version === skill.version
    ) {
      errors.push(`version bump required for ${skill.id}`)
    }
  }

  return errors
}

function loadPreviousManifestFromRef({ repoRoot, ref }) {
  if (!ref) {
    return undefined
  }

  try {
    const content = execFileSync('git', ['show', `${ref}:${MANIFEST_RELATIVE_PATH}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return assertManifestShape(JSON.parse(content))
  } catch {
    return undefined
  }
}

module.exports = {
  MANIFEST_RELATIVE_PATH,
  computeSkillContentHash,
  loadPreviousManifestFromRef,
  loadSkillManifest,
  validateSkillManifest,
}

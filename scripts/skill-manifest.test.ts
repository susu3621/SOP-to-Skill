// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadSkillManifestLib() {
  return require('./lib/skill-manifest.cjs') as {
    computeSkillContentHash: (input: { repoRoot: string; skillPath: string }) => string
    loadSkillManifest: (input: { repoRoot: string; manifestPath?: string }) => {
      schemaVersion: number
      skills: Array<{
        id: string
        path: string
        version: string
        contentHash: string
        targets: string[]
        category?: string
      }>
    }
    validateSkillManifest: (input: {
      repoRoot: string
      currentManifest: {
        schemaVersion: number
        skills: Array<{
          id: string
          path: string
          version: string
          contentHash: string
          targets: string[]
          category?: string
        }>
      }
      previousManifest?: {
        schemaVersion: number
        skills: Array<{
          id: string
          path: string
          version: string
          contentHash: string
          targets: string[]
          category?: string
        }>
      }
    }) => string[]
  }
}

function tempRepoRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `skill-manifest-${name}-`))
}

function writeSkill(repoRoot: string, skillId: string, contents: Record<string, string>) {
  const skillDir = path.join(repoRoot, 'skills', skillId)
  fs.mkdirSync(skillDir, { recursive: true })

  for (const [relativePath, value] of Object.entries(contents)) {
    const filePath = path.join(skillDir, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, value)
  }
}

describe('skill manifest validation', () => {
  it('ignores generated Python cache files when hashing skill content', () => {
    const repoRoot = tempRepoRoot('ignore-python-cache')
    writeSkill(repoRoot, 'jira', {
      'SKILL.md': '# Jira\n',
      'scripts/search_jira.py': "print('jira')\n",
    })

    const { computeSkillContentHash } = loadSkillManifestLib()
    const cleanHash = computeSkillContentHash({
      repoRoot,
      skillPath: 'skills/jira',
    })

    writeSkill(repoRoot, 'jira', {
      'scripts/__pycache__/search_jira.cpython-313.pyc': 'compiled',
      '.pytest_cache/README.md': 'cache',
    })

    expect(
      computeSkillContentHash({
        repoRoot,
        skillPath: 'skills/jira',
      }),
    ).toBe(cleanHash)
  })

  it('fails when the manifest hash does not match the packaged files', () => {
    const repoRoot = tempRepoRoot('hash-mismatch')
    writeSkill(repoRoot, 'jira', {
      'SKILL.md': '# Jira\n',
      'scripts/search_jira.py': "print('jira')\n",
    })

    const { validateSkillManifest } = loadSkillManifestLib()

    expect(
      validateSkillManifest({
        repoRoot,
        currentManifest: {
          schemaVersion: 1,
          skills: [
            {
              id: 'jira',
              path: 'skills/jira',
              version: '1.0.0',
              contentHash: 'sha256:does-not-match',
              targets: ['codex'],
            },
          ],
        },
      }),
    ).toContain('content hash mismatch for jira')
  })

  it('fails when skill content changed without a version bump', () => {
    const repoRoot = tempRepoRoot('version-bump')
    writeSkill(repoRoot, 'jira', {
      'SKILL.md': '# Jira\n',
      'scripts/search_jira.py': "print('new-version')\n",
    })

    const { computeSkillContentHash, validateSkillManifest } = loadSkillManifestLib()
    const currentHash = computeSkillContentHash({
      repoRoot,
      skillPath: 'skills/jira',
    })

    expect(
      validateSkillManifest({
        repoRoot,
        currentManifest: {
          schemaVersion: 1,
          skills: [
            {
              id: 'jira',
              path: 'skills/jira',
              version: '1.0.0',
              contentHash: currentHash,
              targets: ['codex'],
            },
          ],
        },
        previousManifest: {
          schemaVersion: 1,
          skills: [
            {
              id: 'jira',
              path: 'skills/jira',
              version: '1.0.0',
              contentHash: 'sha256:previous-hash',
              targets: ['codex'],
            },
          ],
        },
      }),
    ).toContain('version bump required for jira')
  })

  it('loads a manifest file from disk', () => {
    const repoRoot = tempRepoRoot('load')
    const manifestPath = path.join(repoRoot, 'skills', 'manifest.json')
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          skills: [
            {
              id: 'jira',
              path: 'skills/jira',
              version: '1.2.3',
              contentHash: 'sha256:test',
              targets: ['codex'],
              category: 'version-management',
            },
          ],
        },
        null,
        2,
      ),
    )

    const { loadSkillManifest } = loadSkillManifestLib()

    expect(loadSkillManifest({ repoRoot })).toEqual({
      schemaVersion: 1,
      skills: [
        {
          id: 'jira',
          path: 'skills/jira',
          version: '1.2.3',
          contentHash: 'sha256:test',
          targets: ['codex'],
          category: 'version-management',
        },
      ],
    })
  })

  it('ships gerrit, svn, and linux under the expected repository skill categories', () => {
    const { loadSkillManifest } = loadSkillManifestLib()
    const manifest = loadSkillManifest({ repoRoot: process.cwd() })

    expect(manifest.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gerrit',
          path: 'skills/gerrit',
          category: 'version-management',
        }),
        expect.objectContaining({
          id: 'svn',
          path: 'skills/svn',
          category: 'version-management',
        }),
        expect.objectContaining({
          id: 'linux',
          path: 'skills/linux',
          category: 'host-ops',
        }),
      ]),
    )
  })

  it('matches current repository skill hashes after packaged skill docs change', () => {
    const { loadSkillManifest, validateSkillManifest } = loadSkillManifestLib()
    const manifest = loadSkillManifest({ repoRoot: process.cwd() })

    expect(
      validateSkillManifest({
        repoRoot: process.cwd(),
        currentManifest: manifest,
      }),
    ).toEqual([])
  })
})

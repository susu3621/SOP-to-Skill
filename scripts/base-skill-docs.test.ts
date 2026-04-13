// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

function readSkillDoc(skillId: string) {
  return fs.readFileSync(path.join(repoRoot, 'skills', skillId, 'SKILL.md'), 'utf8')
}

describe('base skill documentation contract', () => {
  const commonGuidance = [
    '## Required Environment',
    '## Missing Environment Handling',
    'ask the user for confirmation',
    'install the missing dependency automatically',
  ]

  const baseSkills = [
    {
      id: 'confluence',
      expectedSnippets: ['python3', 'scripts/requirements.txt', 'CONFLUENCE_*'],
    },
    {
      id: 'jira',
      expectedSnippets: ['python3', 'scripts/requirements.txt', 'JIRA_URL'],
    },
    {
      id: 'gerrit',
      expectedSnippets: ['git', 'ssh', 'python3', 'GERRIT_AUTH_MODE'],
    },
    {
      id: 'svn',
      expectedSnippets: ['svn', 'python3', 'SVN_URL'],
    },
    {
      id: 'mail',
      expectedSnippets: ['python3', 'scripts/requirements.txt', 'MAIL_HOST'],
    },
  ] as const

  it.each(baseSkills)(
    'documents environment checks and confirm-before-install flow for $id',
    ({ id, expectedSnippets }) => {
      const content = readSkillDoc(id)

      for (const snippet of commonGuidance) {
        expect(content).toContain(snippet)
      }

      for (const snippet of expectedSnippets) {
        expect(content).toContain(snippet)
      }
    },
  )
})

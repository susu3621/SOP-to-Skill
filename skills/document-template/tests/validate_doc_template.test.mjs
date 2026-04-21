import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createTempWorkspace,
  runSkillScript,
  writeFixtureTemplate,
  writeJsonFixture,
} from './helpers.mjs'

test('validate_doc_template succeeds when template tags are covered by the json input', () => {
  const workspaceDir = createTempWorkspace('document-template-validate-success')
  const templatePath = writeFixtureTemplate(workspaceDir)
  const dataPath = writeJsonFixture(workspaceDir, {
    report_no: '8D-2026-001',
    customer: '示例客户',
    team: [
      { name: '张三', role: '质量' },
      { name: '李四', role: '工艺' },
    ],
    d1_team: '已成立跨部门 8D 小组。',
    d2_problem: '客户端反馈批次异常。',
    d3_containment: '已隔离库存。',
  })

  const result = runSkillScript('validate_doc_template.js', [
    '--template',
    templatePath,
    '--data',
    dataPath,
  ])

  assert.equal(result.status, 0)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.success, true)
  assert.deepEqual(parsed.missingTags, [])
})

test('validate_doc_template reports missing tags when the json input is incomplete', () => {
  const workspaceDir = createTempWorkspace('document-template-validate-missing')
  const templatePath = writeFixtureTemplate(workspaceDir)
  const dataPath = writeJsonFixture(workspaceDir, {
    report_no: '8D-2026-001',
    customer: '示例客户',
    team: [{ name: '张三' }],
    d1_team: '已成立跨部门 8D 小组。',
    d2_problem: '客户端反馈批次异常。',
  })

  const result = runSkillScript('validate_doc_template.js', [
    '--template',
    templatePath,
    '--data',
    dataPath,
  ])

  assert.equal(result.status, 1)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.success, false)
  assert.deepEqual(parsed.missingTags.sort(), ['d3_containment', 'team.role'])
})

test('validate_doc_template reports a pdf dependency error when pdf output is requested without libreoffice', () => {
  const workspaceDir = createTempWorkspace('document-template-validate-pdf')
  const templatePath = writeFixtureTemplate(workspaceDir)
  const dataPath = writeJsonFixture(workspaceDir, {
    report_no: '8D-2026-001',
    customer: '示例客户',
    team: [{ name: '张三', role: '质量' }],
    d1_team: '已成立跨部门 8D 小组。',
    d2_problem: '客户端反馈批次异常。',
    d3_containment: '已隔离库存。',
  })

  const result = runSkillScript(
    'validate_doc_template.js',
    [
      '--template',
      templatePath,
      '--data',
      dataPath,
      '--format',
      'pdf',
    ],
    {
      env: {
        PATH: '',
      },
    }
  )

  assert.equal(result.status, 1)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.success, false)
  assert.match(parsed.errors.join('\n'), /libreoffice|soffice/i)
})

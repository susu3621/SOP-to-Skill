import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import {
  buildOutputPath,
  createTempWorkspace,
  runSkillScript,
  writeFixtureTemplate,
  writeJsonFixture,
} from './helpers.mjs'

test('render_doc_template renders a docx file from a template and json data', () => {
  const workspaceDir = createTempWorkspace('document-template-render')
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
  const outputPath = buildOutputPath(workspaceDir, 'rendered.docx')

  const result = runSkillScript('render_doc_template.js', [
    '--template',
    templatePath,
    '--data',
    dataPath,
    '--output',
    outputPath,
  ])

  assert.equal(result.status, 0)
  assert.equal(existsSync(outputPath), true)

  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.success, true)
  assert.equal(parsed.docxPath, outputPath)
  assert.equal(parsed.pdfPath, null)
})

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const DOCX_TEMPLATE_BASE64 =
  'UEsDBBQAAAAIAJqMlVzXeYTq8QAAALgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QzU7DMBCE730Ky9cqccoBIZSkB36OwKE8wMreJFb9J69b2rdn00KREOVozXwz62nXB+/EHjPZGDq5qhspMOhobBg7+b55ru6koALBgIsBO3lEkut+0W6OCUkwHKiTUynpXinSE3qgOiYMrAwxeyj8zKNKoLcworppmlulYygYSlXmDNkvhGgfcYCdK+LpwMr5loyOpHg4e+e6TkJKzmoorKt9ML+Kqq+SmsmThyabaMkGqa6VzOL1jh/0lSfK1qB4g1xewLNRfcRslIl65xmu/0/649o4DFbjhZ/TUo4aiXh77+qL4sGG71+06jR8/wlQSwMEFAAAAAgAmoyVXCAbhuqyAAAALgEAAAsAAABfcmVscy8ucmVsc43Puw6CMBQG4J2naM4uBQdjDIXFmLAafICmPZRGeklbL7y9HRzEODie23fyN93TzOSOIWpnGdRlBQStcFJbxeAynDZ7IDFxK/nsLDJYMELXFs0ZZ57yTZy0jyQjNjKYUvIHSqOY0PBYOo82T0YXDE+5DIp6Lq5cId1W1Y6GTwPagpAVS3rJIPSyBjIsHv/h3ThqgUcnbgZt+vHlayPLPChMDB4uSCrf7TKzQHNKuorZvgBQSwMEFAAAAAgAmoyVXAECAr8sAgAANAcAABEAAAB3b3JkL2RvY3VtZW50LnhtbKVVwY7aMBC971dY6RmSAN2iCNjDoq720GrVbc/IOE5ibeyxbIeUov33jhMgoFYoLBdnRuP35s1MbM8efsuSbLixAtQ8iIdRQLhikAqVz4NfP78OpgGxjqqUlqD4PNhyGzws7mZ1kgKrJFeOIIOySa3ZPCic00kYWlZwSe1QCmbAQuaGDGQIWSYYD2swaTiK4qixtAHGrcV0j1RtqA32dPJfNtBcYTADI6lD1+ShpOat0gNk19SJtSiF2yJ3dH+ggXlQGZXsKQZHQR6StIL2nwPC9MnbQpb7DjQZQ8NL1ADKFkJ3ZXyUDYPFgWRzqYiNLIPjCOLJbTNYGlrjpyPsIz9tQbJslV9mjKMeE/EUR0QfCec5D0okFapL/KHWnDY3v623TwYq3bGJ29ie1duRy5/LK7j2Mzotzd4m5rWgGg+QZMlzrsDQdYmKsOPE/5HB4o4QvC/WkG692Th6gYvxi1v84BqMI98hITvT2CsF77PQx/xqmlX/F/tYWQeSG4SyvdkTufvkOJU9Nw/ITlHJ30mIEqHkfXOEV+RYxlhEGq+ugYw8ZLTCSWDLe6PGHjVeMVAOT4i/cy4gLWfuxbRuS5W//iG1P5fxaDTB96JOCrQ/T9EOz/Z9owaDDvAWiSftTiPywnXuGhzOrPNLnp1EC05Tjvfxl2jq3QzAnbh55Rr3PCuD0mLQasp4u/U0im/WkxGpzyQUfxGOofTx/ZHCl94V7L32r/XW4b1b/AVQSwECFAMUAAAACACajJVc13mE6vEAAAC4AQAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAIAJqMlVwgG4bqsgAAAC4BAAALAAAAAAAAAAAAAACAASIBAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAJqMlVwBAgK/LAIAADQHAAARAAAAAAAAAAAAAACAAf0BAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAABYBAAAAAA='

export function createTempWorkspace(prefix) {
  return mkdtempSync(path.join(tmpdir(), `${prefix}-`))
}

export function writeFixtureTemplate(workspaceDir, filename = 'template.docx') {
  const templatePath = path.join(workspaceDir, filename)
  writeFileSync(templatePath, Buffer.from(DOCX_TEMPLATE_BASE64, 'base64'))
  return templatePath
}

export function writeJsonFixture(workspaceDir, data, filename = 'data.json') {
  const jsonPath = path.join(workspaceDir, filename)
  writeFileSync(jsonPath, JSON.stringify(data, null, 2))
  return jsonPath
}

export function buildOutputPath(workspaceDir, filename) {
  mkdirSync(workspaceDir, { recursive: true })
  return path.join(workspaceDir, filename)
}

export function runSkillScript(scriptName, args, options = {}) {
  const scriptPath = path.resolve(
    process.cwd(),
    'skills/document-template/scripts',
    scriptName
  )

  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  })
}

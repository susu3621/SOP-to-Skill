import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

import { convertDocxToPdf, ensurePdfConverterAvailable } from './pdf.js'
import { renderDocxTemplate } from './render.js'

const require = createRequire(import.meta.url)
const Docxtemplater = require('docxtemplater')
const PizZip = require('pizzip')
const InspectModule = require('docxtemplater/js/inspect-module.js')

function parseCliArgs(args) {
  const options = {
    format: 'docx',
    templatePath: '',
    dataPath: '',
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case '--template':
        options.templatePath = args[index + 1] ?? ''
        index += 1
        break
      case '--data':
        options.dataPath = args[index + 1] ?? ''
        index += 1
        break
      case '--format':
        options.format = args[index + 1] ?? 'docx'
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!options.templatePath) {
    throw new Error('Missing required argument: --template')
  }

  if (!options.dataPath) {
    throw new Error('Missing required argument: --data')
  }

  if (!['docx', 'pdf'].includes(options.format)) {
    throw new Error(`Unsupported format: ${options.format}`)
  }

  return {
    ...options,
    templatePath: path.resolve(options.templatePath),
    dataPath: path.resolve(options.dataPath),
  }
}

function formatError(error) {
  if (error instanceof Error) {
    const properties = error.properties

    if (properties?.errors?.length) {
      return properties.errors
        .map((item) => item.properties?.explanation || item.message)
        .join('; ')
    }

    if (properties?.explanation) {
      return properties.explanation
    }

    return error.message
  }

  return String(error)
}

async function readJsonFile(jsonPath) {
  const content = await readFile(jsonPath, 'utf8')
  return JSON.parse(content)
}

function flattenTagTree(tags, prefix = '') {
  const flattened = []

  for (const [key, value] of Object.entries(tags ?? {})) {
    const nextPath = prefix ? `${prefix}.${key}` : key
    const childEntries =
      value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []

    if (childEntries.length === 0) {
      flattened.push(nextPath)
      continue
    }

    flattened.push(...flattenTagTree(value, nextPath))
  }

  return flattened
}

function hasValueAtPath(source, pathSegments) {
  if (pathSegments.length === 0) {
    return source !== undefined && source !== null
  }

  if (Array.isArray(source)) {
    return source.every((item) => hasValueAtPath(item, pathSegments))
  }

  if (!source || typeof source !== 'object') {
    return false
  }

  const [segment, ...rest] = pathSegments

  if (!(segment in source)) {
    return false
  }

  return hasValueAtPath(source[segment], rest)
}

export async function inspectTemplateTags(templatePath) {
  const templateBinary = await readFile(templatePath)
  const zip = new PizZip(templateBinary)
  const inspectModule = InspectModule()

  new Docxtemplater(zip, {
    modules: [inspectModule],
    linebreaks: true,
    paragraphLoop: true,
  })

  const tags = inspectModule.getAllTags()
  return Array.from(new Set(flattenTagTree(tags))).sort()
}

export async function validateTemplate({
  templatePath,
  dataPath,
  format = 'docx',
}) {
  const data = await readJsonFile(dataPath)
  const tagPaths = await inspectTemplateTags(templatePath)
  const missingTags = tagPaths.filter((tagPath) => !hasValueAtPath(data, tagPath.split('.')))

  if (missingTags.length > 0) {
    return {
      success: false,
      templatePath,
      dataPath,
      requestedFormat: format,
      missingTags,
      renderedDocx: null,
      renderedPdf: null,
      warnings: [],
      errors: ['Missing template data for required tags.'],
    }
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'document-template-validate-'))
  const renderedDocx = path.join(tempDir, 'validation-output.docx')
  let renderedPdf = null

  try {
    await renderDocxTemplate(templatePath, data, renderedDocx)
  } catch (error) {
    return {
      success: false,
      templatePath,
      dataPath,
      requestedFormat: format,
      missingTags: [],
      renderedDocx: null,
      renderedPdf: null,
      warnings: [],
      errors: [formatError(error)],
    }
  }

  if (format === 'pdf') {
    try {
      ensurePdfConverterAvailable()
      renderedPdf = path.join(tempDir, 'validation-output.pdf')
      await convertDocxToPdf(renderedDocx, renderedPdf)
    } catch (error) {
      return {
        success: false,
        templatePath,
        dataPath,
        requestedFormat: format,
        missingTags: [],
        renderedDocx,
        renderedPdf,
        warnings: [],
        errors: [formatError(error)],
      }
    }
  }

  return {
    success: true,
    templatePath,
    dataPath,
      requestedFormat: format,
      missingTags: [],
      renderedDocx,
      renderedPdf,
      warnings: [],
      errors: [],
  }
}

export async function validateTemplateFromCli(args) {
  try {
    const options = parseCliArgs(args)
    const result = await validateTemplate(options)
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return result.success ? 0 : 1
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        success: false,
        templatePath: null,
        dataPath: null,
        requestedFormat: null,
        missingTags: [],
        renderedDocx: null,
        renderedPdf: null,
        warnings: [],
        errors: [formatError(error)],
      })}\n`
    )
    return 1
  }
}

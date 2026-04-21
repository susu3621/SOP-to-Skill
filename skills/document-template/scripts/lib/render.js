import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import { convertDocxToPdf } from './pdf.js'

const require = createRequire(import.meta.url)
const Docxtemplater = require('docxtemplater')
const PizZip = require('pizzip')

function resolveTagValue(source, tag) {
  if (tag === '.') {
    return source
  }

  return tag.split('.').reduce((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined
    }

    return current[segment]
  }, source)
}

function buildDotPathParser() {
  return (tag) => {
    const normalizedTag = tag.trim()

    return {
      get(scope, context) {
        const directValue = resolveTagValue(scope, normalizedTag)

        if (directValue !== undefined) {
          return directValue
        }

        const scopes = Array.isArray(context?.scopeList) ? context.scopeList : []
        for (let index = scopes.length - 1; index >= 0; index -= 1) {
          const scopedValue = resolveTagValue(scopes[index], normalizedTag)
          if (scopedValue !== undefined) {
            return scopedValue
          }
        }

        return undefined
      },
    }
  }
}

function parseCliArgs(args) {
  const options = {
    format: 'docx',
    keepDocx: false,
    templatePath: '',
    dataPath: '',
    outputPath: '',
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
      case '--output':
        options.outputPath = args[index + 1] ?? ''
        index += 1
        break
      case '--format':
        options.format = args[index + 1] ?? 'docx'
        index += 1
        break
      case '--keep-docx':
        options.keepDocx = true
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

  if (!options.outputPath) {
    throw new Error('Missing required argument: --output')
  }

  if (!['docx', 'pdf'].includes(options.format)) {
    throw new Error(`Unsupported format: ${options.format}`)
  }

  return {
    ...options,
    templatePath: path.resolve(options.templatePath),
    dataPath: path.resolve(options.dataPath),
    outputPath: path.resolve(options.outputPath),
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

export async function renderDocxTemplate(templatePath, data, outputPath) {
  const templateBinary = await readFile(templatePath)
  const zip = new PizZip(templateBinary)
  const document = new Docxtemplater(zip, {
    linebreaks: true,
    paragraphLoop: true,
    parser: buildDotPathParser(),
  })

  document.render(data)

  const buffer = document.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, buffer)

  return outputPath
}

function buildDocxPathForPdf(outputPath, keepDocx) {
  if (keepDocx) {
    return outputPath.replace(/\.pdf$/iu, '.docx')
  }

  return path.join(
    tmpdir(),
    `document-template-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`
  )
}

export async function renderDocument({
  templatePath,
  dataPath,
  outputPath,
  format = 'docx',
  keepDocx = false,
}) {
  const data = await readJsonFile(dataPath)

  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`)
  }

  let docxPath = outputPath
  let pdfPath = null

  if (format === 'pdf') {
    docxPath = buildDocxPathForPdf(outputPath, keepDocx)
    pdfPath = outputPath
  }

  await renderDocxTemplate(templatePath, data, docxPath)

  if (format === 'pdf' && pdfPath) {
    await convertDocxToPdf(docxPath, pdfPath)

    if (!keepDocx) {
      await unlink(docxPath).catch(() => {})
      docxPath = null
    }
  }

  return {
    success: true,
    docxPath,
    pdfPath,
    errors: [],
  }
}

export async function renderDocumentFromCli(args) {
  try {
    const options = parseCliArgs(args)
    const result = await renderDocument(options)
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return 0
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        success: false,
        docxPath: null,
        pdfPath: null,
        errors: [formatError(error)],
      })}\n`
    )
    return 1
  }
}

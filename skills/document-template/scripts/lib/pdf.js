import { existsSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const pdfConverterCommands = ['libreoffice', 'soffice']

function runCommand(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
  })
}

export function findPdfConverterCommand() {
  for (const command of pdfConverterCommands) {
    const result = runCommand(command, ['--version'])

    if (result.status === 0) {
      return command
    }
  }

  return null
}

export function ensurePdfConverterAvailable() {
  const command = findPdfConverterCommand()

  if (!command) {
    throw new Error(
      'PDF conversion requires libreoffice or soffice in PATH. Install LibreOffice to enable --format pdf.'
    )
  }

  return command
}

export async function convertDocxToPdf(inputPath, outputPath) {
  const command = ensurePdfConverterAvailable()
  const outputDir = path.dirname(outputPath)
  const defaultPdfPath = path.join(
    outputDir,
    `${path.basename(inputPath, path.extname(inputPath))}.pdf`
  )

  await mkdir(outputDir, { recursive: true })

  const result = runCommand(command, [
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ])

  if (result.status !== 0) {
    throw new Error(
      `PDF conversion failed with ${command}: ${result.stderr || result.stdout || 'unknown error'}`
    )
  }

  if (!existsSync(defaultPdfPath)) {
    throw new Error(`PDF conversion did not produce an output file for ${inputPath}`)
  }

  if (defaultPdfPath !== outputPath) {
    await rename(defaultPdfPath, outputPath)
  }

  return outputPath
}

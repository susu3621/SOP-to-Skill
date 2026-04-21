#!/usr/bin/env node

import { renderDocumentFromCli } from './lib/render.js'

process.exitCode = await renderDocumentFromCli(process.argv.slice(2))

#!/usr/bin/env node

import { validateTemplateFromCli } from './lib/inspect.js'

process.exitCode = await validateTemplateFromCli(process.argv.slice(2))

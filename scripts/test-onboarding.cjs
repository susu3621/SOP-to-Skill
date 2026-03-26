#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  parseManagerArgs,
  renderHelp,
  runConfigManager,
} = require('./lib/onboarding-manager.cjs');

const SHARED_CONFIG_PATH = path.resolve(__dirname, '../src/shared/config.json');

function loadSharedConfig() {
  try {
    return JSON.parse(fs.readFileSync(SHARED_CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.error(`无法读取共享配置: ${SHARED_CONFIG_PATH}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  let args;
  try {
    args = parseManagerArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('\n使用 --help 查看帮助。');
    process.exit(1);
  }

  if (args.help) {
    console.log(renderHelp());
    return;
  }

  await runConfigManager({
    forceReinstall: args.forceReinstall,
    sharedConfig: loadSharedConfig(),
    storageDir: args.storageDir,
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

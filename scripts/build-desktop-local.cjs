#!/usr/bin/env node
const { runBuildDesktopLocal } = require('./lib/build-desktop-local.cjs');

const requestedTarget = process.argv[2];

if (!requestedTarget) {
  console.error('Usage: node scripts/build-desktop-local.cjs <macos|windows>');
  process.exitCode = 1;
} else {
  runBuildDesktopLocal({ targetPlatform: requestedTarget })
    .then(({ outputPath, platform }) => {
      console.log(`Local ${platform} desktop artifact copied to ${outputPath}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

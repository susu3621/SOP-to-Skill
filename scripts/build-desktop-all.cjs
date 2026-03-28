#!/usr/bin/env node
const { runBuildDesktopAll } = require('./lib/build-desktop-all.cjs');

runBuildDesktopAll().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

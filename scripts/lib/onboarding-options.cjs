function parseOnboardingArgs(args) {
  const hasOptions = args.some(
    (arg) =>
      arg === '--role' ||
      arg === '--base-skills' ||
      arg === '--config' ||
      arg === '--use-case' ||
      arg === '--list-presets' ||
      arg === '--local-only'
  );

  let headless = true;
  let buildSkill = true;
  let localOnly = false;
  let outputDir = './test-output';

  if (args.includes('--headed')) headless = false;
  if (args.includes('--headless')) headless = true;
  if (args.includes('--build-skill')) buildSkill = true;
  if (args.includes('--local-only')) localOnly = true;

  const outputIdx = args.indexOf('--output');
  if (outputIdx >= 0 && args[outputIdx + 1]) {
    outputDir = args[outputIdx + 1];
  }

  return {
    buildSkill,
    hasOptions,
    headless,
    localOnly,
    outputDir,
  };
}

module.exports = {
  parseOnboardingArgs,
};

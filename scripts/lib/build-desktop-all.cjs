const path = require('node:path');

function buildWorkflowRunArgs({ workflowFile, branch }) {
  return ['workflow', 'run', workflowFile, '--ref', branch];
}

function selectWorkflowRun(runs, { workflowName, branch, expectedHeadSha, triggerTime }) {
  const matches = runs.filter((run) => {
    return (
      run.workflowName === workflowName &&
      run.event === 'workflow_dispatch' &&
      run.headBranch === branch &&
      run.headSha === expectedHeadSha &&
      run.createdAt >= triggerTime
    );
  });

  if (matches.length === 0) {
    throw new Error(`No workflow run matched ${workflowName} for ${branch} @ ${expectedHeadSha}`);
  }

  const earliestMatch = matches.reduce((earliest, run) => {
    if (run.createdAt < earliest.createdAt) {
      return run;
    }

    if (run.createdAt > earliest.createdAt) {
      return earliest;
    }

    return run.id < earliest.id ? run : earliest;
  });

  return earliestMatch.id;
}

function buildArtifactLayout({ repoRoot, runId }) {
  const baseDir = path.join(repoRoot, 'artifacts', 'desktop', String(runId));
  return {
    baseDir,
    macosDir: path.join(baseDir, 'macos'),
    windowsDir: path.join(baseDir, 'windows'),
    manifestPath: path.join(baseDir, 'manifest.json'),
  };
}

function assertRequiredArtifacts(artifacts) {
  const names = new Set(artifacts.map((artifact) => artifact.name));
  for (const required of ['desktop-macos', 'desktop-windows']) {
    if (!names.has(required)) {
      throw new Error(`Missing required artifact: ${required}`);
    }
  }
}

function buildManifest({
  workflowFile,
  runId,
  branch,
  buildCommitSha,
  localHeadSha,
  downloadedAt,
  layout,
}) {
  return {
    workflowFile,
    runId,
    branch,
    buildCommitSha,
    localHeadSha,
    downloadedAt,
    artifacts: {
      macos: { name: 'desktop-macos', path: layout.macosDir },
      windows: { name: 'desktop-windows', path: layout.windowsDir },
    },
  };
}

module.exports = {
  assertRequiredArtifacts,
  buildArtifactLayout,
  buildManifest,
  buildWorkflowRunArgs,
  selectWorkflowRun,
};

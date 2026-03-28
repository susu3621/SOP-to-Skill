const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_FILE = 'build-desktop.yml';
const WORKFLOW_NAME = 'Build Desktop Scaffold';
const RUN_DISCOVERY_ATTEMPTS = 30;
const RUN_DISCOVERY_INTERVAL_MS = 1000;
const RUN_DISCOVERY_CLOCK_SKEW_MS = 5000;

function buildWorkflowRunArgs({ workflowFile, branch }) {
  return ['workflow', 'run', workflowFile, '--ref', branch];
}

function selectWorkflowRun(
  runs,
  { workflowName, branch, expectedHeadSha, triggerTime, ignoredRunIds = [] },
) {
  const ignoredRunIdsSet = new Set(ignoredRunIds);
  const matches = runs.filter((run) => {
    return (
      run.workflowName === workflowName &&
      run.event === 'workflow_dispatch' &&
      run.headBranch === branch &&
      run.headSha === expectedHeadSha &&
      !ignoredRunIdsSet.has(run.id) &&
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

async function runBuildDesktopAll({ system = createNodeSystem() } = {}) {
  system.ensureTool('gh');
  system.ensureTool('git');
  system.ensureTool('npm');
  system.assertGitHubAuth();

  const repoRoot = system.getRepoRoot();
  const branch = system.getCurrentBranch();
  const localHeadSha = system.getHeadSha();
  const remoteHeadSha = system.getRemoteBranchSha(branch);

  if (!remoteHeadSha) {
    throw new Error(`Remote branch not found: ${branch}`);
  }

  if (remoteHeadSha !== localHeadSha) {
    throw new Error(
      `Push ${branch} so origin/${branch} matches local HEAD ${localHeadSha} before running build:desktop:all`,
    );
  }

  if (!system.remoteWorkflowExists({ branch, workflowFile: WORKFLOW_FILE })) {
    throw new Error(`Workflow ${WORKFLOW_FILE} is missing on origin/${branch}`);
  }

  const existingRunIds =
    typeof system.listWorkflowRuns === 'function'
      ? getMatchingWorkflowRunIds(system.listWorkflowRuns(), {
          workflowName: WORKFLOW_NAME,
          branch,
          expectedHeadSha: remoteHeadSha,
        })
      : [];
  const triggerTime = system.now();
  const triggerOutput = system.triggerWorkflow({ workflowFile: WORKFLOW_FILE, branch });

  const runId =
    extractRunIdFromText(triggerOutput) ||
    (await findDispatchedRunId(system, {
      workflowName: WORKFLOW_NAME,
      branch,
      expectedHeadSha: remoteHeadSha,
      triggerTime,
      ignoredRunIds: existingRunIds,
    }));

  const result = await system.waitForRunCompletion({ runId });
  if (result.conclusion !== 'success') {
    throw new Error(`Workflow run ${runId} finished with ${result.conclusion}`);
  }

  if (Array.isArray(result.artifacts)) {
    assertRequiredArtifacts(result.artifacts);
  }

  const layout = buildArtifactLayout({ repoRoot, runId });
  system.ensureDir(layout.macosDir);
  system.ensureDir(layout.windowsDir);

  if (system.isNodeSystem) {
    system.downloadArtifact({ runId, artifactName: 'desktop-macos', outputDir: layout.macosDir });
    system.downloadArtifact({ runId, artifactName: 'desktop-windows', outputDir: layout.windowsDir });
  } else {
    system.downloadArtifact({ artifactName: 'desktop-macos', outputDir: layout.macosDir });
    system.downloadArtifact({ artifactName: 'desktop-windows', outputDir: layout.windowsDir });
  }

  system.writeJson(
    layout.manifestPath,
    buildManifest({
      workflowFile: WORKFLOW_FILE,
      runId,
      branch,
      buildCommitSha: remoteHeadSha,
      localHeadSha,
      downloadedAt: system.now(),
      layout,
    }),
  );
}

function createNodeSystem() {
  return {
    isNodeSystem: true,
    now: () => new Date().toISOString(),
    ensureTool(tool) {
      const lookupCommand = process.platform === 'win32' ? 'where' : 'which';
      const result = childProcess.spawnSync(lookupCommand, [tool], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.error || result.status !== 0) {
        throw new Error(`Missing required tool: ${tool}`);
      }
    },
    assertGitHubAuth() {
      const result = runCommand('gh', ['auth', 'status'], { allowFailure: true });
      if (result.status !== 0) {
        throw new Error('GitHub CLI is not authenticated');
      }
    },
    getRepoRoot() {
      return runCommandText('git', ['rev-parse', '--show-toplevel']);
    },
    getCurrentBranch() {
      return runCommandText('git', ['branch', '--show-current']);
    },
    getHeadSha() {
      return runCommandText('git', ['rev-parse', 'HEAD']);
    },
    getRemoteBranchSha(branch) {
      const output = runCommandText('git', ['ls-remote', '--heads', 'origin', branch], {
        allowFailure: true,
      });
      if (!output) {
        return null;
      }

      return output.split(/\s+/)[0] || null;
    },
    remoteWorkflowExists({ branch, workflowFile }) {
      const result = runCommand(
        'gh',
        ['workflow', 'view', workflowFile, '--ref', branch, '--yaml'],
        { allowFailure: true },
      );
      return result.status === 0;
    },
    triggerWorkflow({ workflowFile, branch }) {
      return runCommandOutput('gh', buildWorkflowRunArgs({ workflowFile, branch }));
    },
    listWorkflowRuns() {
      const output = runCommandText('gh', [
        'run',
        'list',
        '--workflow',
        WORKFLOW_FILE,
        '--json',
        'databaseId,workflowName,event,headBranch,headSha,createdAt',
        '--limit',
        '50',
      ]);
      return JSON.parse(output).map((run) => ({
        id: run.databaseId ?? run.id,
        workflowName: run.workflowName,
        event: run.event,
        headBranch: run.headBranch,
        headSha: run.headSha,
        createdAt: run.createdAt,
      }));
    },
    async waitForRunCompletion({ runId }) {
      for (;;) {
        const output = runCommandText('gh', [
          'run',
          'view',
          String(runId),
          '--json',
          'status,conclusion',
        ]);
        const run = JSON.parse(output);

        if (run.status === 'completed') {
          return {
            conclusion: run.conclusion,
          };
        }

        await delay(5000);
      }
    },
    sleep(milliseconds) {
      return delay(milliseconds);
    },
    ensureDir(dir) {
      fs.mkdirSync(dir, { recursive: true });
    },
    downloadArtifact({ runId, artifactName, outputDir }) {
      if (!runId) {
        throw new Error('downloadArtifact requires a workflow run id');
      }

      runCommandText('gh', [
        'run',
        'download',
        String(runId),
        '--name',
        artifactName,
        '--dir',
        outputDir,
      ]);
    },
    writeJson(filePath, value) {
      fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
    },
  };
}

function runCommand(command, args, { allowFailure = false } = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    throw new Error(details || `Command failed: ${command} ${args.join(' ')}`);
  }

  return result;
}

function runCommandOutput(command, args, options) {
  const result = runCommand(command, args, options);
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function runCommandText(command, args, options) {
  return (runCommand(command, args, options).stdout || '').trim();
}

function getMatchingWorkflowRunIds(runs, { workflowName, branch, expectedHeadSha }) {
  return runs
    .filter((run) => {
      return (
        run.workflowName === workflowName &&
        run.event === 'workflow_dispatch' &&
        run.headBranch === branch &&
        run.headSha === expectedHeadSha
      );
    })
    .map((run) => run.id);
}

async function findDispatchedRunId(
  system,
  { workflowName, branch, expectedHeadSha, triggerTime, ignoredRunIds = [] },
) {
  const earliestAllowedTriggerTime = new Date(
    new Date(triggerTime).getTime() - RUN_DISCOVERY_CLOCK_SKEW_MS,
  ).toISOString();

  for (let attempt = 0; attempt < RUN_DISCOVERY_ATTEMPTS; attempt += 1) {
    try {
      return selectWorkflowRun(system.listWorkflowRuns(), {
        workflowName,
        branch,
        expectedHeadSha,
        triggerTime: earliestAllowedTriggerTime,
        ignoredRunIds,
      });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.startsWith('No workflow run matched') ||
        attempt === RUN_DISCOVERY_ATTEMPTS - 1
      ) {
        throw error;
      }
    }

    if (typeof system.sleep === 'function') {
      await system.sleep(RUN_DISCOVERY_INTERVAL_MS);
    }
  }

  throw new Error(`No workflow run matched ${workflowName} for ${branch} @ ${expectedHeadSha}`);
}

function extractRunIdFromText(output) {
  if (typeof output !== 'string') {
    return null;
  }

  const match = output.match(/\/actions\/runs\/(\d+)/);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

module.exports = {
  assertRequiredArtifacts,
  buildArtifactLayout,
  buildManifest,
  buildWorkflowRunArgs,
  createNodeSystem,
  runBuildDesktopAll,
  selectWorkflowRun,
};

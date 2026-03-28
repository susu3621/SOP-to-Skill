const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_FILE = 'build-desktop.yml';
const WORKFLOW_NAME = 'Build Desktop Scaffold';

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

  if (!system.remoteWorkflowExists({ branch, workflowFile: WORKFLOW_FILE })) {
    throw new Error(`Workflow ${WORKFLOW_FILE} is missing on origin/${branch}`);
  }

  const triggerTime = system.now();
  system.triggerWorkflow({ workflowFile: WORKFLOW_FILE, branch });

  const runId = selectWorkflowRun(system.listWorkflowRuns(), {
    workflowName: WORKFLOW_NAME,
    branch,
    expectedHeadSha: remoteHeadSha,
    triggerTime,
  });

  const result = await system.waitForRunCompletion({ runId });
  if (result.conclusion !== 'success') {
    throw new Error(`Workflow run ${runId} finished with ${result.conclusion}`);
  }

  assertRequiredArtifacts(result.artifacts);

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
      const result = runCommand('git', ['show', `origin/${branch}:.github/workflows/${workflowFile}`], {
        allowFailure: true,
      });
      return result.status === 0;
    },
    triggerWorkflow({ workflowFile, branch }) {
      runCommandText('gh', buildWorkflowRunArgs({ workflowFile, branch }));
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
          'status,conclusion,artifacts',
        ]);
        const run = JSON.parse(output);

        if (run.status === 'completed') {
          return {
            conclusion: run.conclusion,
            artifacts: Array.isArray(run.artifacts)
              ? run.artifacts.map((artifact) => ({ name: artifact.name }))
              : [],
          };
        }

        await delay(5000);
      }
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

function runCommandText(command, args, options) {
  return (runCommand(command, args, options).stdout || '').trim();
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

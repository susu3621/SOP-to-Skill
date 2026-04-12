const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function buildLocalArtifactLayout({ repoRoot, platform }) {
  const baseDir = path.join(repoRoot, 'artifacts', 'desktop', 'local');
  return {
    baseDir,
    platformDir: path.join(baseDir, platform),
  };
}

function getExpectedRuntimePlatform(targetPlatform) {
  if (targetPlatform === 'macos') {
    return 'darwin';
  }

  if (targetPlatform === 'windows') {
    return 'win32';
  }

  throw new Error(`Unsupported local desktop build target: ${targetPlatform}`);
}

function getBundleDirectory({ repoRoot, platform }) {
  if (platform === 'macos') {
    return path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle', 'dmg');
  }

  if (platform === 'windows') {
    return path.join(repoRoot, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
  }

  throw new Error(`Unsupported bundle directory target: ${platform}`);
}

function getInstallerExtension(platform) {
  return platform === 'macos' ? '.dmg' : '.exe';
}

function findNewestInstaller(bundleDir, extension) {
  if (!fs.existsSync(bundleDir)) {
    throw new Error(`Bundle output directory not found: ${bundleDir}`);
  }

  const candidates = fs
    .readdirSync(bundleDir)
    .filter((fileName) => fileName.toLowerCase().endsWith(extension))
    .map((fileName) => {
      const fullPath = path.join(bundleDir, fileName);
      const stats = fs.statSync(fullPath);
      return {
        fullPath,
        modifiedAt: stats.mtimeMs,
      };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  if (candidates.length === 0) {
    throw new Error(`No ${extension} installer was found in ${bundleDir}`);
  }

  return candidates[0].fullPath;
}

async function runBuildDesktopLocal({ targetPlatform, system = createNodeSystem() }) {
  const expectedRuntimePlatform = getExpectedRuntimePlatform(targetPlatform);
  const runtimePlatform = system.getPlatform();

  if (runtimePlatform !== expectedRuntimePlatform) {
    throw new Error(
      targetPlatform === 'macos'
        ? 'Local macOS packaging must run on macOS.'
        : 'Local Windows packaging must run on Windows.',
    );
  }

  system.ensureTool('cargo');

  if (targetPlatform === 'macos') {
    system.assertMacPrerequisites();
  } else {
    system.assertWindowsPrerequisites();
  }

  const repoRoot = system.getRepoRoot();
  const layout = buildLocalArtifactLayout({ repoRoot, platform: targetPlatform });

  system.runTauriBuild(repoRoot);

  const installerPath = system.findInstaller({
    repoRoot,
    platform: targetPlatform,
  });
  const outputPath = path.join(layout.platformDir, path.basename(installerPath));

  system.resetDir(layout.platformDir);
  system.copyFile(installerPath, outputPath);

  return {
    installerPath,
    outputPath,
    platform: targetPlatform,
  };
}

function createNodeSystem() {
  return {
    getPlatform() {
      return process.platform;
    },
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
    assertMacPrerequisites() {
      const result = childProcess.spawnSync('xcode-select', ['-p'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.error || result.status !== 0) {
        throw new Error(
          'Xcode Command Line Tools are required. Run `xcode-select --install` and retry.',
        );
      }
    },
    assertWindowsPrerequisites() {
      const result = childProcess.spawnSync('where', ['makensis'], {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.error || result.status !== 0) {
        throw new Error(
          'NSIS is required for Windows packaging. Install NSIS and make sure `makensis` is on PATH.',
        );
      }
    },
    getRepoRoot() {
      return path.resolve(__dirname, '..', '..');
    },
    runTauriBuild(repoRoot) {
      const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const result = childProcess.spawnSync(command, ['run', 'tauri:build'], {
        cwd: repoRoot,
        stdio: 'inherit',
      });

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0) {
        throw new Error('Local Tauri build failed.');
      }
    },
    findInstaller({ repoRoot, platform }) {
      const bundleDir = getBundleDirectory({ repoRoot, platform });
      return findNewestInstaller(bundleDir, getInstallerExtension(platform));
    },
    resetDir(dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
    },
    copyFile(from, to) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    },
  };
}

module.exports = {
  buildLocalArtifactLayout,
  createNodeSystem,
  runBuildDesktopLocal,
};

import { execFileSync } from 'node:child_process';

const image = `virtual-carillon:ci-${process.pid}`;
let container;

function failureReason(error) {
  const details = [error.stdout, error.stderr].filter(Boolean).join('\n').trim().split('\n');
  return details.slice(-12).join('\n');
}

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const reason = failureReason(error) || error.message;
    throw new Error(`${command} ${args.join(' ')} failed:\n${reason}`);
  }
}

async function check(label, callback) {
  try {
    await callback();
    console.log(`✓ ${label}`);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function checkPythonMetadata() {
  run('python3', ['-m', 'compileall', '-q', 'homeassistant/integration']);
  run('python3', ['-m', 'json.tool', 'homeassistant/integration/manifest.json']);
  run('python3', ['-m', 'json.tool', 'hacs.json']);
}

async function checkContainer() {
  run('docker', ['build', '--tag', image, '.']);
  container = run('docker', [
    'run',
    '--detach',
    '--env',
    'VIRTUAL_CARILLON_API_TOKEN=ci-test-token',
    '--publish',
    '127.0.0.1::9876',
    image,
  ]);

  const port = run('docker', ['port', container, '9876/tcp']).match(/:(\d+)$/)?.[1];
  if (!port) throw new Error('Could not determine the container port');

  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) break;
    } catch {
      // The container may still be starting.
    }
    if (attempt === 30) throw new Error('Container did not become healthy');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const response = await fetch(`${baseUrl}/api/status`, {
    headers: { Authorization: 'Bearer ci-test-token' },
  });
  if (!response.ok) throw new Error(`Authenticated API check failed: ${response.status}`);
}

try {
  await check('Project checks', () => run('pnpm', ['check']));
  await check('Release metadata', () => run('pnpm', ['release:check']));
  await check('Home Assistant and JSON metadata', checkPythonMetadata);
  await check('Docker build and API smoke test', checkContainer);
  console.log('\nPASS: local CI checks passed.');
} catch (error) {
  if (container) {
    try {
      const logs = run('docker', ['logs', container]);
      console.error(
        `\nContainer details (last 12 lines):\n${logs.split('\n').slice(-12).join('\n')}`,
      );
    } catch {
      // Preserve the original failure.
    }
  }
  console.error(`\nFAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (container) {
    try {
      execFileSync('docker', ['rm', '--force', container], { stdio: 'ignore' });
    } catch {
      // The container may already have exited or been removed.
    }
  }
}

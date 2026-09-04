// Clear generated audio cache and compile the TypeScript engine to engine/dist/.

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
await rm(path.join(projectRoot, '.data', 'cache'), { recursive: true, force: true });

const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
await new Promise((resolve, reject) => {
  const compiler = spawn(tsc, ['-p', 'tsconfig.json'], { cwd: projectRoot, stdio: 'inherit' });

  compiler.on('error', reject);
  compiler.on('exit', (code, signal) => {
    if (signal) reject(new Error(`TypeScript compiler terminated with ${signal}`));
    else if (code !== 0) reject(new Error(`TypeScript compiler exited with code ${code}`));
    else resolve();
  });
});

// Clear generated audio cache and compile the TypeScript application to dist/.

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
await rm(path.join(projectRoot, '.data', 'cache'), { recursive: true, force: true });

const tsc = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
const compiler = spawn(tsc, ['-p', 'tsconfig.json'], { cwd: projectRoot, stdio: 'inherit' });

compiler.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

compiler.on('exit', (code, signal) => {
  if (signal) {
    console.error(`TypeScript compiler terminated with ${signal}`);
    process.exitCode = 1;
  } else if (code !== 0) {
    process.exitCode = code ?? 1;
  }
});

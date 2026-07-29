const { spawn } = require('node:child_process');
const path = require('node:path');
const {
  buildSharedEnvironment,
  findPython,
} = require('./env-utils.cjs');

const backendDir = path.resolve(__dirname, '..');
const { recommendationDir, env } = buildSharedEnvironment(backendDir);
const python = findPython(env);
const args = ['train.py', ...process.argv.slice(2)];

const child = spawn(python, args, {
  cwd: recommendationDir,
  env,
  stdio: 'inherit',
});

child.once('error', (error) => {
  console.error(`[recommendation:train] Không chạy được ${python}:`, error.message);
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`[recommendation:train] Bị dừng bởi signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});

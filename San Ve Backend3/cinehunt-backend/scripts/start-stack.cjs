const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  buildSharedEnvironment,
  findPython,
  isEnabled,
} = require('./env-utils.cjs');

const backendDir = path.resolve(__dirname, '..');
const { recommendationDir, env } = buildSharedEnvironment(backendDir);
const python = findPython(env);
const children = new Set();

function runSync(command, args, cwd, label) {
  console.log(`\n[stack] ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} thất bại với exit code ${String(result.status)}.`);
  }
}

function start(command, args, cwd, label) {
  console.log(`\n[stack] Khởi động ${label}...`);
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: 'inherit',
  });
  children.add(child);

  child.once('error', (error) => {
    console.error(`[stack] ${label} lỗi:`, error.message);
    shutdown(1);
  });

  child.once('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(
        `[stack] ${label} dừng bất thường (code=${String(code)}, signal=${String(signal)}).`,
      );
      shutdown(code ?? 1);
    }
  });

  return child;
}

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  if (!fs.existsSync(recommendationDir)) {
    throw new Error(
      `Không tìm thấy recommendation-service tại ${recommendationDir}. ` +
        'Đặt RECOMMENDATION_SERVICE_DIR nếu bạn đã di chuyển thư mục.',
    );
  }

  if (isEnabled(env.DB_MIGRATIONS_RUN, env.NODE_ENV !== 'production')) {
    runSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'migration:run'],
      backendDir,
      'Chạy TypeORM migrations',
    );
  }

  const modelDir = env.MODEL_DIR || 'model';
  const modelFile = env.MODEL_FILE || 'recommender.joblib';
  const modelPath = path.resolve(recommendationDir, modelDir, modelFile);

  if (
    !fs.existsSync(modelPath) &&
    isEnabled(env.RECOMMENDATION_BOOTSTRAP_MODEL, true)
  ) {
    console.warn(`[stack] Chưa có model tại ${modelPath}. Tiến hành train lần đầu.`);
    runSync(
      python,
      ['train.py'],
      recommendationDir,
      'Train model recommendation lần đầu',
    );
  }

  const recommendationHost = env.RECOMMENDATION_HOST || '127.0.0.1';
  const recommendationPort = env.RECOMMENDATION_PORT || '8000';

  start(
    python,
    [
      '-m',
      'uvicorn',
      'app.main:app',
      '--host',
      recommendationHost,
      '--port',
      recommendationPort,
      '--reload',
    ],
    recommendationDir,
    'Python recommendation service',
  );

  start(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'start:dev'],
    backendDir,
    'NestJS backend',
  );
} catch (error) {
  console.error('[stack] Không thể khởi động:', error.message);
  shutdown(1);
}

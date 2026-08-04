const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildSharedEnvironment(backendDir) {
  const repositoryRoot = path.resolve(backendDir, '../..');
  const recommendationDir =
    process.env.RECOMMENDATION_SERVICE_DIR ||
    path.join(repositoryRoot, 'recommendation-service');

  const backendEnv = readEnvFile(path.join(backendDir, '.env'));
  const recommendationEnv = readEnvFile(path.join(recommendationDir, '.env'));

  const shared = {
    ...recommendationEnv,
    ...backendEnv,
    ...process.env,
  };

  return {
    repositoryRoot,
    recommendationDir,
    env: shared,
  };
}

function findPython(env) {
  if (env.PYTHON_BIN) return env.PYTHON_BIN;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function isEnabled(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

module.exports = {
  buildSharedEnvironment,
  findPython,
  isEnabled,
};

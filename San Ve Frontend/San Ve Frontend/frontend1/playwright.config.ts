import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, '../../..');
const backendDir = path.join(
  repoRoot,
  'San Ve Backend3',
  'cinehunt-backend',
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 35_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: backendDir,
      url: 'http://127.0.0.1:3000/showtime-seats',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command:
        'VITE_BYPASS_AUTH=false npm run dev -- --host 127.0.0.1',
      cwd: frontendDir,
      url: 'http://127.0.0.1:5173/login',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  projects: [
    { name: '1366', use: { browserName: 'chromium', viewport: { width: 1366, height: 900 } } },
    { name: '390', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
});

import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 45000, retries: 0, workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4180', viewport: { width: 1440, height: 1000 },
    headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
  },
  webServer: { command: 'python3 -m http.server 4180 --bind 127.0.0.1 --directory dist', url: 'http://127.0.0.1:4180', reuseExistingServer: !process.env.CI },
  outputDir: 'test-results/browser'
});

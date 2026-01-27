import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// E2E-only helper secret (used only when E2E_TEST_MODE=1).
// SECURITY: This secret MUST be explicitly set - no hardcoded defaults allowed.
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const E2E_INTERNAL_SECRET = process.env.E2E_INTERNAL_SECRET;
if (!E2E_INTERNAL_SECRET) {
  throw new Error(
    "E2E_INTERNAL_SECRET is required for Playwright tests.\n" +
    "Add to your .env/.env.local: E2E_INTERNAL_SECRET=<random-string>\n" +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    // Screenshot on failure only
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'retain-on-failure',

    // Action timeout: 15 seconds (click, fill, etc.)
    actionTimeout: 15000,

    // Navigation timeout: 30 seconds (page.goto, page.reload)
    navigationTimeout: 30000,
  },

  // Global test timeout: 60 seconds
  timeout: 60000,

  // Expect timeout: 10 seconds (all assertions)
  expect: {
    timeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // Uncomment these if you want to test against other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Next.js 16 uses Turbopack by default.
    // On Windows + network drives, forcing webpack can be unreliable (observed intermittent
    // `.next/dev/server/*-manifest` file open errors). Prefer the default dev server.
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // SECURITY: Pass secrets via env inheritance, NOT command-line arguments.
    // Command-line args are visible in `ps` output; env vars passed this way are not.
    env: {
      E2E_TEST_MODE: '1',
      E2E_INTERNAL_SECRET,
    },
  },
});

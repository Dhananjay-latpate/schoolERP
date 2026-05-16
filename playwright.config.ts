import { defineConfig, devices } from "@playwright/test";

// End-to-end browser tests for the School ERP frontend.
//
// Prerequisites when running locally:
//   1. Backend API running on :3001 with a seeded database
//      (cd ../server && npm run seed && npm start)
//   2. This config starts the Next.js frontend itself (webServer below).
//
// In CI the workflow provisions Postgres, the backend, and the browsers;
// see .github/workflows/e2e.yml.

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Auth state produced by the setup project lives here.
  outputDir: "./e2e/.results",
  fullyParallel: false, // shared seeded DB — keep specs deterministic
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Logs in once as the principal and saves the session; every
    // authenticated spec reuses it instead of logging in repeatedly.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/principal.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: "npm run start",
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});

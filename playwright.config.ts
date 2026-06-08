import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,   // single-threaded — Groq free-tier quota is shared
  timeout: 100_000,       // AI round-trips can take 30–60 s
  expect: { timeout: 12_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3107",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev --port 3107",
    url: "http://localhost:3107/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

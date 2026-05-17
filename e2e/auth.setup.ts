import { test as setup, expect } from "@playwright/test";

// Logs in as the seeded principal and persists the browser session
// (cookies + localStorage) so authenticated specs start signed in.
//
// Credentials come from the server seed: principal@school.local / Principal@123.
// Override with E2E_PRINCIPAL_EMAIL / E2E_PRINCIPAL_PASSWORD if seeded differently.

const PRINCIPAL_EMAIL = process.env.E2E_PRINCIPAL_EMAIL ?? "principal@school.local";
const PRINCIPAL_PASSWORD = process.env.E2E_PRINCIPAL_PASSWORD ?? "Principal@123";
const AUTH_FILE = "e2e/.auth/principal.json";

setup("authenticate as principal", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email address").fill(PRINCIPAL_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PRINCIPAL_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // A successful login routes away from /login to the principal workspace.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });
  expect(page.url()).not.toContain("/login");

  await page.context().storageState({ path: AUTH_FILE });
});

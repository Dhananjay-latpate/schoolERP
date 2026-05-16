import { test, expect } from "@playwright/test";

// The parent portal has its own login, so these specs do NOT use the
// principal storage state — they start unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

// Seeded by the server: an admission application + its emergency contact.
const APPLICATION_ID = process.env.E2E_APPLICATION_ID ?? "APP-CUSTOM-2025-26-001";
const PARENT_PHONE = process.env.E2E_PARENT_PHONE ?? "9876543210";

test.describe("Parent portal", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/parent/login");
    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Application ID")).toBeVisible();
    await expect(page.getByLabel("Phone number")).toBeVisible();
  });

  test("reject invalid credentials", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByLabel("Application ID").fill(APPLICATION_ID);
    await page.getByLabel("Phone number").fill("0000");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Stays on the login page and surfaces an error.
    await expect(page).toHaveURL(/\/parent\/login/);
    await expect(page.getByText(/does not match|failed|not found/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("log in and reach the parent fees portal", async ({ page }) => {
    await page.goto("/parent/login");
    await page.getByLabel("Application ID").fill(APPLICATION_ID);
    await page.getByLabel("Phone number").fill(PARENT_PHONE);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL(/\/parent\/fees/, { timeout: 15_000 });
    // The parent portal chrome is present.
    await expect(page.getByText("Parent Portal")).toBeVisible();
  });
});

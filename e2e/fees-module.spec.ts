import { test, expect } from "@playwright/test";

// Authenticated browser tests for the Fees & Accounts module. These reuse the
// principal session captured by auth.setup.ts.

test.describe("Fees & Accounts module", () => {
  test("dashboard renders with KPI cards and sidebar", async ({ page }) => {
    await page.goto("/principal/fees");

    const heading = page.getByRole("heading", { name: "Collections Overview" });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // The dashboard hero sits on a dark brand-gradient panel, so its heading
    // must render light — guards against headings being forced dark-on-dark.
    const color = await heading.evaluate(
      (el) => getComputedStyle(el).color,
    );
    const [r, g, b] = (color.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
    expect(
      r > 200 && g > 200 && b > 200,
      `heading colour ${color} should be light on the dark panel`,
    ).toBe(true);

    // Sidebar navigation is present.
    for (const label of [
      "Student Accounts",
      "Cashier",
      "Approvals",
      "Reports",
      "Payment Account",
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("student accounts page loads", async ({ page }) => {
    await page.goto("/principal/fees/students");
    await expect(
      page.getByRole("heading", { name: "Student Fee Accounts" }),
    ).toBeVisible({ timeout: 15_000 });
    // The search control is present.
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test("cashier counter page loads", async ({ page }) => {
    await page.goto("/principal/fees/cashier");
    await expect(
      page.getByRole("heading", { name: "Cashier Counter" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("create a fee head through the UI", async ({ page }) => {
    await page.goto("/principal/fees/masters/fee-heads");
    await expect(
      page.getByRole("heading", { name: "Fee Heads" }),
    ).toBeVisible({ timeout: 15_000 });

    // Unique code per run so re-running the suite never collides.
    const code = `E2E-${Date.now().toString().slice(-6)}`;
    await page.getByRole("button", { name: /new fee head/i }).click();

    const dialog = page.getByRole("heading", { name: "New fee head" });
    await expect(dialog).toBeVisible();

    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Name").fill("E2E Tuition");
    await page.getByRole("button", { name: "Save" }).click();

    // The new head appears in the table.
    await expect(page.getByText(code)).toBeVisible({ timeout: 10_000 });
  });

  test("reports page switches between report tabs", async ({ page }) => {
    await page.goto("/principal/fees/reports");
    await expect(
      page.getByRole("heading", { name: "Reports" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Defaulters/ }).click();
    await page.getByRole("button", { name: /Aging Analysis/ }).click();
  });
});

import { test, expect } from "@playwright/test";

// Browser test for the School Payment Account (gateway routing) settings page.

test.describe("Payment Account", () => {
  test("page renders with the bank form and both gateway cards", async ({ page }) => {
    await page.goto("/principal/fees/settings");

    await expect(
      page.getByRole("heading", { name: "Payment Account" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Bank & Business Details" }),
    ).toBeVisible();

    // Both gateway onboarding cards are shown.
    await expect(
      page.getByRole("heading", { name: "Cashfree Easy Split" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Razorpay Route" }),
    ).toBeVisible();
  });

  test("save bank details and see the account number masked", async ({ page }) => {
    await page.goto("/principal/fees/settings");
    await expect(
      page.getByRole("heading", { name: "Payment Account" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Account holder name *").fill("Phoenix School Trust");
    await page.getByLabel("Account number *").fill("123456789012");
    await page.getByLabel("IFSC *").fill("HDFC0001234");
    await page.getByLabel("Legal business name *").fill("Phoenix School Trust");
    await page.getByLabel("Contact name *").fill("Principal");
    await page.getByLabel("Contact email *").fill("principal@school.local");
    await page.getByLabel("Contact phone *").fill("9876543210");

    await page.getByRole("button", { name: "Save details" }).click();

    // Success toast confirms the save.
    await expect(page.getByText(/payment account saved/i)).toBeVisible({
      timeout: 10_000,
    });

    // After reload the stored number is shown masked, never in full.
    await page.reload();
    await expect(page.getByPlaceholder(/Stored: .*9012/)).toBeVisible({
      timeout: 10_000,
    });
  });
});

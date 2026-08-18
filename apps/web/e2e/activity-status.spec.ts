import { expect, test } from "@playwright/test";

const e2eInvite = process.env.E2E_INVITE ?? process.env.REGISTER_INVITE_CODE ?? "e2e-invite";

const PARQ = [
  "Chest pain during activity",
  "Dizziness or fainting",
  "A clinician advised against exercise",
  "Pregnancy",
  "An uncontrolled medical condition",
] as const;

test("settings sick status banners on SYSTEM", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/register");
  await page.getByLabel("Email", { exact: true }).fill(`e2e.status.${stamp}@example.com`);
  await page.getByLabel("Password").fill("e2e-password-ok");
  await page.getByLabel("Name", { exact: true }).fill("E2E Status");
  await page.getByLabel("Age").fill("20");
  await page.getByLabel("Invite code").fill(e2eInvite);
  await page.getByRole("checkbox", { name: /Medical notice/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Continue to onboarding" }).click();

  await page.getByRole("checkbox", { name: /Medical notice/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  for (const label of PARQ) {
    await page.getByRole("group", { name: label }).getByRole("button", { name: "No" }).click();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Age").fill("20");
  await page.getByRole("button", { name: "Metric" }).click();
  await page.getByLabel("Height (cm)").fill("168");
  await page.getByLabel("Weight (kg)").fill("72");
  await page.getByRole("button", { name: "Fat loss" }).click();
  await page.getByLabel("Time zone").fill("Europe/Stockholm");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Sleep window start").fill("23:00");
  await page.getByLabel("Sleep window end").fill("07:00");
  await page.getByRole("button", { name: "Sedentary" }).click();
  await page.getByLabel("Commute walk minutes").fill("15");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("group", { name: "Experience" }).getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("group", { name: "Equipment" }).getByRole("button", { name: "Bands" }).click();
  await page.getByRole("group", { name: "Injuries" }).getByRole("button", { name: "knee" }).click();
  await page.getByRole("group", { name: "Weekdays" }).getByRole("button", { name: "Mon" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Confirm 7-day plan" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "Confirm 7-day plan" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/settings");
  await page.getByLabel("Days (1–14)").fill("2");
  await page.getByRole("button", { name: "Sick", exact: true }).click();
  await expect(page.getByText(/STATUS: SICK/)).toBeVisible({ timeout: 15_000 });

  await page.goto("/");
  await expect(page.getByText(/STATUS: SICK/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Clear" }).first().click();
  await expect(page.getByText(/STATUS: SICK/)).toHaveCount(0, { timeout: 15_000 });
});

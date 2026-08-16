import { expect, test, type Page } from "@playwright/test";

const e2eInvite = process.env.E2E_INVITE ?? process.env.REGISTER_INVITE_CODE ?? "e2e-invite";

const PARQ = [
  "Chest pain during activity",
  "Dizziness or fainting",
  "A clinician advised against exercise",
  "Pregnancy",
  "An uncontrolled medical condition",
] as const;

test.describe.configure({ mode: "serial" });

test("register (age 20) → onboard → ensure → complete → XP up", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e.${stamp}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill("e2e-password-ok");
  await page.getByLabel("Name", { exact: true }).fill("E2E Player");
  await page.getByLabel("Age").fill("20");
  await page.getByLabel("Invite code").fill(e2eInvite);
  await page.getByRole("checkbox", { name: /Medical notice/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Continue to onboarding" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

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
  await page.getByLabel("Target weight optional (kg)").fill("66");
  await page.getByLabel("Target date optional").fill("2026-12-01");
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
  await page.getByRole("group", { name: "Weekdays" }).getByRole("button", { name: "Wed" }).click();
  await page.getByRole("group", { name: "Weekdays" }).getByRole("button", { name: "Fri" }).click();
  await page.getByRole("group", { name: "Weekdays" }).getByRole("button", { name: "Sat" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "7-day preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm 7-day plan" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "Confirm 7-day plan" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Checking today’s window…")).toBeHidden({ timeout: 30_000 });

  const issue = page.getByRole("button", { name: "Issue today’s quests" });
  const complete = page.getByRole("button", { name: "Complete" }).first();
  await expect(issue.or(complete)).toBeVisible({ timeout: 30_000 });
  if (await issue.isVisible()) {
    const ensure = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/me/today/ensure") &&
        res.request().method() === "POST" &&
        res.ok(),
      { timeout: 30_000 },
    );
    await issue.click();
    await ensure;
  }
  await expect(complete).toBeVisible({ timeout: 30_000 });

  const xpBefore = await readXp(page);
  await complete.click();
  await page.getByRole("button", { name: "Confirm full" }).click();
  await expect(page.getByText("completed").first()).toBeVisible({ timeout: 20_000 });
  const xpAfter = await readXp(page);
  expect(xpAfter, `XP should rise (was ${xpBefore})`).toBeGreaterThan(xpBefore);
});

async function readXp(page: Page): Promise<number> {
  const line = page.getByText(/Lv\s+\d+\s+·\s+\d+\s+\/\s+\d+\s+XP/);
  await expect(line).toBeVisible();
  const text = await line.innerText();
  const match = text.match(/·\s+(\d+)\s+\//);
  expect(match?.[1]).toBeTruthy();
  return Number(match?.[1]);
}

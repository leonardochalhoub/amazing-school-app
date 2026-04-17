import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD;

test.skip(
  !STUDENT_EMAIL || !STUDENT_PASSWORD,
  "E2E student credentials not set"
);

test("student uploads a profile photo", async ({ page }) => {
  const fixture = path.join(__dirname, ".fixtures", "avatar.png");
  if (!fs.existsSync(fixture)) {
    test.skip(true, "avatar fixture not present; see README");
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(STUDENT_EMAIL!);
  await page.getByLabel(/password/i).fill(STUDENT_PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/student/);

  await page.goto("/student/profile");
  await page.getByRole("button", { name: /change photo/i }).click();
  await page.setInputFiles('input[type="file"]', fixture);
  await expect(page.getByText(/avatar updated|uploading/i)).toBeVisible({
    timeout: 10_000,
  });
});

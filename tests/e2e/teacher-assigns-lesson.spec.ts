import { test, expect } from "@playwright/test";

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL;
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD;

test.skip(
  !TEACHER_EMAIL || !TEACHER_PASSWORD || !STUDENT_EMAIL || !STUDENT_PASSWORD,
  "E2E credentials not set"
);

test("teacher assigns a lesson to a student and the student sees it", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEACHER_EMAIL!);
  await page.getByLabel(/password/i).fill(TEACHER_PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/teacher/);

  const classroomLink = page.locator("table a").first();
  await classroomLink.click();
  await page.waitForURL(/\/teacher\/classroom\/.+/);

  const studentCard = page.getByRole("link").filter({ hasText: /Lv\./ }).first();
  await studentCard.click();
  await page.waitForURL(/\/students\//);

  await page.getByRole("button", { name: "Assign lesson" }).click();
  await page.getByRole("button", { name: /^Assign$/ }).first().click();
  await expect(page.getByText(/Lesson assigned|already assigned/i)).toBeVisible({
    timeout: 5000,
  });

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(STUDENT_EMAIL!);
  await page.getByLabel(/password/i).fill(STUDENT_PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/student/);
  await page.goto("/student/lessons");
  await expect(page.getByText(/lessons/i)).toBeVisible();
});

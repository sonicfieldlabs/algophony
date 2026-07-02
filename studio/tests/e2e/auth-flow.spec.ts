/**
 * Algophony Studio — E2E Test: Local Workspace Flow
 *
 * The local-first app opens directly into the local workspace.
 */

import { test, expect } from "@playwright/test";

test.describe("Local Workspace Flow", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Algophony Studio/);
    await expect(page.getByRole("link", { name: "Open local workspace" }).first()).toBeVisible();
  });

  test("dashboard opens without hosted auth", async ({ page }) => {
    await page.goto("/dashboard/home");
    await expect(page.getByRole("heading", { name: /Local sound research workspace/i })).toBeVisible();
  });
});

test.describe("Dashboard Navigation", () => {
  test("navigate to generate page", async ({ page }) => {
    await page.goto("/dashboard/generate");
    await expect(page.getByRole("heading", { name: "Advanced SFX Generate" })).toBeVisible();
  });

  test("navigate to library", async ({ page }) => {
    await page.goto("/dashboard/library");
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
  });

  test("navigate to sounds", async ({ page }) => {
    await page.goto("/dashboard/sounds");
    await expect(page.locator("text=Generation History")).toBeVisible();
  });

  test("navigate to local settings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.locator("text=Local workspace")).toBeVisible();
  });

  test("command palette opens with Cmd+K", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByPlaceholder(/Search commands/)).toBeVisible();
  });
});

test.describe("API Health", () => {
  test("usage endpoint returns data", async ({ request }) => {
    const res = await request.get("/api/usage");
    expect(res.status()).toBe(200);
  });

  test("local workspace endpoint returns data", async ({ request }) => {
    const res = await request.get("/api/local/workspace");
    expect(res.status()).toBe(200);
  });
});

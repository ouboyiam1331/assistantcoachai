import { expect, test } from "@playwright/test";

const mockWeekGames = [
  {
    id: 9001,
    startDate: "2026-10-10T18:00:00.000Z",
    awayTeam: "Georgia",
    homeTeam: "Alabama",
    venue: "Bryant-Denny Stadium",
    neutralSite: false,
    completed: true,
    awayPoints: 17,
    homePoints: 24,
  },
  {
    id: 9002,
    startDate: "2026-10-10T21:00:00.000Z",
    awayTeam: "Florida",
    homeTeam: "LSU",
    venue: "Tiger Stadium",
    neutralSite: false,
    completed: false,
    awayPoints: null,
    homePoints: null,
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
  });

  await page.route("**/api/cfbd/fbs/week-games**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        year: 2026,
        week: 8,
        seasonType: "regular",
        count: mockWeekGames.length,
        games: mockWeekGames,
      }),
    });
  });

  await page.route("**/api/tgem/v11/matchup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        lean: "HOME",
        confidence: 88,
        reasons: ["Mocked smoke reason"],
      }),
    });
  });
});

test("pickem hub renders empty state", async ({ page }) => {
  await page.goto("/pickem");

  await expect(
    page.getByRole("heading", { name: "Pick'em Mode with TGEMTM Analysis" }),
  ).toBeVisible();
  await expect(
    page.getByText("No saved slates yet. Create one to start tracking picks."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No season history yet. Create and grade slates to populate this tracker.",
    ),
  ).toBeVisible();
});

test("create slate, load games, run suggestion, and verify hub tallies", async ({ page }) => {
  await page.goto("/pickem/new-slate");

  await page
    .getByPlaceholder('e.g., "Week 1 - Opening Weekend"')
    .fill("Smoke Test Week 8");
  await page.locator('input[type="number"]').first().fill("2026");
  await page.locator('input[type="number"]').nth(1).fill("8");
  await page.getByRole("button", { name: "Continue to Slate" }).click();

  await expect(page).toHaveURL(/\/pickem\/slate\?id=/);
  await expect(page.getByRole("heading", { name: "Smoke Test Week 8" })).toBeVisible();
  await expect(page.getByText("Georgia @ Alabama")).toBeVisible();

  await page.getByRole("button", { name: "Suggest" }).first().click();
  await expect(page.getByText(/HOME.*88/)).toBeVisible();

  await page.getByRole("button", { name: "Grade Picks" }).click();
  await expect(page.getByText("Record:")).toContainText("1-0");

  await page.goto("/pickem");

  await expect(page.getByText("Smoke Test Week 8")).toBeVisible();
  await expect(page.getByText("Record: 1-0")).toBeVisible();
  await expect(page.getByText("Season Total:")).toContainText("1-0");
});

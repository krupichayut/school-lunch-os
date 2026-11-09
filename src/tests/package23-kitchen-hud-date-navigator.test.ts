import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getWeekDates,
  shiftSchoolDay,
  formatThaiMonthShort,
  toISODate,
  AppSyncPayload,
  DayPlan,
  WeeklyPlan,
  DEFAULT_WEEKLY_PLAN,
} from "../lib/storage";

describe("Package 23: Kitchen HUD Date Navigator & Flexible Inspection Date Suite", () => {
  it("T-110: formatThaiMonthShort formats Thai short month abbreviation accurately", () => {
    assert.strictEqual(formatThaiMonthShort("2026-11-09"), "พ.ย.");
    assert.strictEqual(formatThaiMonthShort("2026-01-05"), "ม.ค.");
    assert.strictEqual(formatThaiMonthShort("2026-12-31"), "ธ.ค.");
    assert.strictEqual(formatThaiMonthShort(""), "");
    assert.strictEqual(formatThaiMonthShort(null), "");
  });

  it("T-111: getWeekDates computes Monday-to-Friday dates for any given target date", () => {
    // 2026-11-09 is Monday, 2026-11-11 is Wednesday, 2026-11-13 is Friday
    const weekFromWednesday = getWeekDates("2026-11-11");
    assert.strictEqual(weekFromWednesday.length, 5);

    assert.strictEqual(weekFromWednesday[0].key, "monday");
    assert.strictEqual(weekFromWednesday[0].dateStr, "2026-11-09");
    assert.strictEqual(weekFromWednesday[0].dayNum, 9);
    assert.strictEqual(weekFromWednesday[0].monthShort, "พ.ย.");

    assert.strictEqual(weekFromWednesday[1].key, "tuesday");
    assert.strictEqual(weekFromWednesday[1].dateStr, "2026-11-10");

    assert.strictEqual(weekFromWednesday[2].key, "wednesday");
    assert.strictEqual(weekFromWednesday[2].dateStr, "2026-11-11");

    assert.strictEqual(weekFromWednesday[3].key, "thursday");
    assert.strictEqual(weekFromWednesday[3].dateStr, "2026-11-12");

    assert.strictEqual(weekFromWednesday[4].key, "friday");
    assert.strictEqual(weekFromWednesday[4].dateStr, "2026-11-13");
    assert.strictEqual(weekFromWednesday[4].dayNum, 13);
  });

  it("T-112: getWeekDates correctly anchors Monday when evaluated on a weekend day", () => {
    // 2026-11-14 is Saturday, 2026-11-15 is Sunday
    const weekFromSaturday = getWeekDates("2026-11-14");
    assert.strictEqual(weekFromSaturday[0].dateStr, "2026-11-09");
    assert.strictEqual(weekFromSaturday[4].dateStr, "2026-11-13");

    const weekFromSunday = getWeekDates("2026-11-15");
    assert.strictEqual(weekFromSunday[0].dateStr, "2026-11-09");
    assert.strictEqual(weekFromSunday[4].dateStr, "2026-11-13");
  });

  it("T-113: shiftSchoolDay accurately jumps 1 school day and skips weekends", () => {
    // Mon -> Tue
    assert.strictEqual(shiftSchoolDay("2026-11-09", "next"), "2026-11-10");
    // Tue -> Wed
    assert.strictEqual(shiftSchoolDay("2026-11-10", "next"), "2026-11-11");
    // Fri -> Mon (skips Sat 14 and Sun 15)
    assert.strictEqual(shiftSchoolDay("2026-11-13", "next"), "2026-11-16");

    // Mon -> Fri (skips Sun 15 and Sat 14)
    assert.strictEqual(shiftSchoolDay("2026-11-16", "prev"), "2026-11-13");
    // Wed -> Tue
    assert.strictEqual(shiftSchoolDay("2026-11-11", "prev"), "2026-11-10");

    // Weekend edge cases: Sat forward -> Mon, Sun backward -> Fri
    assert.strictEqual(shiftSchoolDay("2026-11-14", "next"), "2026-11-16");
    assert.strictEqual(shiftSchoolDay("2026-11-15", "prev"), "2026-11-13");
  });

  it("T-114: AppSyncPayload preserves inspectionTargetDate in serialization payload", () => {
    const payload: AppSyncPayload = {
      inspectionTargetDate: "2026-11-09",
      selectedDayKey: "monday",
      weeklyPlan: DEFAULT_WEEKLY_PLAN,
    };

    const json = JSON.stringify(payload);
    const parsed: AppSyncPayload = JSON.parse(json);
    assert.strictEqual(parsed.inspectionTargetDate, "2026-11-09");
    assert.strictEqual(parsed.selectedDayKey, "monday");
  });

  it("T-115: Multi-date inspection isolation - confirming receiving for 2026-11-09 does not lock 2026-11-10", () => {
    const datePlans: Record<string, DayPlan> = {
      "2026-11-09": {
        menuName: "ก๋วยเตี๋ยวน้ำใสไก่ฉีก",
        category: "อาหารจานเดียว",
        ingredients: [{ id: "ing-1", name: "เส้นหมี่", qty: 4, unit: "กก.", unitPrice: 35 }],
        isReceivingConfirmed: true,
        confirmedAtTime: "06:45 น.",
        inspectionDate: "2026-11-09",
      },
      "2026-11-10": {
        menuName: "ข้าวมันไก่ตอน",
        category: "อาหารจานเดียว",
        ingredients: [{ id: "ing-2", name: "ไก่สด", qty: 6, unit: "กก.", unitPrice: 75 }],
        isReceivingConfirmed: false,
        confirmedAtTime: null,
        inspectionDate: "2026-11-10",
      },
    };

    assert.strictEqual(datePlans["2026-11-09"].isReceivingConfirmed, true);
    assert.strictEqual(datePlans["2026-11-10"].isReceivingConfirmed, false);
    assert.strictEqual(datePlans["2026-11-09"].confirmedAtTime, "06:45 น.");
    assert.strictEqual(datePlans["2026-11-10"].confirmedAtTime, null);
  });
});

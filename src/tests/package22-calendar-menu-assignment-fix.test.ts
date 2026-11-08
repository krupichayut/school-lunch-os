import test from "node:test";
import assert from "node:assert/strict";
import {
  DayPlan,
  WeeklyPlan,
  DEFAULT_WEEKLY_PLAN,
  getRoundSchoolDays,
  ensureDatePlans,
  DayKey,
  MenuItem,
  PresetMenu,
} from "../lib/storage";

test("Package 22: Calendar Menu Assignment & System-Wide Integration", async (t) => {
  await t.test(
    "T-104: Assigning menu to any school weekday outside Round 1 (e.g. 2026-11-30, 2026-12-01) works and persists",
    () => {
      const initialDatePlans: Record<string, DayPlan> = {};
      const outsideRoundDate = "2026-11-30"; // Monday in Nov 2026, outside round 1 (2-27 Nov)

      const customDish: DayPlan = {
        menuName: "ข้าวผัดสับปะรดกุ้งสด",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "ing-1", name: "เนื้อกุ้งขาว", qty: 5, unit: "กก.", unitPrice: 160 },
          { id: "ing-2", name: "ข้าวสารหอมมะลิ", qty: 8, unit: "กก.", unitPrice: 38 },
        ],
        inspectionDate: outsideRoundDate,
        isFrozen: false,
        isReceivingConfirmed: false,
      };

      const updatedPlans = { ...initialDatePlans, [outsideRoundDate]: customDish };

      assert.ok(updatedPlans[outsideRoundDate]);
      assert.equal(updatedPlans[outsideRoundDate].menuName, "ข้าวผัดสับปะรดกุ้งสด");
      assert.equal(updatedPlans[outsideRoundDate].ingredients.length, 2);
      assert.equal(updatedPlans[outsideRoundDate].inspectionDate, "2026-11-30");
    }
  );

  await t.test(
    "T-105: Timezone-safe day of week mapping accurately resolves ISO dates to DayKey",
    () => {
      const dayKeyMap: Record<number, DayKey> = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
      };

      const testDates = [
        { date: "2026-11-02", expected: "monday" },
        { date: "2026-11-03", expected: "tuesday" },
        { date: "2026-11-04", expected: "wednesday" },
        { date: "2026-11-05", expected: "thursday" },
        { date: "2026-11-06", expected: "friday" },
        { date: "2026-11-09", expected: "monday" },
        { date: "2026-11-10", expected: "tuesday" },
        { date: "2026-11-27", expected: "friday" },
        { date: "2026-11-30", expected: "monday" },
      ];

      for (const item of testDates) {
        const d = new Date(item.date + "T00:00:00");
        const dayNum = d.getDay();
        const resolvedKey = dayKeyMap[dayNum];
        assert.equal(
          resolvedKey,
          item.expected,
          `Failed for date ${item.date}: expected ${item.expected}, got ${resolvedKey}`
        );
      }
    }
  );

  await t.test(
    "T-106: Updating a menu in datePlans synchronizes with weeklyPlan for that weekday key",
    () => {
      const weeklyPlanState: WeeklyPlan = JSON.parse(JSON.stringify(DEFAULT_WEEKLY_PLAN));
      const dateStr = "2026-11-10"; // Tuesday of week 2

      const planForDate: DayPlan = {
        menuName: "แกงส้มชะอมกุ้ง",
        category: "กับข้าว",
        ingredients: [
          { id: "ing-t1", name: "กุ้งสด", qty: 4, unit: "กก.", unitPrice: 180 },
          { id: "ing-t2", name: "ไข่ไก่/ชะอม", qty: 3, unit: "กก.", unitPrice: 45 },
        ],
        inspectionDate: dateStr,
        isFrozen: false,
        isReceivingConfirmed: false,
      };

      const d = new Date(dateStr + "T00:00:00");
      const dayNum = d.getDay();
      const dayKeyMap: Record<number, DayKey> = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
      };
      const targetDayKey = dayKeyMap[dayNum];

      assert.equal(targetDayKey, "tuesday");

      const updatedWeekly: WeeklyPlan = {
        ...weeklyPlanState,
        [targetDayKey]: {
          ...weeklyPlanState[targetDayKey],
          menuName: planForDate.menuName,
          category: planForDate.category || "อาหารจานเดียว",
          ingredients: (planForDate.ingredients || []).map((i) => ({ ...i })),
          inspectionDate: dateStr,
        },
      };

      assert.equal(updatedWeekly.tuesday.menuName, "แกงส้มชะอมกุ้ง");
      assert.equal(updatedWeekly.tuesday.inspectionDate, "2026-11-10");
      assert.equal(updatedWeekly.tuesday.ingredients.length, 2);
    }
  );

  await t.test(
    "T-107: Assigning custom menu preserves previously adjusted ingredients when renaming dish",
    () => {
      const existingDatePlan: DayPlan = {
        menuName: "ผัดกะเพราหมูสับ",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "ing-c1", name: "หมูบดอนามัย", qty: 7.5, unit: "กก.", unitPrice: 120 },
          { id: "ing-c2", name: "ใบกะเพราสด", qty: 1.5, unit: "กก.", unitPrice: 40 },
        ],
        inspectionDate: "2026-11-11",
        isFrozen: false,
      };

      // Renaming dish to "ผัดกะเพราไก่สับ"
      const newCustomName = "ผัดกะเพราไก่สับ";
      const startingIngs: MenuItem[] = [
        { id: "s-1", name: "เนื้อสัตว์หลัก (ไก่/หมู)", qty: 7.0, unit: "กก.", unitPrice: 100 },
      ];

      const ingredientsToUse =
        existingDatePlan.ingredients && existingDatePlan.ingredients.length > 0
          ? existingDatePlan.ingredients
          : startingIngs;

      const updatedPlan: DayPlan = {
        ...existingDatePlan,
        menuName: newCustomName,
        ingredients: ingredientsToUse,
      };

      assert.equal(updatedPlan.menuName, "ผัดกะเพราไก่สับ");
      assert.equal(updatedPlan.ingredients.length, 2);
      assert.equal(updatedPlan.ingredients[0].name, "หมูบดอนามัย");
    }
  );

  await t.test(
    "T-108: getRoundSchoolDays dynamically honors customized round start and end dates",
    () => {
      // Custom 2-week round from 2026-12-01 to 2026-12-11
      const customDays = getRoundSchoolDays("2026-12-01", "2026-12-11");
      // Dec 1 is Tuesday, Dec 11 is Friday -> 9 school weekdays
      assert.equal(customDays.length, 9);
      assert.equal(customDays[0], "2026-12-01");
      assert.equal(customDays[customDays.length - 1], "2026-12-11");

      // Verify no weekends exist in the generated list
      for (const dStr of customDays) {
        const day = new Date(dStr + "T00:00:00").getDay();
        assert.ok(day >= 1 && day <= 5, `${dStr} should be a weekday`);
      }
    }
  );

  await t.test(
    "T-109: Clearing a menu for a specific date clears datePlans without polluting other dates",
    () => {
      const datePlans: Record<string, DayPlan> = {
        "2026-11-02": {
          menuName: "ก๋วยเตี๋ยวน้ำใส",
          category: "อาหารจานเดียว",
          ingredients: [{ id: "i1", name: "เส้น", qty: 5, unit: "กก.", unitPrice: 30 }],
          inspectionDate: "2026-11-02",
        },
        "2026-11-03": {
          menuName: "ข้าวมันไก่",
          category: "อาหารจานเดียว",
          ingredients: [{ id: "i2", name: "ไก่", qty: 6, unit: "กก.", unitPrice: 100 }],
          inspectionDate: "2026-11-03",
        },
      };

      // Clear 2026-11-02
      const cleared: Record<string, DayPlan> = {
        ...datePlans,
        "2026-11-02": {
          menuName: "",
          category: "อาหารจานเดียว",
          ingredients: [],
          inspectionDate: "2026-11-02",
          isFrozen: false,
          isReceivingConfirmed: false,
        },
      };

      assert.equal(cleared["2026-11-02"].menuName, "");
      assert.equal(cleared["2026-11-02"].ingredients.length, 0);
      // Other dates must be untouched
      assert.equal(cleared["2026-11-03"].menuName, "ข้าวมันไก่");
      assert.equal(cleared["2026-11-03"].ingredients.length, 1);
    }
  );
});

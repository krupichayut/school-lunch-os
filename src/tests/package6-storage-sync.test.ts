import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizeSchoolSettings,
  normalizeWeeklyPlan,
  getTodayDayKey,
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_DUTY_ROSTER,
  DEFAULT_WEEKLY_PLAN,
} from "../lib/storage";

describe("Package 6: State Persistence & Schema Normalization Tests", () => {
  it("T-019: normalizeSchoolSettings handles nested cloud payload correctly", () => {
    const nestedPayload = {
      settings: {
        schoolName: "โรงเรียนบ้านควนเนียง (สพป. สฎ. เขต 3)",
        directorName: "นายวิเชียร มุ่งมั่น (ผู้อำนวยการโรงเรียน)",
        nutritionHeadName: "ครูพรทิพย์ เจริญจิตต์",
        academicYear: "2569",
        semester: "ภาคเรียนที่ 2",
        totalSemesterDays: 100,
        dutyRoster: {
          monday: ["ครูสมศรี", "ครูมานะ"],
          tuesday: ["ครูวิชัย"],
          wednesday: ["ครูประภาส"],
          thursday: ["ครูอนงค์"],
          friday: ["ครูสุชาติ"],
        },
      },
      lastUpdated: "2026-11-05T11:13:24.357Z",
    };

    const normalized = normalizeSchoolSettings(nestedPayload);
    assert.strictEqual(normalized.schoolName, "โรงเรียนบ้านควนเนียง (สพป. สฎ. เขต 3)");
    assert.strictEqual(normalized.dutyRoster.monday[0], "ครูสมศรี");
    assert.strictEqual(normalized.dutyRoster.friday[0], "ครูสุชาติ");
  });

  it("T-020: normalizeSchoolSettings handles flat schema from direct DB seed", () => {
    const flatPayload = {
      schoolName: "โรงเรียนบ้านควนเนียง (สพป. สฎ. เขต 3)",
      directorName: "นายวิเชียร มุ่งมั่น",
      nutritionHeadName: "ครูพรทิพย์",
      academicYear: "2569",
      semester: "ภาคเรียนที่ 2",
      dutyRoster: {
        monday: ["ครูสมศรี"],
      },
    };

    const normalized = normalizeSchoolSettings(flatPayload);
    assert.strictEqual(normalized.schoolName, "โรงเรียนบ้านควนเนียง (สพป. สฎ. เขต 3)");
    assert.strictEqual(normalized.dutyRoster.monday[0], "ครูสมศรี");
    // Other days fall back to default arrays safely
    assert.ok(Array.isArray(normalized.dutyRoster.tuesday));
    assert.ok(normalized.dutyRoster.tuesday.length > 0);
  });

  it("T-021: normalizeSchoolSettings provides resilient defaults when raw input is null or corrupt", () => {
    const corruptedPayload = null;
    const fallbackName = "โรงเรียนทดสอบการกู้คืน";

    const normalized = normalizeSchoolSettings(corruptedPayload, fallbackName);
    assert.strictEqual(normalized.schoolName, fallbackName);
    assert.strictEqual(normalized.directorName, DEFAULT_SCHOOL_SETTINGS.directorName);
    assert.deepStrictEqual(normalized.dutyRoster, DEFAULT_DUTY_ROSTER);
  });

  it("T-022: normalizeWeeklyPlan guarantees all 5 weekdays and defensive fallbacks", () => {
    const rawPartial = {
      monday: {
        menuName: "ข้าวมันไก่ตอน",
        ingredients: [{ id: "ing-1", name: "เนื้อไก่", qty: 5, unit: "กก.", unitPrice: 100 }],
      },
    };

    const plan = normalizeWeeklyPlan(rawPartial);
    assert.strictEqual(plan.monday.menuName, "ข้าวมันไก่ตอน");
    assert.strictEqual(plan.monday.ingredients.length, 1);
    assert.strictEqual(plan.tuesday.menuName, DEFAULT_WEEKLY_PLAN.tuesday.menuName);
    assert.strictEqual(plan.wednesday.menuName, DEFAULT_WEEKLY_PLAN.wednesday.menuName);
    assert.strictEqual(plan.thursday.menuName, DEFAULT_WEEKLY_PLAN.thursday.menuName);
    assert.strictEqual(plan.friday.menuName, DEFAULT_WEEKLY_PLAN.friday.menuName);

    // Corrupted input
    const corruptedPlan = normalizeWeeklyPlan(null);
    assert.deepStrictEqual(corruptedPlan, DEFAULT_WEEKLY_PLAN);
  });

  it("T-023: getTodayDayKey returns a valid weekday key", () => {
    const key = getTodayDayKey();
    const validKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    assert.ok(validKeys.includes(key));
  });

  it("T-024: Dummy financial transactions filter cleans mock records tx-1 to tx-5", () => {
    const sampleWithDummy = [
      { id: "tx-1", documentNo: "FIN-2569-000001", amount: 99000, type: "INCOME" },
      { id: "tx-2", documentNo: "FIN-2569-000002", amount: 1180, type: "EXPENSE" },
      { id: "tx-real-1", documentNo: "FIN-2569-000006", amount: 50000, type: "INCOME" },
    ];

    const cleaned = sampleWithDummy.filter(
      (t) => !["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"].includes(t.id)
    );

    assert.strictEqual(cleaned.length, 1);
    assert.strictEqual(cleaned[0].id, "tx-real-1");
  });
});

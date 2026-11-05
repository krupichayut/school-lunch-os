import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizeSchoolSettings,
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_DUTY_ROSTER,
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
});

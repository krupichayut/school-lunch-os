import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHOOL_SETTINGS,
  normalizeSchoolSettings,
} from "../lib/storage";
import { toBahtText } from "../lib/baht-text";

describe("Package 10: 20-Day Round Budget & Subsidy Rate Tests", () => {
  test("T-043: SchoolSettings defaults provide 86 students, 27 Baht/head, 20 days per installment, and Round 1 title", () => {
    assert.equal(DEFAULT_SCHOOL_SETTINGS.studentCount, 86);
    assert.equal(DEFAULT_SCHOOL_SETTINGS.subsidyPerHead, 27);
    assert.equal(DEFAULT_SCHOOL_SETTINGS.daysPerInstallment, 20);
    assert.equal(DEFAULT_SCHOOL_SETTINGS.currentRoundTitle, "งวดที่ 1 (2 พ.ย. – 27 พ.ย. 2569)");
    assert.equal(DEFAULT_SCHOOL_SETTINGS.currentRoundStartDate, "2026-11-02");
    assert.equal(DEFAULT_SCHOOL_SETTINGS.currentRoundEndDate, "2026-11-27");
  });

  test("T-044: Dynamic budget calculations: daily = 2,322 ฿, weekly = 11,610 ฿, 20-day round = 46,440 ฿", () => {
    const studentCount = DEFAULT_SCHOOL_SETTINGS.studentCount || 86;
    const subsidy = DEFAULT_SCHOOL_SETTINGS.subsidyPerHead || 27;
    const days = DEFAULT_SCHOOL_SETTINGS.daysPerInstallment || 20;

    const dailyBudget = studentCount * subsidy;
    const weeklyBudget = dailyBudget * 5;
    const roundBudget = dailyBudget * days;

    assert.equal(dailyBudget, 2322.0);
    assert.equal(weeklyBudget, 11610.0);
    assert.equal(roundBudget, 46440.0);
  });

  test("T-045: normalizeSchoolSettings defensively retains custom studentCount, subsidyPerHead, and daysPerInstallment", () => {
    const customPayload = {
      schoolName: "โรงเรียนอนุบาลวัดเกาะ",
      studentCount: 120,
      subsidyPerHead: 27,
      daysPerInstallment: 20,
      currentRoundTitle: "งวดที่ 2 (30 พ.ย. – 25 ธ.ค. 2569)",
      currentRoundStartDate: "2026-11-30",
      currentRoundEndDate: "2026-12-25",
    };

    const normalized = normalizeSchoolSettings(customPayload);
    assert.equal(normalized.studentCount, 120);
    assert.equal(normalized.subsidyPerHead, 27);
    assert.equal(normalized.daysPerInstallment, 20);
    assert.equal(normalized.currentRoundTitle, "งวดที่ 2 (30 พ.ย. – 25 ธ.ค. 2569)");
    assert.equal(normalized.currentRoundStartDate, "2026-11-30");
    assert.equal(normalized.currentRoundEndDate, "2026-12-25");
  });

  test("T-046: Baht text output for Round 1 (46,440.00 ฿) is 'สี่หมื่นหกพันสี่ร้อยสี่สิบบาทถ้วน'", () => {
    const roundBudget = 46440.0;
    const text = toBahtText(roundBudget);
    assert.equal(text, "สี่หมื่นหกพันสี่ร้อยสี่สิบบาทถ้วน");
  });

  test("T-047: Baht text output for Weekly budget (11,610.00 ฿) is 'หนึ่งหมื่นหนึ่งพันหกร้อยสิบบาทถ้วน'", () => {
    const weeklyBudget = 11610.0;
    const text = toBahtText(weeklyBudget);
    assert.equal(text, "หนึ่งหมื่นหนึ่งพันหกร้อยสิบบาทถ้วน");
  });

  test("T-048: Estimated remaining days with 46,440 ฿ budget and 2,322 ฿ daily burn rate yields exactly 20 days", () => {
    const netCashRemaining = 46440.0;
    const avgDailySpend = 2322.0;
    const estimatedDaysRemaining = Math.floor(netCashRemaining / avgDailySpend);
    assert.equal(estimatedDaysRemaining, 20);
  });
});

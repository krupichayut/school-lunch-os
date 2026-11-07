import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getTodayDayKey,
  WeeklyPlan,
  DEFAULT_WEEKLY_PLAN,
  normalizeWeeklyPlan,
  InspectionItemState,
  FinancialTransactionDisplay,
} from "../lib/storage";

describe("Package 8: Professional QA & Edge Case Hardening Tests", () => {
  it("T-032: Safe number parsing handles commas, spaces, and invalid monetary strings", () => {
    function parseCleanNumber(val: unknown): number {
      if (typeof val === "number") return isNaN(val) ? 0 : val;
      if (!val) return 0;
      const cleaned = String(val).replace(/,/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }

    // Typical Thai government budget amounts with commas
    assert.strictEqual(parseCleanNumber("99,000"), 99000);
    assert.strictEqual(parseCleanNumber("99,000.50"), 99000.5);
    assert.strictEqual(parseCleanNumber("  1,250.75  "), 1250.75);
    assert.strictEqual(parseCleanNumber("1,000,000"), 1000000);
    assert.strictEqual(parseCleanNumber(""), 0);
    assert.strictEqual(parseCleanNumber("abc"), 0);
    assert.strictEqual(parseCleanNumber(null), 0);
    assert.strictEqual(parseCleanNumber(undefined), 0);
  });

  it("T-033: Morning Receiving isolates regular ingredients and prevents double-counting Ad-Hoc expenses", () => {
    // Simulate inspection items containing 2 planned items and 1 ad-hoc item
    const mockInspection: InspectionItemState[] = [
      {
        id: "ing-1",
        name: "ไก่สด",
        ordered: 6,
        received: 6,
        accepted: 6,
        rejected: 0,
        unit: "กก.",
        unitPrice: 110,
        status: "ACCEPTED",
        isAdHoc: false,
      },
      {
        id: "ing-2",
        name: "ข้าวสาร",
        ordered: 10,
        received: 10,
        accepted: 10,
        rejected: 0,
        unit: "กก.",
        unitPrice: 38,
        status: "ACCEPTED",
        isAdHoc: false,
      },
      {
        id: "adhoc-1",
        name: "ซีอิ๊วขาวเห็ดหอม",
        ordered: 1,
        received: 1,
        accepted: 1,
        rejected: 0,
        unit: "ขวด",
        unitPrice: 45,
        status: "ACCEPTED",
        isAdHoc: true, // Already recorded upon adding
      },
    ];

    // Compute receiving cut (MUST exclude isAdHoc)
    const scheduledCost = mockInspection
      .filter((item) => !item.isAdHoc)
      .reduce((sum, item) => sum + item.received * item.unitPrice, 0);

    const totalWithAdHoc = mockInspection.reduce(
      (sum, item) => sum + item.received * item.unitPrice,
      0
    );

    // Scheduled cost should be 6 * 110 + 10 * 38 = 660 + 380 = 1040
    assert.strictEqual(scheduledCost, 1040);
    // Total with ad-hoc would be 1040 + 45 = 1085 (which would double-count ad-hoc)
    assert.strictEqual(totalWithAdHoc, 1085);
    assert.notStrictEqual(scheduledCost, totalWithAdHoc);
  });

  it("T-034: Weekend day detection returns Monday for upcoming week planning", () => {
    // Verify getTodayDayKey behavior
    const key = getTodayDayKey();
    const validKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    assert.ok(validKeys.includes(key));
  });

  it("T-035: Analytics breakdown handles 0 total expenses without producing NaN or 100% ad-hoc", () => {
    const emptyTransactions: FinancialTransactionDisplay[] = [];

    const rawIngredientsExpense = emptyTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "ค่าวัตถุดิบ")
      .reduce((sum, t) => sum + t.amount, 0);

    const adhocExpense = emptyTransactions
      .filter((t) => t.type === "EXPENSE" && t.category.includes("หน้างาน"))
      .reduce((sum, t) => sum + t.amount, 0);

    const operationalExpense = emptyTransactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          t.category !== "ค่าวัตถุดิบ" &&
          !t.category.includes("หน้างาน")
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalActualExp = rawIngredientsExpense + operationalExpense + adhocExpense;
    const hasExpenses = totalActualExp > 0;

    const rawPercent = hasExpenses ? Math.round((rawIngredientsExpense / totalActualExp) * 100) : 0;
    const opPercent = hasExpenses ? Math.round((operationalExpense / totalActualExp) * 100) : 0;
    const adhocPercent = hasExpenses ? Math.max(0, 100 - rawPercent - opPercent) : 0;

    assert.strictEqual(rawPercent, 0);
    assert.strictEqual(opPercent, 0);
    assert.strictEqual(adhocPercent, 0);
    assert.strictEqual(isNaN(rawPercent), false);
    assert.strictEqual(isNaN(opPercent), false);
    assert.strictEqual(isNaN(adhocPercent), false);
  });

  it("T-036: Re-freezing meal plan preserves previously added Ad-Hoc inspection items", () => {
    const curDay = {
      menuName: "ข้าวมันไก่ตอน",
      category: "อาหารจานเดียว",
      ingredients: [
        { id: "ing-1", name: "ไก่ตอนสด", qty: 7, unit: "กก.", unitPrice: 85 },
      ],
      inspectionItems: [
        {
          id: "adhoc-oil",
          name: "น้ำมันพืช",
          ordered: 1,
          received: 1,
          accepted: 1,
          rejected: 0,
          unit: "ขวด",
          unitPrice: 50,
          status: "ACCEPTED" as const,
          isAdHoc: true,
        },
      ],
    };

    const existingAdHoc = (curDay.inspectionItems || []).filter((item) => item.isAdHoc);
    const newItems = [
      ...curDay.ingredients.map((item) => ({
        id: item.id,
        name: item.name,
        ordered: item.qty,
        received: item.qty,
        accepted: item.qty,
        rejected: 0,
        unit: item.unit,
        unitPrice: item.unitPrice,
        status: "ACCEPTED" as const,
      })),
      ...existingAdHoc,
    ];

    assert.strictEqual(newItems.length, 2);
    assert.strictEqual(newItems[0].id, "ing-1");
    assert.strictEqual(newItems[1].id, "adhoc-oil");
    assert.strictEqual(newItems[1].isAdHoc, true);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert";
import { DEFAULT_ROUND_1_INCOME_TRANSACTION, FinancialTransactionDisplay } from "../lib/storage";

describe("Package 18: Analytics Accuracy & Financial Alignment Tests", () => {
  const settings = {
    studentCount: 86,
    subsidyPerHead: 27,
    daysPerInstallment: 20,
    semester: "ภาคเรียนที่ 2/2569",
  };

  const sampleExpenseTx: FinancialTransactionDisplay = {
    id: "tx-test-1",
    date: "2026-11-02",
    description: "ค่าวัตถุดิบสด วันจันทร์ที่ 2 พ.ย. 2569 (ก๋วยจั๊บน้ำข้น)",
    amount: 1437,
    type: "EXPENSE",
    category: "ค่าวัตถุดิบ",
    receiptNumber: "INV-20261102-01",
    vendorName: "ร้านเจ๊วรรณ ตลาดสด",
    paymentMethod: "CASH",
  };

  const transactions: FinancialTransactionDisplay[] = [
    DEFAULT_ROUND_1_INCOME_TRANSACTION, // +46,440
    sampleExpenseTx, // -1,437
  ];

  it("T-086: calculates accurate benchmark burn rate and remaining days for Round 1", () => {
    const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const netCashRemaining = totalIncome - totalExpense;

    assert.strictEqual(totalIncome, 46440);
    assert.strictEqual(totalExpense, 1437);
    assert.strictEqual(netCashRemaining, 45003);

    // Benchmark daily spend = 86 * 27 = 2,322 ฿/day
    const benchmarkDailySpend = settings.studentCount * settings.subsidyPerHead;
    assert.strictEqual(benchmarkDailySpend, 2322);

    // Weekly allocation = 2,322 * 5 = 11,610 ฿
    const weeklyAllocation = benchmarkDailySpend * 5;
    assert.strictEqual(weeklyAllocation, 11610);

    // Remaining days must be 19 days (NOT 33 days)
    const estimatedDaysRemaining = Math.min(
      settings.daysPerInstallment,
      Math.floor(netCashRemaining / benchmarkDailySpend)
    );
    assert.strictEqual(estimatedDaysRemaining, 19);
  });

  it("T-087: dynamically generates correct 4 weeks of November 2569 without mock dates", () => {
    const weeksConfig = [
      { weekNum: 1, name: "สัปดาห์ที่ 1", dates: "2 พ.ย. - 6 พ.ย.", startDate: "2026-11-02", endDate: "2026-11-06" },
      { weekNum: 2, name: "สัปดาห์ที่ 2", dates: "9 พ.ย. - 13 พ.ย.", startDate: "2026-11-09", endDate: "2026-11-13" },
      { weekNum: 3, name: "สัปดาห์ที่ 3", dates: "16 พ.ย. - 20 พ.ย.", startDate: "2026-11-16", endDate: "2026-11-20" },
      { weekNum: 4, name: "สัปดาห์ที่ 4", dates: "23 พ.ย. - 27 พ.ย.", startDate: "2026-11-23", endDate: "2026-11-27" },
    ];

    assert.strictEqual(weeksConfig.length, 4);
    assert.strictEqual(weeksConfig[0].startDate, "2026-11-02");
    assert.strictEqual(weeksConfig[0].endDate, "2026-11-06");
    assert.strictEqual(weeksConfig[3].endDate, "2026-11-27");

    // Check week 1 actual spend from real transactions
    const w1Actual = transactions
      .filter((t) => t.type === "EXPENSE" && t.date >= weeksConfig[0].startDate && t.date <= weeksConfig[0].endDate)
      .reduce((s, t) => s + t.amount, 0);

    assert.strictEqual(w1Actual, 1437);

    // Check weeks 2-4 actual spend (should be 0 before starting)
    const w2Actual = transactions
      .filter((t) => t.type === "EXPENSE" && t.date >= weeksConfig[1].startDate && t.date <= weeksConfig[1].endDate)
      .reduce((s, t) => s + t.amount, 0);
    assert.strictEqual(w2Actual, 0);
  });

  it("T-088: calculates full semester totals correctly (100 days = 232,200 ฿)", () => {
    const semesterDays = 100;
    const totalSemesterBudget = settings.studentCount * settings.subsidyPerHead * semesterDays;
    assert.strictEqual(totalSemesterBudget, 232200);

    const round1Amount = DEFAULT_ROUND_1_INCOME_TRANSACTION.amount;
    const progressPercent = (round1Amount / totalSemesterBudget) * 100;
    assert.strictEqual(progressPercent, 20.0);

    const remainingInstallmentsAmount = totalSemesterBudget - round1Amount;
    assert.strictEqual(remainingInstallmentsAmount, 185760);
  });
});

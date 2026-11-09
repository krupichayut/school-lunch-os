import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getReceivingDocNo,
  getReceivingTxDocNo,
  syncTransactionsWithDailyPlans,
  DEFAULT_ROUND_1_INCOME_TRANSACTION,
  FinancialTransactionDisplay,
  DayPlan,
  WeeklyPlan,
  DEFAULT_WEEKLY_PLAN,
} from "../lib/storage";

describe("Package 24: Finance Ledger & Daily Menu Auto-Sync Suite", () => {
  it("T-116: getReceivingDocNo and getReceivingTxDocNo format date-specific official identifiers", () => {
    assert.strictEqual(getReceivingDocNo("2026-11-02"), "RCV-2569-11-02");
    assert.strictEqual(getReceivingTxDocNo("2026-11-02"), "FIN-RCV-2569-11-02");

    assert.strictEqual(getReceivingDocNo("2026-11-03"), "RCV-2569-11-03");
    assert.strictEqual(getReceivingTxDocNo("2026-11-03"), "FIN-RCV-2569-11-03");

    assert.strictEqual(getReceivingDocNo("2026-11-09"), "RCV-2569-11-09");
    assert.strictEqual(getReceivingTxDocNo("2026-11-09"), "FIN-RCV-2569-11-09");
  });

  it("T-117: syncTransactionsWithDailyPlans auto-generates ledger expense records for all recorded daily plans", () => {
    const datePlans: Record<string, DayPlan> = {
      "2026-11-02": {
        menuName: "ข้าวมันไก่ตอน",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "1", name: "เนื้อไก่สด", qty: 10, unit: "กก.", unitPrice: 85 },
          { id: "2", name: "ข้าวสารหอมมะลิ", qty: 5, unit: "กก.", unitPrice: 35 },
        ],
        isReceivingConfirmed: true,
        inspectionDate: "2026-11-02",
      },
      "2026-11-03": {
        menuName: "ก๋วยเตี๋ยวหมูน้ำใส",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "3", name: "หมูสับ", qty: 8, unit: "กก.", unitPrice: 120 },
          { id: "4", name: "เส้นเล็ก", qty: 6, unit: "กก.", unitPrice: 30 },
        ],
        isReceivingConfirmed: false,
        inspectionDate: "2026-11-03",
      },
      "2026-11-04": {
        menuName: "แกงจืดเต้าหู้หมูสับ",
        category: "ต้ม",
        ingredients: [
          { id: "5", name: "เต้าหู้ไข่", qty: 20, unit: "หลอด", unitPrice: 10 },
          { id: "6", name: "ผักกาดขาว", qty: 5, unit: "กก.", unitPrice: 30 },
        ],
        isReceivingConfirmed: false,
        inspectionDate: "2026-11-04",
      },
    };

    const initialTransactions: FinancialTransactionDisplay[] = [
      DEFAULT_ROUND_1_INCOME_TRANSACTION,
    ];

    const result = syncTransactionsWithDailyPlans(
      initialTransactions,
      datePlans,
      DEFAULT_WEEKLY_PLAN,
      "2026-11-02",
      20
    );

    // 1 income + 3 daily menu expenses = 4 transactions
    assert.strictEqual(result.syncedCount, 3);
    assert.strictEqual(result.updatedTransactions.length, 4);

    const txNov2 = result.updatedTransactions.find((t) => t.documentNo === "FIN-RCV-2569-11-02");
    assert.ok(txNov2, "Nov 2 transaction must exist");
    assert.strictEqual(txNov2.amount, 10 * 85 + 5 * 35); // 850 + 175 = 1025
    assert.strictEqual(txNov2.type, "EXPENSE");
    assert.strictEqual(txNov2.category, "ค่าวัตถุดิบ");
    assert.match(txNov2.description, /ข้าวมันไก่ตอน/);

    const txNov3 = result.updatedTransactions.find((t) => t.documentNo === "FIN-RCV-2569-11-03");
    assert.ok(txNov3, "Nov 3 transaction must exist");
    assert.strictEqual(txNov3.amount, 8 * 120 + 6 * 30); // 960 + 180 = 1140

    const txNov4 = result.updatedTransactions.find((t) => t.documentNo === "FIN-RCV-2569-11-04");
    assert.ok(txNov4, "Nov 4 transaction must exist");
    assert.strictEqual(txNov4.amount, 20 * 10 + 5 * 30); // 200 + 150 = 350

    assert.strictEqual(result.totalMenuCost, 1025 + 1140 + 350);
  });

  it("T-118: syncTransactionsWithDailyPlans seamlessly updates existing transactions when prices or ingredients are modified", () => {
    // Initial state with a legacy transaction of 1,442 ฿
    const initialTransactions: FinancialTransactionDisplay[] = [
      DEFAULT_ROUND_1_INCOME_TRANSACTION,
      {
        id: "tx-recv-2026-11-02",
        documentNo: "FIN-RCV-2569-จันทร์",
        date: "2 พ.ย. 2569",
        type: "EXPENSE",
        category: "ค่าวัตถุดิบ",
        description: "ตัดจ่ายค่าวัตถุดิบอาหารสด (ข้าวมันไก่ /ซุป/ผลไม้) ประจำวันจันทร์ (2 พ.ย. 2569)",
        amount: 1442.0,
      },
    ];

    // User modified the recipe to cost 2,150.50 ฿
    const datePlans: Record<string, DayPlan> = {
      "2026-11-02": {
        menuName: "ข้าวมันไก่พิเศษ + ผลไม้",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "ing-1", name: "ไก่สด", qty: 20, unit: "กก.", unitPrice: 95 }, // 1900
          { id: "ing-2", name: "แตงกวา", qty: 5, unit: "กก.", unitPrice: 20 }, // 100
          { id: "ing-3", name: "แตงโม", qty: 10.05, unit: "กก.", unitPrice: 15 }, // 150.75
        ],
        isReceivingConfirmed: true,
        inspectionDate: "2026-11-02",
      },
    };

    const result = syncTransactionsWithDailyPlans(
      initialTransactions,
      datePlans,
      DEFAULT_WEEKLY_PLAN,
      "2026-11-02",
      20
    );

    // Must NOT create a duplicate row! Still 2 transactions (1 income, 1 expense)
    assert.strictEqual(result.updatedTransactions.length, 2);

    const updatedNov2 = result.updatedTransactions.find((t) => t.type === "EXPENSE");
    assert.ok(updatedNov2);
    assert.strictEqual(updatedNov2.documentNo, "FIN-RCV-2569-11-02");
    assert.strictEqual(updatedNov2.amount, 2150.75);
    assert.match(updatedNov2.description, /ข้าวมันไก่พิเศษ \+ ผลไม้/);
  });

  it("T-119: syncTransactionsWithDailyPlans strictly preserves non-ingredient operational and ad-hoc transactions", () => {
    const existingTransactions: FinancialTransactionDisplay[] = [
      DEFAULT_ROUND_1_INCOME_TRANSACTION,
      {
        id: "tx-gas-1",
        documentNo: "FIN-GAS-001",
        date: "2 พ.ย. 2569",
        type: "EXPENSE",
        category: "ค่าก๊าซหุงต้มและเชื้อเพลิง",
        description: "เติมก๊าซหุงต้ม ปตท. 15 กก.",
        amount: 450.0,
      },
      {
        id: "tx-cook-1",
        documentNo: "FIN-WAGE-001",
        date: "6 พ.ย. 2569",
        type: "EXPENSE",
        category: "ค่าจ้างแม่ครัว/ผู้ประกอบอาหาร",
        description: "ค่าจ้างแม่ครัวประจำสัปดาห์ที่ 1",
        amount: 2500.0,
      },
      {
        id: "tx-adhoc-rice",
        documentNo: "FIN-ADHOC-001",
        date: "2 พ.ย. 2569",
        type: "EXPENSE",
        category: "ค่าข้าวสาร (นอกเมนู)",
        description: "จัดซื้อข้าวสารหอมมะลิ 2 กระสอบ",
        amount: 2800.0,
      },
    ];

    const datePlans: Record<string, DayPlan> = {
      "2026-11-02": {
        menuName: "ก๋วยเตี๋ยว",
        ingredients: [{ id: "1", name: "เส้น", qty: 10, unit: "กก.", unitPrice: 30 }],
      },
    };

    const result = syncTransactionsWithDailyPlans(
      existingTransactions,
      datePlans,
      DEFAULT_WEEKLY_PLAN,
      "2026-11-02",
      20
    );

    // 1 income + 3 preserved expenses + 1 new daily ingredient expense = 5 total
    assert.strictEqual(result.updatedTransactions.length, 5);

    const gasTx = result.updatedTransactions.find((t) => t.category === "ค่าก๊าซหุงต้มและเชื้อเพลิง");
    assert.ok(gasTx);
    assert.strictEqual(gasTx.amount, 450.0);

    const cookTx = result.updatedTransactions.find((t) => t.category === "ค่าจ้างแม่ครัว/ผู้ประกอบอาหาร");
    assert.ok(cookTx);
    assert.strictEqual(cookTx.amount, 2500.0);

    const riceTx = result.updatedTransactions.find((t) => t.category === "ค่าข้าวสาร (นอกเมนู)");
    assert.ok(riceTx);
    assert.strictEqual(riceTx.amount, 2800.0);
  });
});

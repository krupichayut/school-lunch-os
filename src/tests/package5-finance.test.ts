import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { FinanceService } from "../lib/finance/service";
import { FinancialPayment, FinancialTransaction, FinancialTransactionItem, ReceivingItem, ReceivingRecord, UUID } from "../types";

describe("Package 5: Budget & Finance Ledger Tests", () => {
  const schoolId: UUID = "11111111-1111-1111-1111-111111111111";
  const financeUserId: UUID = "44444444-4444-4444-4444-444444444444";
  const catIncome: UUID = "00000000-0005-0000-0000-000000000001";
  const catIngredient: UUID = "00000000-0005-0000-0000-000000000003";
  const catCookWage: UUID = "00000000-0005-0000-0000-000000000004";
  const catGas: UUID = "00000000-0005-0000-0000-000000000005";

  test("Record Grant Income increases total income and budget", () => {
    const transactions: FinancialTransaction[] = [];
    const payments: FinancialPayment[] = [];

    const incomeTx = FinanceService.recordGrantIncome({
      school_id: schoolId,
      amount: 99000.0,
      budget_name: "เงินอุดหนุนอาหารกลางวันงวดที่ 1/2569",
      category_id: catIncome,
      actor_id: financeUserId,
      reference_no: "สถ.001/2569",
      transactions,
      payments,
    });

    assert.ok(incomeTx.document_no.startsWith("FIN-"));
    assert.equal(incomeTx.total_amount, 99000.0);
    assert.equal(incomeTx.transaction_type, "INCOME");
    assert.equal(incomeTx.status, "POSTED");

    assert.equal(transactions.length, 1);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amount, 99000.0);

    const summary = FinanceService.calculateFinancialSummary(transactions, 198000, 90);
    assert.equal(summary.totalIncome, 99000.0);
    assert.equal(summary.totalExpenses, 0);
  });

  test("T-018: Post Receiving Expense reflects actual accepted items without double-counting PO", () => {
    const transactions: FinancialTransaction[] = [];
    const transactionItems: FinancialTransactionItem[] = [];
    const payments: FinancialPayment[] = [];

    const rcvRecord: ReceivingRecord = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      document_no: "RCV-2569-000001",
      purchase_order_id: crypto.randomUUID(),
      received_at: new Date().toISOString(),
      received_by: financeUserId,
      status: "ACCEPTED",
    };

    // Received items: 9 kg chicken @ 85 THB (765 THB), 10 kg rice @ 38 THB (380 THB) -> total = 1145 THB
    const chickenUnitId: UUID = crypto.randomUUID();
    const riceUnitId: UUID = crypto.randomUUID();

    const rcvItems: ReceivingItem[] = [
      {
        id: crypto.randomUUID(),
        receiving_record_id: rcvRecord.id,
        purchase_order_item_id: crypto.randomUUID(),
        received_quantity: 9.0,
        accepted_quantity: 9.0, // Accepted
        rejected_quantity: 0,
        unit_id: chickenUnitId,
        inspection_status: "ACCEPTED",
      },
      {
        id: crypto.randomUUID(),
        receiving_record_id: rcvRecord.id,
        purchase_order_item_id: crypto.randomUUID(),
        received_quantity: 10.0,
        accepted_quantity: 10.0, // Accepted
        rejected_quantity: 0,
        unit_id: riceUnitId,
        inspection_status: "ACCEPTED",
      },
    ];

    const priceMap = new Map<UUID, number>();
    priceMap.set(chickenUnitId, 85.0);
    priceMap.set(riceUnitId, 38.0);

    const expenseTx = FinanceService.postReceivingExpense({
      school_id: schoolId,
      receiving_record: rcvRecord,
      receiving_items: rcvItems,
      ingredient_prices: priceMap,
      category_id: catIngredient,
      actor_id: financeUserId,
      transactions,
      transaction_items: transactionItems,
      payments,
    });

    assert.equal(expenseTx.total_amount, 1145.0);
    assert.equal(expenseTx.transaction_type, "EXPENSE");
    assert.equal(expenseTx.status, "POSTED");
    assert.equal(expenseTx.source_id, rcvRecord.id);

    assert.equal(transactionItems.length, 2);
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amount, 1145.0);

    const summary = FinanceService.calculateFinancialSummary(transactions, 198000, 90);
    assert.equal(summary.totalExpenses, 1145.0);
    assert.equal(summary.ingredientExpense, 1145.0);
    assert.equal(summary.netRemainingBudget, 198000 - 1145);
  });

  test("Record Operational Expense (Cook Wage & Gas) and Reversal Transaction", () => {
    const transactions: FinancialTransaction[] = [];
    const transactionItems: FinancialTransactionItem[] = [];
    const payments: FinancialPayment[] = [];

    // 1. Cook wage expense: 500 THB/day
    const cookTx = FinanceService.recordOperationalExpense({
      school_id: schoolId,
      category_id: catCookWage,
      amount: 500.0,
      description: "ค่าจ้างเหมาผู้ประกอบอาหาร ประจำวันที่ 5 พ.ย. 2569",
      actor_id: financeUserId,
      transactions,
      transaction_items: transactionItems,
      payments,
    });
    assert.equal(cookTx.total_amount, 500.0);

    // 2. LPG Gas refill expense: 450 THB
    const gasTx = FinanceService.recordOperationalExpense({
      school_id: schoolId,
      category_id: catGas,
      amount: 450.0,
      description: "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. 1 ถัง",
      actor_id: financeUserId,
      transactions,
      transaction_items: transactionItems,
      payments,
    });
    assert.equal(gasTx.total_amount, 450.0);

    // Total expense so far = 500 + 450 = 950
    let summary = FinanceService.calculateFinancialSummary(transactions, 198000, 90);
    assert.equal(summary.totalExpenses, 950.0);
    assert.equal(summary.operationalExpense, 950.0);

    // 3. Reversal: Gas bill was incorrectly recorded twice, reverse it!
    const reversalTx = FinanceService.reverseTransaction({
      school_id: schoolId,
      target_transaction_id: gasTx.id,
      reason: "บันทึกซ้ำซ้อน ดำเนินการกลับรายการยอด 450 บาท",
      actor_id: financeUserId,
      transactions,
    });

    assert.equal(gasTx.status, "REVERSED");
    assert.equal(reversalTx.total_amount, -450.0); // Offsetting negative

    // Summary after reversal = 950 - 450 = 500 THB
    summary = FinanceService.calculateFinancialSummary(transactions, 198000, 90);
    assert.equal(summary.totalExpenses, 500.0);
  });

  test("CSV Export generates standard UTF-8 BOM for Excel with Thai characters", () => {
    const transactions: FinancialTransaction[] = [
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        document_no: "FIN-2569-000001",
        transaction_date: "2026-11-05",
        transaction_type: "INCOME",
        status: "POSTED",
        total_amount: 99000.0,
        category_id: catIncome,
        created_by: financeUserId,
        notes: "รับจัดสรรงบประมาณ งวดที่ 1",
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        document_no: "FIN-2569-000002",
        transaction_date: "2026-11-05",
        transaction_type: "EXPENSE",
        status: "POSTED",
        total_amount: 1145.0,
        category_id: catIngredient,
        created_by: financeUserId,
        notes: "ค่าวัตถุดิบทำข้าวมันไก่",
      },
    ];

    const csv = FinanceService.exportToCSV(transactions);
    assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel compatibility");
    assert.match(csv, /FIN-2569-000001/);
    assert.match(csv, /รายรับ/);
    assert.match(csv, /99000\.00/);
    assert.match(csv, /ค่าวัตถุดิบทำข้าวมันไก่/);
  });
});

import {
  BudgetAllocation,
  FinancialCategory,
  FinancialPayment,
  FinancialSummary,
  FinancialTransaction,
  FinancialTransactionItem,
  ReceivingItem,
  ReceivingRecord,
  UUID,
} from "@/types";
import { AuditLogger } from "../audit/logger";

export class FinanceService {
  private static finSequence = 1;

  public static generateFINNumber(year: number = 2569): string {
    const padded = String(this.finSequence++).padStart(6, "0");
    return `FIN-${year}-${padded}`;
  }

  /**
   * Records a government or local authority lunch grant allocation (Spec 7.8)
   */
  public static recordGrantIncome(params: {
    school_id: UUID;
    amount: number;
    budget_name: string;
    fiscal_year?: number;
    category_id: UUID;
    actor_id: UUID;
    reference_no?: string;
    transactions: FinancialTransaction[];
    payments: FinancialPayment[];
  }): FinancialTransaction {
    const {
      school_id,
      amount,
      budget_name,
      category_id,
      actor_id,
      reference_no,
      transactions,
      payments,
    } = params;

    if (amount <= 0) {
      throw new Error("Validation Error: Grant income amount must be greater than 0");
    }

    const txId: UUID = crypto.randomUUID();
    const docNo = this.generateFINNumber();

    const transaction: FinancialTransaction = {
      id: txId,
      school_id,
      document_no: docNo,
      transaction_date: new Date().toISOString().split("T")[0],
      transaction_type: "INCOME",
      status: "POSTED",
      total_amount: Number(amount.toFixed(2)),
      category_id,
      source_type: "GRANT_ALLOCATION",
      created_by: actor_id,
      posted_at: new Date().toISOString(),
      notes: `รับจัดสรรงบประมาณ: ${budget_name} ${reference_no ? `(อ้างอิง ${reference_no})` : ""}`,
      created_at: new Date().toISOString(),
    };

    transactions.push(transaction);

    // Record corresponding payment receipt
    payments.push({
      id: crypto.randomUUID(),
      school_id,
      financial_transaction_id: txId,
      payment_date: new Date().toISOString().split("T")[0],
      amount: Number(amount.toFixed(2)),
      payment_method: "BANK_TRANSFER",
      reference_no,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
    });

    return transaction;
  }

  /**
   * Posts actual food ingredient expense directly from Morning Receiving Record (Spec 7.8 & Test T-018)
   * Prevents double counting: Expense is recognized ONLY upon inspection acceptance.
   */
  public static postReceivingExpense(params: {
    school_id: UUID;
    receiving_record: ReceivingRecord;
    receiving_items: ReceivingItem[];
    ingredient_prices: Map<UUID, number>; // ingredient_id -> unit_price
    category_id: UUID;
    actor_id: UUID;
    transactions: FinancialTransaction[];
    transaction_items: FinancialTransactionItem[];
    payments: FinancialPayment[];
  }): FinancialTransaction {
    const {
      school_id,
      receiving_record,
      receiving_items,
      ingredient_prices,
      category_id,
      actor_id,
      transactions,
      transaction_items,
      payments,
    } = params;

    const txId: UUID = crypto.randomUUID();
    const docNo = this.generateFINNumber();

    let totalExpense = 0;
    const itemsToCreate: FinancialTransactionItem[] = [];

    for (const rcvItem of receiving_items) {
      // Expense calculated ONLY for accepted quantity
      if (rcvItem.accepted_quantity > 0) {
        const unitPrice = ingredient_prices.get(rcvItem.unit_id) || 35.0; // fallback if price not passed
        const lineAmount = Number((rcvItem.accepted_quantity * unitPrice).toFixed(2));
        totalExpense += lineAmount;

        itemsToCreate.push({
          id: crypto.randomUUID(),
          financial_transaction_id: txId,
          description: `ค่าวัตถุดิบจากการตรวจรับ ${receiving_record.document_no}`,
          quantity: rcvItem.accepted_quantity,
          unit_price: unitPrice,
          amount: lineAmount,
        });
      }
    }

    const transaction: FinancialTransaction = {
      id: txId,
      school_id,
      document_no: docNo,
      transaction_date: new Date().toISOString().split("T")[0],
      transaction_type: "EXPENSE",
      status: "POSTED",
      total_amount: Number(totalExpense.toFixed(2)),
      category_id,
      source_type: "RECEIVING_RECORD",
      source_id: receiving_record.id,
      created_by: actor_id,
      posted_at: new Date().toISOString(),
      notes: `ตัดจ่ายค่าวัตถุดิบตามใบตรวจรับ ${receiving_record.document_no}`,
      created_at: new Date().toISOString(),
    };

    transactions.push(transaction);
    transaction_items.push(...itemsToCreate);

    // Cash disbursement payment
    payments.push({
      id: crypto.randomUUID(),
      school_id,
      financial_transaction_id: txId,
      payment_date: new Date().toISOString().split("T")[0],
      amount: Number(totalExpense.toFixed(2)),
      payment_method: "CASH",
      reference_no: receiving_record.document_no,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
    });

    return transaction;
  }

  /**
   * Records miscellaneous kitchen operational expense (Spec 7.8)
   * e.g. Cook wages, LPG cooking gas refill, kitchen sanitation supplies
   */
  public static recordOperationalExpense(params: {
    school_id: UUID;
    category_id: UUID;
    amount: number;
    description: string;
    actor_id: UUID;
    payment_method?: "CASH" | "BANK_TRANSFER";
    transactions: FinancialTransaction[];
    transaction_items: FinancialTransactionItem[];
    payments: FinancialPayment[];
  }): FinancialTransaction {
    const {
      school_id,
      category_id,
      amount,
      description,
      actor_id,
      payment_method = "CASH",
      transactions,
      transaction_items,
      payments,
    } = params;

    if (amount <= 0) {
      throw new Error("Validation Error: Operational expense amount must be greater than 0");
    }

    const txId: UUID = crypto.randomUUID();
    const docNo = this.generateFINNumber();

    const transaction: FinancialTransaction = {
      id: txId,
      school_id,
      document_no: docNo,
      transaction_date: new Date().toISOString().split("T")[0],
      transaction_type: "EXPENSE",
      status: "POSTED",
      total_amount: Number(amount.toFixed(2)),
      category_id,
      source_type: "OPERATIONAL_EXPENSE",
      created_by: actor_id,
      posted_at: new Date().toISOString(),
      notes: description,
      created_at: new Date().toISOString(),
    };

    transactions.push(transaction);

    transaction_items.push({
      id: crypto.randomUUID(),
      financial_transaction_id: txId,
      description,
      amount: Number(amount.toFixed(2)),
    });

    payments.push({
      id: crypto.randomUUID(),
      school_id,
      financial_transaction_id: txId,
      payment_date: new Date().toISOString().split("T")[0],
      amount: Number(amount.toFixed(2)),
      payment_method,
      status: "COMPLETED",
      created_at: new Date().toISOString(),
    });

    return transaction;
  }

  /**
   * Reverses a posted transaction (Spec 7.8 / Test T-018 Reversal)
   * Posted transactions can NEVER be edited directly; only reversed.
   */
  public static reverseTransaction(params: {
    school_id: UUID;
    target_transaction_id: UUID;
    reason: string;
    actor_id: UUID;
    transactions: FinancialTransaction[];
  }): FinancialTransaction {
    const { school_id, target_transaction_id, reason, actor_id, transactions } = params;

    const target = transactions.find((t) => t.id === target_transaction_id);
    if (!target) {
      throw new Error(`Target financial transaction not found: ${target_transaction_id}`);
    }

    if (target.status === "REVERSED") {
      throw new Error("Validation Error: Transaction has already been reversed");
    }

    // Mark original as REVERSED
    target.status = "REVERSED";

    const reversalDocNo = this.generateFINNumber();
    const reversalType = target.transaction_type === "EXPENSE" ? "ADJUSTMENT" : "REVERSAL";

    const reversalTx: FinancialTransaction = {
      id: crypto.randomUUID(),
      school_id,
      document_no: reversalDocNo,
      transaction_date: new Date().toISOString().split("T")[0],
      transaction_type: reversalType,
      status: "POSTED",
      total_amount: -target.total_amount, // Offsetting negative
      category_id: target.category_id,
      source_type: "TRANSACTION_REVERSAL",
      source_id: target.id,
      created_by: actor_id,
      posted_at: new Date().toISOString(),
      notes: `กลับรายการของ ${target.document_no}: ${reason}`,
      created_at: new Date().toISOString(),
    };

    transactions.push(reversalTx);
    return reversalTx;
  }

  /**
   * Calculates comprehensive financial summary (Spec 7.8 & 9.12)
   */
  public static calculateFinancialSummary(
    transactions: FinancialTransaction[],
    allocatedBudgetTotal: number = 198000,
    averageDiners: number = 90
  ): FinancialSummary {
    let totalIncome = 0;
    let totalExpenses = 0;
    let ingredientExpense = 0;
    let operationalExpense = 0;

    for (const tx of transactions) {
      if (tx.status === "POSTED" || tx.status === "REVERSED") {
        if (tx.transaction_type === "INCOME") {
          totalIncome += tx.total_amount;
        } else if (tx.transaction_type === "EXPENSE" || tx.transaction_type === "ADJUSTMENT") {
          totalExpenses += tx.total_amount;
          if (tx.source_type === "RECEIVING_RECORD") {
            ingredientExpense += tx.total_amount;
          } else {
            operationalExpense += tx.total_amount;
          }
        }
      }
    }

    const netRemainingBudget = Number((allocatedBudgetTotal - totalExpenses).toFixed(2));
    const averageCostPerHead =
      averageDiners > 0 ? Number((totalExpenses / (averageDiners * 20)).toFixed(2)) : 0; // estimated 20 school days

    return {
      allocatedBudget: allocatedBudgetTotal,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netRemainingBudget,
      ingredientExpense: Number(ingredientExpense.toFixed(2)),
      operationalExpense: Number(operationalExpense.toFixed(2)),
      averageCostPerHead,
    };
  }

  /**
   * Exports financial ledger to standard UTF-8 CSV with Thai BOM for Excel (Spec 9.14)
   */
  public static exportToCSV(transactions: FinancialTransaction[]): string {
    const BOM = "\uFEFF";
    const headers = ["เลขที่เอกสาร", "วันที่", "ประเภท", "สถานะ", "จำนวนเงิน (บาท)", "หมายเหตุ"];

    const rows = transactions.map((tx) => [
      tx.document_no,
      tx.transaction_date,
      tx.transaction_type === "INCOME" ? "รายรับ" : "รายจ่าย",
      tx.status,
      tx.total_amount.toFixed(2),
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    return BOM + csvContent;
  }
}

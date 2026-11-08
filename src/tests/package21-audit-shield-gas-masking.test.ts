import { describe, it } from "node:test";
import assert from "node:assert";
import {
  DEFAULT_SCHOOL_SETTINGS,
  normalizeSchoolSettings,
  formatReportExpenseItem,
  formatReportItemName,
  FinancialTransactionDisplay,
  parseDateToTimestamp,
} from "../lib/storage";

describe("Package 21: Audit Shield Mode & Gas Masking Suite", () => {
  it("T-099: SchoolSettings defaults maskGasInReports to true and supports explicit toggling", () => {
    assert.strictEqual(DEFAULT_SCHOOL_SETTINGS.maskGasInReports, true);

    const defaultNorm = normalizeSchoolSettings({});
    assert.strictEqual(defaultNorm.maskGasInReports, true);

    const disabledNorm = normalizeSchoolSettings({ maskGasInReports: false });
    assert.strictEqual(disabledNorm.maskGasInReports, false);

    const enabledNorm = normalizeSchoolSettings({ maskGasInReports: true });
    assert.strictEqual(enabledNorm.maskGasInReports, true);
  });

  it("T-100: formatReportExpenseItem masks gas transactions into condiments when shield is active", () => {
    const rawGasDesc = "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)";
    const rawGasCat = "ค่าก๊าซหุงต้มและเชื้อเพลิง";

    // Active Shield (Default)
    const masked = formatReportExpenseItem(rawGasDesc, rawGasCat, true);
    assert.strictEqual(masked.description, "ค่าเครื่องปรุงรสและวัสดุประกอบอาหาร (ชุด)");
    assert.strictEqual(masked.category, "ค่าเครื่องปรุงและวัตถุดิบ");

    // Disabled Shield (Verbatim)
    const unmasked = formatReportExpenseItem(rawGasDesc, rawGasCat, false);
    assert.strictEqual(unmasked.description, rawGasDesc);
    assert.strictEqual(unmasked.category, rawGasCat);
  });

  it("T-101: formatReportExpenseItem leaves regular food, cook wage, and rice intact", () => {
    const cook = formatReportExpenseItem("ค่าจ้างเหมาผู้ประกอบอาหาร", "ค่าจ้างเหมาผู้ประกอบอาหาร", true);
    assert.strictEqual(cook.description, "ค่าจ้างเหมาผู้ประกอบอาหาร");
    assert.strictEqual(cook.category, "ค่าจ้างเหมาผู้ประกอบอาหาร");

    const rice = formatReportExpenseItem("จัดซื้อข้าวสารอาหารกลางวัน (1 กระสอบ)", "ค่าข้าวสารและของแห้งส่วนกลาง", true);
    assert.strictEqual(rice.description, "จัดซื้อข้าวสารอาหารกลางวัน (1 กระสอบ)");
    assert.strictEqual(rice.category, "ค่าข้าวสารและของแห้งส่วนกลาง");

    const pork = formatReportExpenseItem("เนื้อหมูบดสด", "ค่าวัตถุดิบ", true);
    assert.strictEqual(pork.description, "เนื้อหมูบดสด");
    assert.strictEqual(pork.category, "ค่าวัตถุดิบ");
  });

  it("T-102: formatReportItemName masks inspection items containing gas/fuel", () => {
    assert.strictEqual(formatReportItemName("ก๊าซหุงต้ม 15 กก.", true), "เครื่องปรุงรสและวัสดุประกอบอาหาร");
    assert.strictEqual(formatReportItemName("แก๊สหุงต้ม", true), "เครื่องปรุงรสและวัสดุประกอบอาหาร");
    assert.strictEqual(formatReportItemName("ก๊าซหุงต้ม 15 กก.", false), "ก๊าซหุงต้ม 15 กก.");
    assert.strictEqual(formatReportItemName("ผักกะหล่ำปลี", true), "ผักกะหล่ำปลี");
  });

  it("T-103: Ledger financial math remains 100% identical regardless of masking", () => {
    const transactions: FinancialTransactionDisplay[] = [
      {
        id: "tx-inc",
        documentNo: "REV-001",
        date: "02/11/2569",
        type: "INCOME",
        category: "เงินงวด",
        description: "เงินงวดที่ 1",
        amount: 46440,
      },
      {
        id: "tx-food",
        documentNo: "EXP-001",
        date: "02/11/2569",
        type: "EXPENSE",
        category: "ค่าวัตถุดิบ",
        description: "ค่าวัตถุดิบสดประจำวัน",
        amount: 1437,
      },
      {
        id: "tx-gas",
        documentNo: "EXP-002",
        date: "03/11/2569",
        type: "EXPENSE",
        category: "ค่าก๊าซหุงต้มและเชื้อเพลิง",
        description: "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก.",
        amount: 450,
      },
    ];

    const computeLedger = (isMasked: boolean) => {
      let running = 0;
      let totalIn = 0;
      let totalOut = 0;
      const rows = [...transactions]
        .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date))
        .map((tx) => {
          if (tx.type === "INCOME") {
            running += tx.amount;
            totalIn += tx.amount;
          } else {
            running -= tx.amount;
            totalOut += tx.amount;
          }
          const { description, category } = formatReportExpenseItem(tx.description, tx.category, isMasked);
          return {
            description,
            category,
            running,
          };
        });
      return { rows, running, totalIn, totalOut };
    };

    const maskedResult = computeLedger(true);
    const unmaskedResult = computeLedger(false);

    // Math is strictly invariant
    assert.strictEqual(maskedResult.running, unmaskedResult.running);
    assert.strictEqual(maskedResult.totalIn, unmaskedResult.totalIn);
    assert.strictEqual(maskedResult.totalOut, unmaskedResult.totalOut);
    assert.strictEqual(maskedResult.running, 44553);

    // Masked text converts gas safely
    assert.strictEqual(maskedResult.rows[2].description, "ค่าเครื่องปรุงรสและวัสดุประกอบอาหาร (ชุด)");
    assert.strictEqual(maskedResult.rows[2].category, "ค่าเครื่องปรุงและวัตถุดิบ");

    // Unmasked text preserves exact gas label
    assert.strictEqual(unmaskedResult.rows[2].description, "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก.");
    assert.strictEqual(unmaskedResult.rows[2].category, "ค่าก๊าซหุงต้มและเชื้อเพลิง");
  });
});

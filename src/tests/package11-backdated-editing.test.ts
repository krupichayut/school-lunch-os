import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  toISODate,
  formatThaiDateShort,
  formatThaiDateFull,
  parseDateToTimestamp,
  DEFAULT_WEEKDAY_DATES,
  getDayDefaultDate,
  FinancialTransactionDisplay,
} from "../lib/storage";

describe("Package 11: Backdated and Editable Records Suite", () => {
  test("T-049: toISODate safely parses Thai Buddhist Era slashes (02/11/2569 -> 2026-11-02) and ISO strings", () => {
    assert.equal(toISODate("02/11/2569"), "2026-11-02");
    assert.equal(toISODate("27/11/2569"), "2026-11-27");
    assert.equal(toISODate("2026-11-02"), "2026-11-02");
    assert.equal(toISODate("2569-11-02"), "2026-11-02");
  });

  test("T-050: formatThaiDateShort and formatThaiDateFull produce proper Thai date strings", () => {
    const shortDate = formatThaiDateShort("2026-11-02");
    assert.equal(shortDate, "2 พ.ย. 2569");

    const fullDate = formatThaiDateFull("2026-11-02");
    assert.equal(fullDate, "วันที่ 2 พฤศจิกายน พ.ศ. 2569");
  });

  test("T-051: parseDateToTimestamp allows chronological sorting of historical transactions across dates", () => {
    const tx1: FinancialTransactionDisplay = {
      id: "tx-friday",
      documentNo: "FIN-003",
      date: "6 พ.ย. 2569",
      type: "EXPENSE",
      category: "ค่าวัตถุดิบ",
      description: "ค่าวัตถุดิบวันศุกร์",
      amount: 1200,
    };
    const tx2: FinancialTransactionDisplay = {
      id: "tx-monday",
      documentNo: "FIN-001",
      date: "2 พ.ย. 2569",
      type: "INCOME",
      category: "เงินอุดหนุน",
      description: "รับเงินจัดสรรงวดที่ 1",
      amount: 46440,
    };
    const tx3: FinancialTransactionDisplay = {
      id: "tx-wednesday",
      documentNo: "FIN-002",
      date: "4 พ.ย. 2569",
      type: "EXPENSE",
      category: "ค่าวัตถุดิบ",
      description: "ค่าวัตถุดิบวันพุธ",
      amount: 1100,
    };

    const unsorted = [tx1, tx2, tx3];
    const sorted = [...unsorted].sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));

    assert.equal(sorted[0].id, "tx-monday");
    assert.equal(sorted[1].id, "tx-wednesday");
    assert.equal(sorted[2].id, "tx-friday");
  });

  test("T-052: Editing a financial transaction updates fields without mutating ID or creating duplicate records", () => {
    const originalTx: FinancialTransactionDisplay = {
      id: "tx-100",
      documentNo: "FIN-2569-000001",
      date: "2 พ.ย. 2569",
      type: "EXPENSE",
      category: "ค่าก๊าซหุงต้มและเชื้อเพลิง",
      description: "ค่าก๊าซหุงต้ม ปตท 15 กก",
      amount: 450,
    };

    const list = [originalTx];

    // User edits amount to 460 and fixes description
    const edited = list.map((t) => {
      if (t.id === "tx-100") {
        return {
          ...t,
          amount: 460,
          description: "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)",
          date: formatThaiDateShort("2026-11-03"),
        };
      }
      return t;
    });

    assert.equal(edited.length, 1);
    assert.equal(edited[0].id, "tx-100");
    assert.equal(edited[0].amount, 460);
    assert.equal(edited[0].date, "3 พ.ย. 2569");
    assert.equal(edited[0].description, "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)");
  });

  test("T-053: DayPlan inspectionDate defaults to Round 1 weekday dates (Mon 2 Nov, Tue 3 Nov, etc.)", () => {
    assert.equal(DEFAULT_WEEKDAY_DATES.monday, "2026-11-02");
    assert.equal(DEFAULT_WEEKDAY_DATES.tuesday, "2026-11-03");
    assert.equal(DEFAULT_WEEKDAY_DATES.wednesday, "2026-11-04");
    assert.equal(DEFAULT_WEEKDAY_DATES.thursday, "2026-11-05");
    assert.equal(DEFAULT_WEEKDAY_DATES.friday, "2026-11-06");

    assert.equal(getDayDefaultDate("monday", "2026-11-02"), "2026-11-02");
    assert.equal(getDayDefaultDate("friday", "2026-11-02"), "2026-11-06");
  });
});

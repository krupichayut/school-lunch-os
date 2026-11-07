import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  generateExcelTemplateBuffer,
  parseIngredientsExcel,
  sanitizeNumber,
  sanitizeText,
  toMenuItems,
  SAMPLE_TEMPLATE_ROWS,
} from "../lib/excel-importer";

describe("Package 7: Excel Ingredient Importer Tests", () => {
  test("T-026: Sanitize number handles strings, commas, decimals and invalid input", () => {
    assert.equal(sanitizeNumber("1,200.50"), 1200.5);
    assert.equal(sanitizeNumber(" 75 "), 75);
    assert.equal(sanitizeNumber("0.5"), 0.5);
    assert.equal(sanitizeNumber(1437.25), 1437.25);
    assert.equal(sanitizeNumber("abc"), 0);
    assert.equal(sanitizeNumber(null), 0);
    assert.equal(sanitizeNumber(undefined), 0);
  });

  test("T-027: Sanitize text trims and strips zero-width non-printable characters", () => {
    assert.equal(sanitizeText("  ไก่สด  "), "ไก่สด");
    assert.equal(sanitizeText("\uFEFFกะทิสด\u200B"), "กะทิสด");
    assert.equal(sanitizeText(null), "");
    assert.equal(sanitizeText(undefined), "");
  });

  test("T-028: generateExcelTemplateBuffer produces a readable XLSX workbook with Thai headers", () => {
    const buffer = generateExcelTemplateBuffer();
    assert.ok(buffer instanceof Uint8Array, "Must return Uint8Array");
    assert.ok(buffer.length > 0, "Buffer must not be empty");

    // Read back with XLSX
    const wb = XLSX.read(buffer, { type: "array" });
    assert.ok(wb.SheetNames.includes("รายการวัตถุดิบ"), "Must contain standard sheet name");

    const result = parseIngredientsExcel(buffer);
    assert.equal(result.error, undefined, "Must parse without error");
    assert.equal(result.items.length, SAMPLE_TEMPLATE_ROWS.length, "Must match sample rows count");
    assert.equal(result.validCount, SAMPLE_TEMPLATE_ROWS.length, "All sample rows must be valid");
    assert.equal(result.invalidCount, 0);

    // Verify first row
    assert.equal(result.items[0].name, "ไก่สด (น่องติดสะโพก)");
    assert.equal(result.items[0].qty, 7);
    assert.equal(result.items[0].unit, "กก.");
    assert.equal(result.items[0].unitPrice, 75);
    assert.equal(result.items[0].totalPrice, 525);

    // Verify total cost sum
    const expectedSum = SAMPLE_TEMPLATE_ROWS.reduce((sum, r) => sum + r.qty * r.price, 0);
    assert.equal(result.totalCost, expectedSum);
  });

  test("T-029: Smart header detection works with custom row offsets and varied Thai aliases", () => {
    const customData = [
      ["แบบฟอร์มจัดซื้อวัตถุดิบประจำวัน โรงเรียนอนุบาลเทศบาล"],
      ["เมนู: แกงจืดเต้าหู้หมูสับสาหร่าย"],
      ["ที่", "ชื่อวัตถุดิบ", "ปริมาณ", "หน่วย", "ราคา/หน่วย (บาท)", "เป็นเงิน"],
      [1, "เต้าหู้ไข่", "10", "หลอด", "12", "120"],
      [2, "หมูบด", "3.5", "กก.", "150", "525"],
      [3, "สาหร่ายวากาเมะ", "1", "ซอง", "45", "45"],
      ["", "รวมทั้งสิ้น", "", "", "", "690"], // summary row to be ignored
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(customData);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const result = parseIngredientsExcel(buffer);
    assert.equal(result.error, undefined);
    assert.equal(result.detectedMenuName, "แกงจืดเต้าหู้หมูสับสาหร่าย");
    assert.equal(result.items.length, 3, "Summary row must be skipped");
    assert.equal(result.items[0].name, "เต้าหู้ไข่");
    assert.equal(result.items[0].qty, 10);
    assert.equal(result.items[0].unit, "หลอด");
    assert.equal(result.items[0].unitPrice, 12);
    assert.equal(result.totalCost, 690);
  });

  test("T-030: toMenuItems converts valid parsed items into standard MenuItem data structure", () => {
    const buffer = generateExcelTemplateBuffer();
    const parsed = parseIngredientsExcel(buffer);
    const menuItems = toMenuItems(parsed.items);

    assert.equal(menuItems.length, SAMPLE_TEMPLATE_ROWS.length);
    menuItems.forEach((item) => {
      assert.ok(item.id.startsWith("ing-"), "Must have standard ID prefix");
      assert.ok(item.name.length > 0, "Name must not be empty");
      assert.ok(item.qty > 0, "Qty must be greater than 0");
      assert.ok(item.unitPrice >= 0, "UnitPrice must not be negative");
    });
  });

  test("T-031: Resilient handling of corrupt or empty spreadsheet buffer", () => {
    const corruptBuffer = new Uint8Array([0, 1, 2, 3, 4]);
    const result = parseIngredientsExcel(corruptBuffer);
    assert.ok(result.error !== undefined, "Must gracefully report error instead of throwing");
    assert.equal(result.items.length, 0);
  });
});

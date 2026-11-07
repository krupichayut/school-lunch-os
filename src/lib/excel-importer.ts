import * as XLSX from "xlsx";
import { MenuItem } from "./storage";

export interface ParsedIngredientItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isValid: boolean;
  validationError?: string;
}

export interface ExcelImportResult {
  detectedMenuName?: string;
  sheetNames: string[];
  selectedSheet: string;
  items: ParsedIngredientItem[];
  totalCost: number;
  validCount: number;
  invalidCount: number;
  error?: string;
}

/**
 * Standard sample ingredients matching real Thai school lunch recipes
 */
export const SAMPLE_TEMPLATE_ROWS = [
  { no: 1, name: "ไก่สด (น่องติดสะโพก)", qty: 7, unit: "กก.", price: 75 },
  { no: 2, name: "กะทิสด", qty: 2, unit: "กก.", price: 80 },
  { no: 3, name: "เครื่องแกงเผ็ด", qty: 0.5, unit: "กก.", price: 120 },
  { no: 4, name: "กะปิแท้", qty: 0.5, unit: "กก.", price: 60 },
  { no: 5, name: "ฟักทอง", qty: 3, unit: "กก.", price: 40 },
  { no: 6, name: "กะหล่ำปลี", qty: 3, unit: "กก.", price: 40 },
  { no: 7, name: "มะเขือเทศ", qty: 1, unit: "กก.", price: 20 },
  { no: 8, name: "วุ้นเส้น", qty: 1, unit: "ถุง", price: 20 },
  { no: 9, name: "ไข่ไก่ (เบอร์ 3)", qty: 1, unit: "แผง", price: 132 },
  { no: 10, name: "ผลไม้ตามฤดูกาล", qty: 1, unit: "กก.", price: 250 },
];

/**
 * Generates an Excel (.xlsx) workbook buffer for standard school lunch ingredients
 */
export function generateExcelTemplateBuffer(): Uint8Array {
  const wb = XLSX.utils.book_new();

  const data: (string | number)[][] = [
    ["ลำดับ", "รายการวัตถุดิบ", "จำนวน", "หน่วยนับ", "ราคาต่อหน่วย (บาท)", "รวมเป็นเงิน (บาท)"],
  ];

  SAMPLE_TEMPLATE_ROWS.forEach((r, idx) => {
    const rowIdx = idx + 2;
    data.push([
      r.no,
      r.name,
      r.qty,
      r.unit,
      r.price,
      r.qty * r.price, // formula-friendly fallback numeric value
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for comfortable reading
  ws["!cols"] = [
    { wch: 8 },  // ลำดับ
    { wch: 32 }, // รายการวัตถุดิบ
    { wch: 12 }, // จำนวน
    { wch: 12 }, // หน่วยนับ
    { wch: 20 }, // ราคาต่อหน่วย
    { wch: 20 }, // รวมเป็นเงิน
  ];

  XLSX.utils.book_append_sheet(wb, ws, "รายการวัตถุดิบ");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(wbout);
}

/**
 * Triggers a client-side download of the Excel template
 */
export function downloadExcelTemplate(filename = "แบบฟอร์มรายการวัตถุดิบอาหารกลางวัน.xlsx"): void {
  if (typeof window === "undefined" || !window.document) return;

  const buffer = generateExcelTemplateBuffer();
  const blob = new Blob([buffer.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes and parses number strings (handles Thai numbers, commas e.g. "1,200.50")
 */
export function sanitizeNumber(value: unknown): number {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : Math.round(value * 100) / 100;
  }
  if (!value) return 0;
  const str = String(value).replace(/,/g, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

/**
 * Sanitizes Thai and text strings (removes quotes, trailing spaces, zero-width spaces)
 */
export function sanitizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width characters
    .trim();
}

/**
 * Parses raw ArrayBuffer or Uint8Array of .xlsx, .xls, or .csv file into structured ingredients
 */
export function parseIngredientsExcel(
  data: ArrayBuffer | Uint8Array,
  sheetIndexOrName: number | string = 0
): ExcelImportResult {
  try {
    const wb = XLSX.read(data, { type: "array" });
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return {
        sheetNames: [],
        selectedSheet: "",
        items: [],
        totalCost: 0,
        validCount: 0,
        invalidCount: 0,
        error: "ไม่พบชีตข้อมูลในไฟล์ Excel",
      };
    }

    let selectedSheet = sheetNames[0];
    if (typeof sheetIndexOrName === "number" && sheetNames[sheetIndexOrName]) {
      selectedSheet = sheetNames[sheetIndexOrName];
    } else if (typeof sheetIndexOrName === "string" && sheetNames.includes(sheetIndexOrName)) {
      selectedSheet = sheetIndexOrName;
    }

    const ws = wb.Sheets[selectedSheet];
    if (!ws) {
      return {
        sheetNames,
        selectedSheet,
        items: [],
        totalCost: 0,
        validCount: 0,
        invalidCount: 0,
        error: `ไม่สามารถเปิดแผ่นงาน "${selectedSheet}" ได้`,
      };
    }

    // Convert sheet to 2D array of rows
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: "",
    });

    if (rows.length === 0) {
      return {
        sheetNames,
        selectedSheet,
        items: [],
        totalCost: 0,
        validCount: 0,
        invalidCount: 0,
        error: "ไฟล์ไม่มีข้อมูลหรือเป็นแผ่นงานว่าง",
      };
    }

    // Header column matchers
    const NAME_REGEX = /รายการ|ชื่อ|วัตถุดิบ|ของสด|สินค้า|menu|item|ingredient/i;
    const QTY_REGEX = /จำนวน|ปริมาณ|qty|quantity/i;
    const UNIT_REGEX = /หน่วย|หน่วยนับ|unit/i;
    const PRICE_REGEX = /ราคา|ราคาต่อหน่วย|ราคา\/หน่วย|unitprice|price/i;
    const TOTAL_REGEX = /รวม|เป็นเงิน|ราคารวม|amount|total/i;

    let headerRowIndex = -1;
    let colName = -1;
    let colQty = -1;
    let colUnit = -1;
    let colPrice = -1;
    let detectedMenuName: string | undefined = undefined;

    // Scan first 10 rows to detect menu title and header row
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let foundName = -1;
      let foundQty = -1;
      let foundUnit = -1;
      let foundPrice = -1;

      row.forEach((cell, idx) => {
        const text = sanitizeText(cell);
        if (!text) return;

        // Detect explicit menu name (e.g., "เมนู: แกงกะทิไก่" or "ชื่อเมนู แกงจืด")
        if (!detectedMenuName) {
          const menuMatch = text.match(/(?:เมนู|ชื่อเมนู|รายการอาหาร)\s*[:：\-]?\s*([^\n\r]+)/i);
          if (menuMatch && menuMatch[1] && menuMatch[1].trim().length > 1) {
            detectedMenuName = menuMatch[1].trim();
          }
        }

        if (TOTAL_REGEX.test(text)) {
          // ignore total col from name/price
          return;
        }

        if (NAME_REGEX.test(text) && foundName === -1) {
          foundName = idx;
        } else if (QTY_REGEX.test(text) && foundQty === -1) {
          foundQty = idx;
        } else if (UNIT_REGEX.test(text) && foundUnit === -1) {
          foundUnit = idx;
        } else if (PRICE_REGEX.test(text) && foundPrice === -1) {
          foundPrice = idx;
        }
      });

      // Valid header if at least name and either (qty or price) matched
      if (foundName !== -1 && (foundQty !== -1 || foundPrice !== -1)) {
        headerRowIndex = r;
        colName = foundName;
        colQty = foundQty;
        colUnit = foundUnit;
        colPrice = foundPrice;
        break;
      }
    }

    // Fallback if no matching header found
    if (headerRowIndex === -1) {
      // Guess columns: Col 0: No., Col 1: Name, Col 2: Qty, Col 3: Unit, Col 4: Price
      headerRowIndex = 0;
      colName = 1;
      colQty = 2;
      colUnit = 3;
      colPrice = 4;
    }

    const items: ParsedIngredientItem[] = [];
    const startRow = headerRowIndex + 1;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawName = colName >= 0 && colName < row.length ? sanitizeText(row[colName]) : "";
      if (!rawName) continue; // Skip blank rows

      // Skip non-printable or corrupt rows
      if (/[\x00-\x08\x0E-\x1F]/.test(rawName)) continue;

      // Skip summary / footer rows (e.g. "รวมทั้งสิ้น", "ยอดรวม")
      if (/^(รวม|ยอดรวม|รวมทั้งสิ้น|รวมเงิน|ผู้รายงาน|ลงชื่อ)/i.test(rawName)) {
        continue;
      }

      const rawQty = colQty >= 0 && colQty < row.length ? row[colQty] : 1;
      const rawUnit = colUnit >= 0 && colUnit < row.length ? sanitizeText(row[colUnit]) : "กก.";
      const rawPrice = colPrice >= 0 && colPrice < row.length ? row[colPrice] : 0;

      const qty = sanitizeNumber(rawQty);
      const unitPrice = sanitizeNumber(rawPrice);
      const unit = rawUnit || "กก.";
      const totalPrice = Math.round(qty * unitPrice * 100) / 100;

      const validationErrors: string[] = [];
      if (qty <= 0) validationErrors.push("จำนวนต้องมากกว่า 0");
      if (unitPrice < 0) validationErrors.push("ราคาต้องไม่ติดลบ");

      const isValid = validationErrors.length === 0;

      items.push({
        id: `ing-import-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        name: rawName,
        qty: qty > 0 ? qty : 1,
        unit,
        unitPrice: unitPrice >= 0 ? unitPrice : 0,
        totalPrice,
        isValid,
        validationError: validationErrors.length > 0 ? validationErrors.join(", ") : undefined,
      });
    }

    const totalCost = items.reduce((sum, item) => sum + (item.isValid ? item.totalPrice : 0), 0);
    const validCount = items.filter((i) => i.isValid).length;
    const invalidCount = items.length - validCount;

    let error: string | undefined = undefined;
    if (items.length === 0) {
      error = "ไม่พบรายการวัตถุดิบที่ถูกต้องในไฟล์ หรือหัวตารางไม่ตรงตามรูปแบบ";
    }

    return {
      detectedMenuName,
      sheetNames,
      selectedSheet,
      items,
      totalCost: Math.round(totalCost * 100) / 100,
      validCount,
      invalidCount,
      error,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      sheetNames: [],
      selectedSheet: "",
      items: [],
      totalCost: 0,
      validCount: 0,
      invalidCount: 0,
      error: `เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${message}`,
    };
  }
}

/**
 * Converts parsed items to standard MenuItem objects
 */
export function toMenuItems(items: ParsedIngredientItem[]): MenuItem[] {
  return items
    .filter((item) => item.isValid && item.name.trim().length > 0)
    .map((item, index) => ({
      id: `ing-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name.trim(),
      qty: item.qty,
      unit: item.unit.trim() || "กก.",
      unitPrice: item.unitPrice,
    }));
}

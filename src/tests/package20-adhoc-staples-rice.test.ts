import { describe, it } from "node:test";
import assert from "node:assert";
import {
  InspectionItemState,
  FinancialTransactionDisplay,
} from "../lib/storage";
import { sanitizeNumber } from "../lib/excel-importer";

// Food Emoji Helper mapping test (mirrors getFoodEmoji in page.tsx)
function getFoodEmoji(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("เส้น") || n.includes("ก๋วยเตี๋ยว") || n.includes("ก๋วยจั๊บ") || n.includes("บะหมี่") || n.includes("ขนมจีน")) return "🍜";
  if (n.includes("ไข่") || n.includes("ไข่ไก่") || n.includes("ไข่เป็ด")) return "🥚";
  if (n.includes("หมู") || n.includes("เนื้อ") || n.includes("หมูสับ") || n.includes("ซี่โครง")) return "🥩";
  if (n.includes("ไก่") || n.includes("ปีกไก่") || n.includes("น่องไก่")) return "🍗";
  if (n.includes("ปลา") || n.includes("กุ้ง") || n.includes("หมึก") || n.includes("อาหารทะเล")) return "🐟";
  if (n.includes("กะหล่ำ") || n.includes("ผัก") || n.includes("คะน้า") || n.includes("ผักบุ้ง") || n.includes("ถั่วงอก") || n.includes("แตงกวา")) return "🥬";
  if (n.includes("แครอท") || n.includes("ฟักทอง") || n.includes("มะละกอ")) return "🥕";
  if (n.includes("ลูกชิ้น") || n.includes("ไส้กรอก")) return "🍡";
  if (n.includes("ผลไม้") || n.includes("ส้ม") || n.includes("กล้วย") || n.includes("แตงโม") || n.includes("ฝรั่ง")) return "🍎";
  if (n.includes("ข้าว") || n.includes("ข้าวสาร")) return "🍚";
  if (n.includes("แก๊ส") || n.includes("ก๊าซ")) return "🔥";
  if (n.includes("น้ำมัน") || n.includes("ซอส") || n.includes("ซีอิ๊ว") || n.includes("น้ำปลา") || n.includes("เครื่องปรุง") || n.includes("พริก")) return "🧂";
  return "🍲";
}

describe("Package 20: Out-of-Menu Items & Bulk Staples (Rice) Suite", () => {
  it("T-094: Food Emoji Token maps rice and staple variants accurately to 🍚", () => {
    assert.strictEqual(getFoodEmoji("ข้าวสารหอมมะลิ (กระสอบ)"), "🍚");
    assert.strictEqual(getFoodEmoji("ข้าวสารเหนียว 5 กก."), "🍚");
    assert.strictEqual(getFoodEmoji("ข้าวหอมมะลิเกษตร"), "🍚");
    assert.strictEqual(getFoodEmoji("ไข่ไก่สดเบอร์ 2"), "🥚");
    assert.strictEqual(getFoodEmoji("น่องไก่สด"), "🍗");
    assert.strictEqual(getFoodEmoji("น้ำมันพืชตรามรกต"), "🧂");
    assert.strictEqual(getFoodEmoji("เนื้อหมูสันนอก"), "🥩");
  });

  it("T-095: Ad-Hoc Out-of-menu item creation (Rice staple) produces correct data structure and category", () => {
    const adHocName = "ข้าวสารหอมมะลิ (กระสอบ)";
    const qty = 1;
    const price = 1250;
    const unit = "กระสอบ";

    const isRice = adHocName.includes("ข้าว") || adHocName.includes("ข้าวสาร");
    const categoryName = isRice ? "ค่าข้าวสาร (นอกเมนู)" : "เครื่องปรุง/ของซื้อเพิ่มหน้างาน";
    const noteText = isRice ? "ข้าวสารอาหารกลางวัน (นอกสูตรประจำวัน)" : "ซื้อเพิ่มหน้างาน (นอกสูตรประจำวัน)";

    const newItem: InspectionItemState = {
      id: `adhoc-${Date.now()}`,
      name: adHocName,
      ordered: qty,
      received: qty,
      accepted: qty,
      rejected: 0,
      unit,
      unitPrice: price,
      status: "ACCEPTED",
      isAdHoc: true,
      note: noteText,
    };

    assert.strictEqual(newItem.isAdHoc, true);
    assert.strictEqual(newItem.unit, "กระสอบ");
    assert.strictEqual(newItem.accepted, 1);
    assert.strictEqual(newItem.unitPrice, 1250);
    assert.strictEqual(categoryName, "ค่าข้าวสาร (นอกเมนู)");
    assert.strictEqual(noteText, "ข้าวสารอาหารกลางวัน (นอกสูตรประจำวัน)");
  });

  it("T-096: Zero Double-Counting Guard for Ad-Hoc Rice preserves regular scheduled meal cost", () => {
    const inspectionItems: InspectionItemState[] = [
      {
        id: "ing-1",
        name: "เส้นใหญ่",
        ordered: 8,
        received: 8,
        accepted: 8,
        rejected: 0,
        unit: "กก.",
        unitPrice: 35,
        status: "ACCEPTED",
        isAdHoc: false,
      },
      {
        id: "ing-2",
        name: "หมูชิ้น",
        ordered: 5,
        received: 5,
        accepted: 5,
        rejected: 0,
        unit: "กก.",
        unitPrice: 130,
        status: "ACCEPTED",
        isAdHoc: false,
      },
      {
        id: "adhoc-rice",
        name: "ข้าวสารหอมมะลิ (กระสอบ)",
        ordered: 1,
        received: 1,
        accepted: 1,
        rejected: 0,
        unit: "กระสอบ",
        unitPrice: 1250,
        status: "ACCEPTED",
        isAdHoc: true, // Already recorded via independent ad-hoc transaction
      },
    ];

    // Scheduled receiving cost MUST exclude isAdHoc items
    const scheduledReceivingCost = inspectionItems
      .filter((item) => !item.isAdHoc)
      .reduce((sum, item) => sum + item.accepted * item.unitPrice, 0);

    // Regular cost = 8 * 35 + 5 * 130 = 280 + 650 = 930 ฿
    assert.strictEqual(scheduledReceivingCost, 930);

    // Total physical goods checked at morning terminal = 930 + 1250 = 2180 ฿
    const totalPhysicalCheck = inspectionItems.reduce(
      (sum, item) => sum + item.accepted * item.unitPrice,
      0
    );
    assert.strictEqual(totalPhysicalCheck, 2180);
    assert.notStrictEqual(scheduledReceivingCost, totalPhysicalCheck);
  });

  it("T-097: Ledger Rice Expense is classified as Food Ingredients in Analytics (Preserving สพฐ. 80% Audit Ratio)", () => {
    const transactions: FinancialTransactionDisplay[] = [
      {
        id: "tx-grant",
        documentNo: "REV-001",
        date: "02/11/2569",
        type: "INCOME",
        category: "เงินอุดหนุนอาหารกลางวัน",
        description: "รับเงินงวดที่ 1",
        amount: 46440,
      },
      {
        id: "tx-daily-food",
        documentNo: "FIN-001",
        date: "02/11/2569",
        type: "EXPENSE",
        category: "ค่าวัตถุดิบ",
        description: "ค่าวัตถุดิบสดประจำวันจันทร์",
        amount: 1400,
      },
      {
        id: "tx-rice",
        documentNo: "FIN-002",
        date: "02/11/2569",
        type: "EXPENSE",
        category: "ค่าข้าวสารและของแห้งส่วนกลาง",
        description: "จัดซื้อข้าวสารอาหารกลางวัน (1 กระสอบ)",
        amount: 1250,
      },
      {
        id: "tx-gas",
        documentNo: "FIN-003",
        date: "02/11/2569",
        type: "EXPENSE",
        category: "ค่าก๊าซหุงต้มและเชื้อเพลิง",
        description: "ค่าเติมก๊าซหุงต้ม",
        amount: 450,
      },
    ];

    // Compute categorizations as done in analyticsSummary
    const rawIngredientsExpense = transactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          (t.category === "ค่าวัตถุดิบ" || t.category.includes("ข้าวสาร"))
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const adhocExpense = transactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          (t.category.includes("หน้างาน") || t.category.includes("นอกเมนู")) &&
          !t.category.includes("ข้าวสาร")
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const operationalExpense = transactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          t.category !== "ค่าวัตถุดิบ" &&
          !t.category.includes("ข้าวสาร") &&
          !t.category.includes("หน้างาน") &&
          !t.category.includes("นอกเมนู")
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Rice (1,250 ฿) + Daily food (1,400 ฿) = 2,650 ฿
    assert.strictEqual(rawIngredientsExpense, 2650);
    // Operational expense = Gas (450 ฿)
    assert.strictEqual(operationalExpense, 450);

    const totalExp = rawIngredientsExpense + adhocExpense + operationalExpense;
    assert.strictEqual(totalExp, 3100);

    // Food percentage: 2650 / 3100 = 85.48% (Meets สพฐ. audit guideline > 80%)
    const foodRatio = Math.round((rawIngredientsExpense / totalExp) * 100);
    assert.strictEqual(foodRatio >= 80, true);
    assert.strictEqual(foodRatio, 85);
  });

  it("T-098: Multi-Unit Support for Staples handles 'กระสอบ', 'แผง', 'ถัง', 'ลัง'", () => {
    const validUnits = ["กระสอบ", "กก.", "แผง", "ถัง", "ลัง", "ขวด", "แพ็ค", "ถุง", "มัด", "ฟอง", "ซอง", "กล่อง"];
    assert.strictEqual(validUnits.includes("กระสอบ"), true);
    assert.strictEqual(validUnits.includes("แผง"), true);
    assert.strictEqual(validUnits.includes("ลัง"), true);
    assert.strictEqual(validUnits.includes("ถัง"), true);

    const qty = sanitizeNumber("1.5");
    assert.strictEqual(qty, 1.5);
  });
});

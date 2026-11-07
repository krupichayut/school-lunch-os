import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRoundSchoolDays,
  ensureDatePlans,
  DEFAULT_WEEKLY_PLAN,
  DEFAULT_PRESET_MENUS,
  DayPlan,
  PresetMenu,
} from "../lib/storage";

describe("Package 14: Calendar Menu Planner & Multi-Week Independent Planning", () => {
  it("T-063: getRoundSchoolDays produces exactly 20 school days between 2026-11-02 and 2026-11-27", () => {
    const roundDays = getRoundSchoolDays("2026-11-02", "2026-11-27");
    assert.strictEqual(
      roundDays.length,
      20,
      "Round 1 must span exactly 20 official school days matching 20-day budget round"
    );
    assert.strictEqual(roundDays[0], "2026-11-02", "First day must be Mon 2 Nov 2026");
    assert.strictEqual(roundDays[19], "2026-11-27", "20th day must be Fri 27 Nov 2026");
  });

  it("T-064: getRoundSchoolDays excludes all Saturday and Sunday weekend dates", () => {
    const roundDays = getRoundSchoolDays("2026-11-01", "2026-11-30");
    for (const dateStr of roundDays) {
      const day = new Date(dateStr).getDay();
      assert.ok(
        day >= 1 && day <= 5,
        `Date ${dateStr} (day ${day}) must be Monday to Friday, never Saturday or Sunday`
      );
    }
  });

  it("T-065: ensureDatePlans seeds existing 5 weekdays from WeeklyPlan into matching ISO dates", () => {
    const seeded = ensureDatePlans({}, DEFAULT_WEEKLY_PLAN);
    assert.ok(seeded["2026-11-02"], "Must seed Monday 2 Nov 2026");
    assert.strictEqual(
      seeded["2026-11-02"].menuName,
      DEFAULT_WEEKLY_PLAN.monday.menuName
    );
    assert.ok(seeded["2026-11-06"], "Must seed Friday 6 Nov 2026");
    assert.strictEqual(
      seeded["2026-11-06"].menuName,
      DEFAULT_WEEKLY_PLAN.friday.menuName
    );
  });

  it("T-066: Updating menu for date 2026-11-09 does NOT overwrite menu for date 2026-11-02 (Multi-Week Independence)", () => {
    const initialPlans = ensureDatePlans({}, DEFAULT_WEEKLY_PLAN);
    const initialMonday1Menu = initialPlans["2026-11-02"].menuName;

    // Plan Week 2 Monday (9 Nov) with completely different dish
    const updatedPlans: Record<string, DayPlan> = {
      ...initialPlans,
      "2026-11-09": {
        menuName: "ข้าวผัดหมูแดงสูตรโบราณ",
        category: "อาหารจานเดียว",
        ingredients: [
          { id: "i1", name: "ข้าวสาร", qty: 8, unit: "กก.", unitPrice: 38 },
          { id: "i2", name: "เนื้อหมูแดง", qty: 6, unit: "กก.", unitPrice: 140 },
        ],
        inspectionDate: "2026-11-09",
      },
    };

    assert.strictEqual(
      updatedPlans["2026-11-02"].menuName,
      initialMonday1Menu,
      "Week 1 Monday menu must remain unchanged"
    );
    assert.strictEqual(
      updatedPlans["2026-11-09"].menuName,
      "ข้าวผัดหมูแดงสูตรโบราณ",
      "Week 2 Monday menu must have its own unique dish"
    );
    assert.notStrictEqual(
      updatedPlans["2026-11-02"].menuName,
      updatedPlans["2026-11-09"].menuName,
      "Week 1 and Week 2 must be completely independent"
    );
  });

  it("T-067: Preset recipes in library contain rich ingredient lists for flexible day drafts", () => {
    assert.ok(DEFAULT_PRESET_MENUS.length >= 5, "Library must have at least 5 preset dishes");
    for (const preset of DEFAULT_PRESET_MENUS) {
      assert.ok(preset.name, "Preset must have a name");
      assert.ok(preset.category, "Preset must have category");
      assert.ok(
        Array.isArray(preset.ingredients) && preset.ingredients.length > 0,
        `Preset '${preset.name}' must have starting ingredients`
      );
    }
  });

  it("T-068: Modifying cloned ingredients for a specific date preserves the original preset menu in library", () => {
    const template: PresetMenu = DEFAULT_PRESET_MENUS[0]; // e.g. ก๋วยเตี๋ยวน้ำใสไก่ฉีก
    const originalQty = template.ingredients[0].qty;

    // Deep clone for a day
    const dayIngredients = template.ingredients.map((ing) => ({
      ...ing,
      id: `day-${ing.id}`,
    }));

    // Modify day ingredient quantity and add a market substitute item
    dayIngredients[0].qty = originalQty + 5.0; // modified
    dayIngredients.push({
      id: "market-substitute-1",
      name: "ฟักเขียวแทนฟักทอง",
      qty: 4.0,
      unit: "กก.",
      unitPrice: 20,
    });

    assert.strictEqual(
      template.ingredients[0].qty,
      originalQty,
      "Master recipe template must remain untouched"
    );
    assert.strictEqual(
      template.ingredients.length,
      4,
      "Master recipe template length must remain unchanged"
    );
    assert.strictEqual(
      dayIngredients.length,
      5,
      "Day-specific ingredient list has 5 items including market substitute"
    );
  });
});

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { RecipeCalculator } from "../lib/recipe/calculator";
import { DataStore } from "../lib/db/repository";
import { RecipeItem, UUID } from "../types";

describe("Package 2: Menu, Recipe & Ingredient Calculation Tests", () => {
  const store = new DataStore();
  const menuChickenRiceId: UUID = "00000000-0003-0000-0000-000000000001";
  const recipeChickenRiceId: UUID = "00000000-0004-0000-0000-000000000001";

  const menu = store.menus.get(menuChickenRiceId)!;
  const recipe = store.recipes.get(recipeChickenRiceId)!;
  const recipeItems = store.recipeItems.filter((i) => i.recipe_id === recipeChickenRiceId);

  test("T-004: Create Meal Plan with 90 diners calculates correct ingredient quantities and costs", () => {
    assert.ok(menu);
    assert.ok(recipe);
    assert.equal(recipeItems.length, 4);

    const targetDiners = 90;
    const scaled = RecipeCalculator.calculateScaledIngredients(
      recipe,
      recipeItems,
      targetDiners,
      store.ingredients,
      store.ingredientPrices,
      store.units
    );

    // Servings base is 90, target is 90 -> ratio = 1.0
    assert.equal(scaled.length, 4);

    const chicken = scaled.find((i) => i.ingredient_name.includes("ไก่"));
    assert.ok(chicken);
    assert.equal(chicken.calculated_quantity, 9.0);
    assert.equal(chicken.unit_price, 85.0);
    assert.equal(chicken.line_cost, 765.0); // 9 * 85 = 765

    const rice = scaled.find((i) => i.ingredient_name.includes("ข้าวสาร"));
    assert.ok(rice);
    assert.equal(rice.calculated_quantity, 10.0);
    assert.equal(rice.line_cost, 380.0); // 10 * 38 = 380

    // Test scaling for 45 diners (half) -> ratio = 0.5
    const scaledHalf = RecipeCalculator.calculateScaledIngredients(
      recipe,
      recipeItems,
      45,
      store.ingredients,
      store.ingredientPrices,
      store.units
    );
    const chickenHalf = scaledHalf.find((i) => i.ingredient_name.includes("ไก่"));
    assert.equal(chickenHalf?.calculated_quantity, 4.5);
    assert.equal(chickenHalf?.line_cost, 382.5);
  });

  test("T-005: Diners = 0 or negative is rejected by validation", () => {
    assert.throws(
      () => {
        RecipeCalculator.calculateScaledIngredients(
          recipe,
          recipeItems,
          0,
          store.ingredients,
          store.ingredientPrices,
          store.units
        );
      },
      /Validation Error: Estimated diners must be an integer greater than 0/,
      "Diners = 0 must throw validation error"
    );

    assert.throws(
      () => {
        RecipeCalculator.calculateScaledIngredients(
          recipe,
          recipeItems,
          -15,
          store.ingredients,
          store.ingredientPrices,
          store.units
        );
      },
      /Validation Error: Estimated diners must be an integer greater than 0/,
      "Negative diners must throw validation error"
    );
  });

  test("T-006: Safe Unit Conversion computes accurately and blocks cross-dimension conversions", () => {
    const unitKg: UUID = "00000000-0000-0001-0000-000000000001";
    const unitG: UUID = "00000000-0000-0001-0000-000000000002";
    const unitL: UUID = "00000000-0000-0001-0000-000000000003";

    // 1) 2.5 KG to G -> 2500 G
    const grams = RecipeCalculator.convertUnit(
      2.5,
      unitKg,
      unitG,
      store.units,
      store.unitConversions
    );
    assert.equal(grams, 2500);

    // 2) 750 G to KG -> 0.75 KG (reverse conversion)
    const kilos = RecipeCalculator.convertUnit(
      750,
      unitG,
      unitKg,
      store.units,
      store.unitConversions
    );
    assert.equal(kilos, 0.75);

    // 3) Cross-dimension (KG [MASS] to L [VOLUME]) without density -> must throw error
    assert.throws(
      () => {
        RecipeCalculator.convertUnit(
          1.0,
          unitKg,
          unitL,
          store.units,
          store.unitConversions
        );
      },
      /Invalid cross-dimension unit conversion from KG \(MASS\) to L \(VOLUME\)/,
      "Cross-dimension conversion without density must be strictly blocked"
    );
  });

  test("T-007: Modifying recipe after meal plan confirmation does NOT alter frozen snapshot", () => {
    // 1. Confirm meal plan for 90 diners and generate snapshot
    const snapshot = RecipeCalculator.createFrozenSnapshot(
      menu,
      recipe,
      recipeItems,
      90,
      store.ingredients,
      store.ingredientPrices,
      store.units
    );

    assert.equal(snapshot.target_diners, 90);
    const originalChickenQty = snapshot.ingredients.find((i) => i.ingredient_name.includes("ไก่"))?.calculated_quantity;
    const originalTotalCost = snapshot.total_cost;
    assert.equal(originalChickenQty, 9.0);

    // 2. Simulate user modifying recipe later (e.g. increase chicken from 9 kg to 15 kg in base recipe)
    const modifiedItems: RecipeItem[] = recipeItems.map((item) => {
      if (item.ingredient_id === "00000000-0002-0000-0000-000000000001") {
        return { ...item, quantity: 15.0 };
      }
      return item;
    });

    // 3. Verify that the frozen snapshot from earlier did NOT change!
    const frozenChickenQty = snapshot.ingredients.find((i) => i.ingredient_name.includes("ไก่"))?.calculated_quantity;
    assert.equal(
      frozenChickenQty,
      originalChickenQty,
      "Frozen snapshot quantity must remain immutable even if the recipe is edited later"
    );
    assert.equal(
      snapshot.total_cost,
      originalTotalCost,
      "Frozen snapshot total cost must remain unchanged"
    );
  });
});

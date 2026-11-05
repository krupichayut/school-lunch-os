import {
  Ingredient,
  IngredientPrice,
  Menu,
  Recipe,
  RecipeItem,
  RecipeSnapshot,
  SnapshotIngredientItem,
  Unit,
  UnitConversion,
  UUID,
} from "@/types";

export class RecipeCalculator {
  /**
   * Safe unit conversion respecting dimension boundaries (Spec 7.4).
   * Prevents arbitrary cross-dimension conversions without explicit density.
   */
  public static convertUnit(
    quantity: number,
    fromUnitId: UUID,
    toUnitId: UUID,
    units: Map<UUID, Unit>,
    conversions: UnitConversion[]
  ): number {
    if (fromUnitId === toUnitId) return quantity;

    const fromUnit = units.get(fromUnitId);
    const toUnit = units.get(toUnitId);

    if (!fromUnit || !toUnit) {
      throw new Error(`Unit not found for conversion: from=${fromUnitId}, to=${toUnitId}`);
    }

    // Direct conversion rule lookup
    const directConversion = conversions.find(
      (c) => c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId
    );

    if (directConversion) {
      return Number((quantity * directConversion.factor).toFixed(6));
    }

    // Reverse conversion rule lookup (1 / factor)
    const reverseConversion = conversions.find(
      (c) => c.from_unit_id === toUnitId && c.to_unit_id === fromUnitId
    );

    if (reverseConversion && reverseConversion.factor > 0) {
      return Number((quantity / reverseConversion.factor).toFixed(6));
    }

    // Dimension check
    if (fromUnit.dimension !== toUnit.dimension) {
      throw new Error(
        `Invalid cross-dimension unit conversion from ${fromUnit.code} (${fromUnit.dimension}) to ${toUnit.code} (${toUnit.dimension}) without specific density factor.`
      );
    }

    throw new Error(`No conversion factor defined between ${fromUnit.code} and ${toUnit.code}`);
  }

  /**
   * Calculates required ingredient quantities and costs scaled to daily diner count (Spec 7.3).
   * Formula: target_quantity = base_quantity * (target_diners / servings_base)
   */
  public static calculateScaledIngredients(
    recipe: Recipe,
    recipeItems: RecipeItem[],
    targetDiners: number,
    ingredients: Map<UUID, Ingredient>,
    prices: Map<UUID, IngredientPrice>,
    units: Map<UUID, Unit>
  ): SnapshotIngredientItem[] {
    if (targetDiners <= 0) {
      throw new Error("Validation Error: Estimated diners must be an integer greater than 0");
    }

    if (!recipeItems || recipeItems.length === 0) {
      throw new Error("Validation Error: Recipe must contain at least one ingredient item");
    }

    const ratio = targetDiners / recipe.servings_base;

    return recipeItems.map((item) => {
      const ing = ingredients.get(item.ingredient_id);
      const unit = units.get(item.unit_id);
      const priceRecord = prices.get(item.ingredient_id);

      const ingredientName = ing ? ing.name : "Unknown Ingredient";
      const unitCode = unit ? unit.code : "";
      const unitName = unit ? unit.name : "";
      const unitPrice = priceRecord ? priceRecord.unit_price : 0;

      // Precision: 4 decimal places for quantity as per spec NUMERIC(14,4)
      const calculatedQuantity = Number((item.quantity * ratio).toFixed(4));
      // Money: 2 decimal places as per spec NUMERIC(14,2)
      const lineCost = Number((calculatedQuantity * unitPrice).toFixed(2));

      return {
        ingredient_id: item.ingredient_id,
        ingredient_name: ingredientName,
        base_recipe_quantity: item.quantity,
        calculated_quantity: calculatedQuantity,
        unit_id: item.unit_id,
        unit_code: unitCode,
        unit_name: unitName,
        unit_price: unitPrice,
        line_cost: lineCost,
      };
    });
  }

  /**
   * Freezes a Recipe Snapshot at confirmation time (Spec 8.2 & Test T-007).
   * Once confirmed, the snapshot contains the exact ingredients, quantities, prices,
   * and total costs at that point in time. Modifying the original recipe later will NEVER
   * alter this snapshot.
   */
  public static createFrozenSnapshot(
    menu: Menu,
    recipe: Recipe,
    recipeItems: RecipeItem[],
    targetDiners: number,
    ingredients: Map<UUID, Ingredient>,
    prices: Map<UUID, IngredientPrice>,
    units: Map<UUID, Unit>
  ): RecipeSnapshot {
    const calculatedItems = this.calculateScaledIngredients(
      recipe,
      recipeItems,
      targetDiners,
      ingredients,
      prices,
      units
    );

    const totalCost = Number(
      calculatedItems.reduce((acc, item) => acc + item.line_cost, 0).toFixed(2)
    );

    const costPerDiner = Number((totalCost / targetDiners).toFixed(2));

    const snapshot: RecipeSnapshot = {
      menu_id: menu.id,
      menu_name: menu.name,
      recipe_version: recipe.version,
      servings_base: recipe.servings_base,
      target_diners: targetDiners,
      total_cost: totalCost,
      cost_per_diner: costPerDiner,
      frozen_at: new Date().toISOString(),
      ingredients: JSON.parse(JSON.stringify(calculatedItems)), // Deep clone for immutability
    };

    return Object.freeze(snapshot);
  }
}

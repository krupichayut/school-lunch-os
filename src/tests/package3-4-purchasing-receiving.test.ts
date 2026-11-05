import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { InventoryService } from "../lib/inventory/service";
import { RecipeCalculator } from "../lib/recipe/calculator";
import { DataStore } from "../lib/db/repository";
import { AccessControl } from "../lib/auth/rbac";
import { InventoryBalance, InventoryMovement, UUID } from "../types";

describe("Packages 3 & 4: Purchasing, Receiving & Stock Ledger Tests", () => {
  const store = new DataStore();
  const schoolId: UUID = "11111111-1111-1111-1111-111111111111";
  const teacherId: UUID = "22222222-2222-2222-2222-222222222222";
  const execId: UUID = "33333333-3333-3333-3333-333333333333";

  const menu = store.menus.get("00000000-0003-0000-0000-000000000001")!;
  const recipe = store.recipes.get("00000000-0004-0000-0000-000000000001")!;
  const recipeItems = store.recipeItems.filter((i) => i.recipe_id === recipe.id);

  // Generate snapshot for 90 diners
  const snapshot = RecipeCalculator.createFrozenSnapshot(
    menu,
    recipe,
    recipeItems,
    90,
    store.ingredients,
    store.ingredientPrices,
    store.units
  );

  test("T-008: Create Purchase Order from Meal Plan Snapshot", () => {
    const mealPlanId: UUID = crypto.randomUUID();
    const { po, items } = InventoryService.createPOFromSnapshot(
      schoolId,
      mealPlanId,
      snapshot,
      teacherId,
      "PO-2569-000001"
    );

    assert.equal(po.document_no, "PO-2569-000001");
    assert.equal(po.grand_total, snapshot.total_cost);
    assert.equal(items.length, 4);

    const chickenItem = items.find((i) => i.description?.includes("ไก่"));
    assert.ok(chickenItem);
    assert.equal(chickenItem.ordered_quantity, 9.0);
    assert.equal(chickenItem.unit_price, 85.0);
    assert.equal(chickenItem.line_total, 765.0);
  });

  test("T-010: Separation of Duties - PO Creator cannot approve their own PO", () => {
    const creatorContext = store.getUserContext(teacherId, schoolId);
    const execContext = store.getUserContext(execId, schoolId);

    // Creator cannot approve
    const creatorApproval = AccessControl.canApproveDocument(creatorContext, teacherId);
    assert.equal(creatorApproval.allowed, false, "Creator cannot self-approve");

    // Executive can approve document created by someone else
    const execApproval = AccessControl.canApproveDocument(execContext, teacherId);
    assert.equal(execApproval.allowed, true, "Executive can approve teacher PO");
  });

  test("T-011 & T-014: Morning Receiving - Partial acceptance increases stock ONLY for accepted quantity and updates PO status", async () => {
    const mealPlanId: UUID = crypto.randomUUID();
    const { po, items } = InventoryService.createPOFromSnapshot(
      schoolId,
      mealPlanId,
      snapshot,
      teacherId,
      "PO-2569-000002"
    );

    const balances = new Map<UUID, InventoryBalance>();
    const movements: InventoryMovement[] = [];

    const chickenItem = items.find((i) => i.description?.includes("ไก่"))!;
    const cucumberItem = items.find((i) => i.description?.includes("แตงกวา"))!;

    // Scenario:
    // 1) Chicken: Ordered 9.0 kg, delivered 9.0 kg, accepted 8.0 kg, rejected 1.0 kg (damaged/spoilage)
    // 2) Cucumber: Ordered 3.0 kg, delivered 2.5 kg, accepted 2.5 kg, rejected 0 (shortage 0.5 kg)
    const inspectionInput = [
      {
        po_item_id: chickenItem.id,
        ingredient_id: chickenItem.ingredient_id,
        ordered_quantity: 9.0,
        received_quantity: 9.0,
        accepted_quantity: 8.0,
        rejected_quantity: 1.0,
        unit_id: chickenItem.unit_id,
        discrepancy_note: "1 kg bruised during transport",
        discrepancy_type: "DAMAGED" as const,
      },
      {
        po_item_id: cucumberItem.id,
        ingredient_id: cucumberItem.ingredient_id,
        ordered_quantity: 3.0,
        received_quantity: 2.5,
        accepted_quantity: 2.5,
        rejected_quantity: 0.0,
        unit_id: cucumberItem.unit_id,
        discrepancy_note: "Store ran out, missing 0.5 kg",
        discrepancy_type: "SHORTAGE" as const,
      },
    ];

    const result = await InventoryService.processMorningReceiving({
      school_id: schoolId,
      purchase_order: po,
      po_items: items,
      inspector_user_id: teacherId,
      inspected_items: inspectionInput,
      idempotency_key: "idem-morning-rcv-001",
      balances,
      movements,
    });

    // PO Status must transition to PARTIALLY_RECEIVED (T-011)
    assert.equal(result.updatedPO.status, "PARTIALLY_RECEIVED");

    // Stock In must ONLY be accepted_quantity (8.0 kg chicken, not 9.0 kg!) (T-014)
    const chickenBal = balances.get(chickenItem.ingredient_id);
    assert.equal(chickenBal?.quantity_on_hand, 8.0, "Stock balance must equal accepted quantity only");

    const cucumberBal = balances.get(cucumberItem.ingredient_id);
    assert.equal(cucumberBal?.quantity_on_hand, 2.5);

    // Discrepancies registered
    assert.equal(result.discrepancies.length, 2);
    assert.equal(result.stockMovements.length, 2);
  });

  test("T-015: Idempotency blocks duplicate receiving submission (Prevents Double Stock-In)", async () => {
    const mealPlanId: UUID = crypto.randomUUID();
    const { po, items } = InventoryService.createPOFromSnapshot(
      schoolId,
      mealPlanId,
      snapshot,
      teacherId,
      "PO-2569-000003"
    );

    const balances = new Map<UUID, InventoryBalance>();
    const movements: InventoryMovement[] = [];
    const riceItem = items.find((i) => i.description?.includes("ข้าวสาร"))!;

    const inspectionInput = [
      {
        po_item_id: riceItem.id,
        ingredient_id: riceItem.ingredient_id,
        ordered_quantity: 10.0,
        received_quantity: 10.0,
        accepted_quantity: 10.0,
        rejected_quantity: 0.0,
        unit_id: riceItem.unit_id,
      },
    ];

    const key = "idem-key-duplicate-check-001";

    // First call: succeeds
    await InventoryService.processMorningReceiving({
      school_id: schoolId,
      purchase_order: po,
      po_items: items,
      inspector_user_id: teacherId,
      inspected_items: inspectionInput,
      idempotency_key: key,
      balances,
      movements,
    });
    assert.equal(balances.get(riceItem.ingredient_id)?.quantity_on_hand, 10.0);

    // Second call with same idempotency key: must throw duplicate error!
    await assert.rejects(
      async () => {
        await InventoryService.processMorningReceiving({
          school_id: schoolId,
          purchase_order: po,
          po_items: items,
          inspector_user_id: teacherId,
          inspected_items: inspectionInput,
          idempotency_key: key,
          balances,
          movements,
        });
      },
      /Duplicate submission detected/,
      "Duplicate receiving confirmation must be rejected to prevent duplicate stock-in"
    );

    // Balance remains 10.0, not doubled to 20.0
    assert.equal(balances.get(riceItem.ingredient_id)?.quantity_on_hand, 10.0);
  });

  test("T-016: Issuing more than on-hand stock is rejected", () => {
    const balances = new Map<UUID, InventoryBalance>();
    const movements: InventoryMovement[] = [];
    const chickenId: UUID = "00000000-0002-0000-0000-000000000001";
    const unitKg: UUID = "00000000-0000-0001-0000-000000000001";

    balances.set(chickenId, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: chickenId,
      quantity_on_hand: 5.0, // On hand is only 5.0 kg
      updated_at: new Date().toISOString(),
    });

    // Attempting to issue 8.0 kg (more than 5.0 kg) must be rejected
    assert.throws(
      () => {
        InventoryService.issueToKitchen({
          school_id: schoolId,
          ingredient_id: chickenId,
          quantity: 8.0,
          unit_id: unitKg,
          issuer_id: teacherId,
          balances,
          movements,
        });
      },
      /Validation Error: Cannot issue 8. Quantity on hand is only 5. Over-issuing rejected./,
      "Issuing more than available stock balance must throw error"
    );

    // Issuing 3.0 kg should succeed and leave 2.0 kg
    InventoryService.issueToKitchen({
      school_id: schoolId,
      ingredient_id: chickenId,
      quantity: 3.0,
      unit_id: unitKg,
      issuer_id: teacherId,
      balances,
      movements,
    });
    assert.equal(balances.get(chickenId)?.quantity_on_hand, 2.0);
    assert.equal(movements.length, 1);
    assert.equal(movements[0].quantity, -3.0); // Negative quantity in ledger
  });

  test("T-017: Reversal Movement restores stock balance without deleting ledger history", () => {
    const balances = new Map<UUID, InventoryBalance>();
    const movements: InventoryMovement[] = [];
    const chickenId: UUID = "00000000-0002-0000-0000-000000000001";
    const unitKg: UUID = "00000000-0000-0001-0000-000000000001";

    // 1. Initial receipt: +10.0 kg
    const receiptMovement: InventoryMovement = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: chickenId,
      movement_type: "RECEIPT",
      quantity: 10.0,
      unit_id: unitKg,
      source_type: "RECEIVING",
      source_id: crypto.randomUUID(),
      occurred_at: new Date().toISOString(),
      created_by: teacherId,
    };
    movements.push(receiptMovement);
    balances.set(chickenId, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: chickenId,
      quantity_on_hand: 10.0,
      updated_at: new Date().toISOString(),
    });

    // 2. Erroneous issue of 4.0 kg -> balance becomes 6.0 kg
    const issueMovement = InventoryService.issueToKitchen({
      school_id: schoolId,
      ingredient_id: chickenId,
      quantity: 4.0,
      unit_id: unitKg,
      issuer_id: teacherId,
      balances,
      movements,
    });
    assert.equal(balances.get(chickenId)?.quantity_on_hand, 6.0);
    assert.equal(movements.length, 2);

    // 3. Reverse the erroneous issue -> creates offsetting reversal (+4.0 kg)
    const reversal = InventoryService.reverseMovement({
      school_id: schoolId,
      target_movement_id: issueMovement.id,
      actor_id: teacherId,
      notes: "Issued wrong batch of chicken, correcting",
      balances,
      movements,
    });

    // 4. Verify balance restored back to 10.0 kg
    assert.equal(balances.get(chickenId)?.quantity_on_hand, 10.0);
    assert.equal(reversal.quantity, 4.0); // Offsetting positive
    assert.equal(reversal.reversal_of, issueMovement.id);
    assert.equal(movements.length, 3); // History is preserved (Append-only)
  });
});

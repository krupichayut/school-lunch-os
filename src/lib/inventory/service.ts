import {
  InventoryBalance,
  InventoryMovement,
  POStatus,
  PurchaseOrder,
  PurchaseOrderItem,
  ReceivingDiscrepancy,
  ReceivingItem,
  ReceivingRecord,
  RecipeSnapshot,
  UUID,
} from "@/types";
import { AuditLogger } from "../audit/logger";
import { IdempotencyGuard } from "../idempotency/guard";

export interface InspectedItemInput {
  po_item_id: UUID;
  ingredient_id: UUID;
  ordered_quantity: number;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  unit_id: UUID;
  discrepancy_note?: string;
  discrepancy_type?: "SHORTAGE" | "OVERAGE" | "QUALITY" | "DAMAGED" | "WRONG_ITEM";
  photo_path?: string;
}

export interface MorningReceivingResult {
  receivingRecord: ReceivingRecord;
  receivingItems: ReceivingItem[];
  discrepancies: ReceivingDiscrepancy[];
  stockMovements: InventoryMovement[];
  updatedPO: PurchaseOrder;
}

export class InventoryService {
  private static poSequence = 1;
  private static rcvSequence = 1;

  public static generatePONumber(year: number = 2569): string {
    const padded = String(this.poSequence++).padStart(6, "0");
    return `PO-${year}-${padded}`;
  }

  public static generateRCVNumber(year: number = 2569): string {
    const padded = String(this.rcvSequence++).padStart(6, "0");
    return `RCV-${year}-${padded}`;
  }

  /**
   * Auto-generate a Purchase Order from confirmed Meal Plan Snapshot (Spec 9.9)
   */
  public static createPOFromSnapshot(
    school_id: UUID,
    meal_plan_id: UUID,
    snapshot: RecipeSnapshot,
    creator_id: UUID,
    document_no?: string
  ): { po: PurchaseOrder; items: PurchaseOrderItem[] } {
    const poId: UUID = crypto.randomUUID();
    const docNo = document_no || this.generatePONumber();

    const poItems: PurchaseOrderItem[] = snapshot.ingredients.map((item) => ({
      id: crypto.randomUUID(),
      purchase_order_id: poId,
      ingredient_id: item.ingredient_id,
      description: item.ingredient_name,
      ordered_quantity: item.calculated_quantity,
      unit_id: item.unit_id,
      unit_price: item.unit_price,
      line_total: item.line_cost,
      received_quantity: 0,
    }));

    const po: PurchaseOrder = {
      id: poId,
      school_id,
      document_no: docNo,
      order_date: new Date().toISOString().split("T")[0],
      required_date: new Date().toISOString().split("T")[0],
      status: "ORDERED",
      subtotal: snapshot.total_cost,
      discount: 0,
      tax_amount: 0,
      grand_total: snapshot.total_cost,
      meal_plan_id,
      created_by: creator_id,
      created_at: new Date().toISOString(),
    };

    return { po, items: poItems };
  }

  /**
   * Process morning kitchen receiving inspection (Spec 7.6 & 7.7)
   * - Mobile-first workflow
   * - Enforces Idempotency to prevent double stock-in
   * - Stock In ONLY accepted_quantity
   * - Appends to Inventory Ledger (Single Source of Truth)
   * - Updates PO status (PARTIALLY_RECEIVED or RECEIVED)
   */
  public static async processMorningReceiving(params: {
    school_id: UUID;
    purchase_order: PurchaseOrder;
    po_items: PurchaseOrderItem[];
    inspector_user_id: UUID;
    inspected_items: InspectedItemInput[];
    idempotency_key: string;
    balances: Map<UUID, InventoryBalance>;
    movements: InventoryMovement[];
  }): Promise<MorningReceivingResult> {
    const {
      school_id,
      purchase_order,
      po_items,
      inspector_user_id,
      inspected_items,
      idempotency_key,
      balances,
      movements,
    } = params;

    // 1. Check Idempotency Guard (Spec 7.11 / Test T-015)
    const idempotency = await IdempotencyGuard.checkAndLock(
      school_id,
      idempotency_key,
      "CONFIRM_RECEIVING"
    );

    if (!idempotency.isNew) {
      throw new Error(
        `Duplicate submission detected: Receiving transaction for key '${idempotency_key}' has already been processed.`
      );
    }

    const rcvId: UUID = crypto.randomUUID();
    const rcvDocNo = this.generateRCVNumber();

    const createdItems: ReceivingItem[] = [];
    const createdDiscrepancies: ReceivingDiscrepancy[] = [];
    const createdMovements: InventoryMovement[] = [];

    let hasAnyShortageOrPartial = false;
    let allItemsFullyReceived = true;

    for (const input of inspected_items) {
      // Validate quantities: accepted + rejected <= received
      if (input.accepted_quantity + input.rejected_quantity > input.received_quantity) {
        throw new Error(
          `Validation Error: Sum of accepted (${input.accepted_quantity}) and rejected (${input.rejected_quantity}) cannot exceed received quantity (${input.received_quantity})`
        );
      }

      const receivingItemId: UUID = crypto.randomUUID();
      const poItem = po_items.find((p) => p.id === input.po_item_id);

      if (!poItem) {
        throw new Error(`PO item not found: ${input.po_item_id}`);
      }

      // Update PO item accumulated received quantity
      poItem.received_quantity = Number(
        (poItem.received_quantity + input.accepted_quantity).toFixed(4)
      );

      if (poItem.received_quantity < poItem.ordered_quantity) {
        allItemsFullyReceived = false;
        hasAnyShortageOrPartial = true;
      }

      const inspectionStatus =
        input.rejected_quantity > 0 && input.accepted_quantity > 0
          ? "PARTIALLY_ACCEPTED"
          : input.rejected_quantity > 0
          ? "REJECTED"
          : "ACCEPTED";

      const rcvItem: ReceivingItem = {
        id: receivingItemId,
        receiving_record_id: rcvId,
        purchase_order_item_id: input.po_item_id,
        received_quantity: input.received_quantity,
        accepted_quantity: input.accepted_quantity,
        rejected_quantity: input.rejected_quantity,
        unit_id: input.unit_id,
        inspection_status: inspectionStatus,
        discrepancy_note: input.discrepancy_note,
      };
      createdItems.push(rcvItem);

      // Record Discrepancy if quantity differs or goods damaged
      if (input.received_quantity < input.ordered_quantity || input.discrepancy_type) {
        createdDiscrepancies.push({
          id: crypto.randomUUID(),
          receiving_item_id: receivingItemId,
          discrepancy_type: input.discrepancy_type || "SHORTAGE",
          expected_value: input.ordered_quantity,
          actual_value: input.received_quantity,
          description:
            input.discrepancy_note ||
            `Received ${input.received_quantity} which is less than ordered ${input.ordered_quantity}`,
          resolution_status: "OPEN",
        });
      }

      // 2. Stock In ONLY accepted_quantity (Spec 7.6 / Test T-014)
      if (input.accepted_quantity > 0) {
        const movement: InventoryMovement = {
          id: crypto.randomUUID(),
          school_id,
          ingredient_id: input.ingredient_id,
          movement_type: "RECEIPT",
          quantity: input.accepted_quantity, // Positive quantity for RECEIPT
          unit_id: input.unit_id,
          source_type: "RECEIVING",
          source_id: rcvId,
          occurred_at: new Date().toISOString(),
          created_by: inspector_user_id,
          idempotency_key,
          notes: `Morning receiving inspection for ${rcvDocNo}`,
        };
        movements.push(movement);
        createdMovements.push(movement);

        // Update balance atomically
        const currentBal = balances.get(input.ingredient_id);
        const newQty = (currentBal ? currentBal.quantity_on_hand : 0) + input.accepted_quantity;

        balances.set(input.ingredient_id, {
          id: currentBal ? currentBal.id : crypto.randomUUID(),
          school_id,
          ingredient_id: input.ingredient_id,
          quantity_on_hand: Number(newQty.toFixed(4)),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 3. Update PO Status
    let nextPOStatus: POStatus = purchase_order.status;
    if (allItemsFullyReceived) {
      nextPOStatus = "RECEIVED";
    } else if (hasAnyShortageOrPartial) {
      nextPOStatus = "PARTIALLY_RECEIVED";
    }
    purchase_order.status = nextPOStatus;

    const rcvRecord: ReceivingRecord = {
      id: rcvId,
      school_id,
      document_no: rcvDocNo,
      purchase_order_id: purchase_order.id,
      received_at: new Date().toISOString(),
      received_by: inspector_user_id,
      status: allItemsFullyReceived ? "ACCEPTED" : "PARTIALLY_ACCEPTED",
      created_at: new Date().toISOString(),
    };

    // 4. Audit Log (Spec 7.10)
    await AuditLogger.log({
      school_id,
      actor_user_id: inspector_user_id,
      action: "CONFIRM_RECEIVING",
      entity_type: "receiving_records",
      entity_id: rcvId,
      after_data: {
        document_no: rcvDocNo,
        po_document_no: purchase_order.document_no,
        items_count: createdItems.length,
        movements_count: createdMovements.length,
      },
    });

    return {
      receivingRecord: rcvRecord,
      receivingItems: createdItems,
      discrepancies: createdDiscrepancies,
      stockMovements: createdMovements,
      updatedPO: purchase_order,
    };
  }

  /**
   * Issue ingredients from stock to school kitchen (Spec 7.7)
   * Prevents issuing more than on-hand balance (Test T-016).
   */
  public static issueToKitchen(params: {
    school_id: UUID;
    ingredient_id: UUID;
    quantity: number;
    unit_id: UUID;
    issuer_id: UUID;
    balances: Map<UUID, InventoryBalance>;
    movements: InventoryMovement[];
    meal_plan_id?: UUID;
  }): InventoryMovement {
    const { school_id, ingredient_id, quantity, unit_id, issuer_id, balances, movements, meal_plan_id } =
      params;

    const currentBal = balances.get(ingredient_id);
    const onHand = currentBal ? currentBal.quantity_on_hand : 0;

    if (quantity > onHand) {
      throw new Error(
        `Validation Error: Cannot issue ${quantity}. Quantity on hand is only ${onHand}. Over-issuing rejected.`
      );
    }

    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      school_id,
      ingredient_id,
      movement_type: "ISSUE",
      quantity: -Math.abs(quantity), // Negative quantity for ISSUE
      unit_id,
      source_type: "ISSUE_TO_KITCHEN",
      source_id: meal_plan_id || crypto.randomUUID(),
      occurred_at: new Date().toISOString(),
      created_by: issuer_id,
    };

    movements.push(movement);

    balances.set(ingredient_id, {
      id: currentBal ? currentBal.id : crypto.randomUUID(),
      school_id,
      ingredient_id,
      quantity_on_hand: Number((onHand - quantity).toFixed(4)),
      updated_at: new Date().toISOString(),
    });

    return movement;
  }

  /**
   * Stock Ledger Reversal (Spec 7.7 / Test T-017)
   * Restores balance by appending offsetting reversal movement.
   */
  public static reverseMovement(params: {
    school_id: UUID;
    target_movement_id: UUID;
    actor_id: UUID;
    notes: string;
    balances: Map<UUID, InventoryBalance>;
    movements: InventoryMovement[];
  }): InventoryMovement {
    const { school_id, target_movement_id, actor_id, notes, balances, movements } = params;

    const target = movements.find((m) => m.id === target_movement_id);
    if (!target) {
      throw new Error(`Target movement not found: ${target_movement_id}`);
    }

    // Opposite quantity
    const offsetQty = -target.quantity;

    const reversal: InventoryMovement = {
      id: crypto.randomUUID(),
      school_id,
      ingredient_id: target.ingredient_id,
      movement_type: "REVERSAL",
      quantity: offsetQty,
      unit_id: target.unit_id,
      source_type: target.source_type,
      source_id: target.source_id,
      occurred_at: new Date().toISOString(),
      created_by: actor_id,
      reversal_of: target.id,
      notes: `Reversal of ${target.id}: ${notes}`,
    };

    movements.push(reversal);

    const currentBal = balances.get(target.ingredient_id);
    const newQty = (currentBal ? currentBal.quantity_on_hand : 0) + offsetQty;

    balances.set(target.ingredient_id, {
      id: currentBal ? currentBal.id : crypto.randomUUID(),
      school_id,
      ingredient_id: target.ingredient_id,
      quantity_on_hand: Number(newQty.toFixed(4)),
      updated_at: new Date().toISOString(),
    });

    return reversal;
  }
}

/**
 * School Lunch OS - Core Domain Types
 * Domain 1 (School & Identity)
 * Domain 2 (Menu & Recipe)
 * Domain 3 (Ingredient & Unit)
 * Domain 4 (Purchasing)
 * Domain 5 (Receiving & Inspection)
 * Domain 6 (Inventory & Stock Ledger)
 * Domain 7 (Budget & Finance)
 * Domain 9 (Audit)
 * Domain 10 (Settings & Idempotency)
 */

export type UUID = string;

// Roles matching spec 4.1
export type RoleCode =
  | "SYSTEM_ADMIN"
  | "SCHOOL_ADMIN"
  | "PLANNER"
  | "DUTY_TEACHER"
  | "FINANCE_OFFICER"
  | "EXECUTIVE";

// Permissions matching spec 4.2
export type PermissionCode =
  | "meal_plan.view"
  | "meal_plan.create"
  | "meal_plan.update"
  | "meal_plan.confirm"
  | "recipe.view"
  | "recipe.manage"
  | "purchase.view"
  | "purchase.create"
  | "purchase.submit"
  | "receiving.create"
  | "receiving.inspect"
  | "receiving.confirm"
  | "inventory.view"
  | "inventory.issue"
  | "inventory.adjust"
  | "finance.view"
  | "finance.create"
  | "finance.post"
  | "approval.view"
  | "approval.act"
  | "report.view"
  | "report.export"
  | "user.manage"
  | "settings.manage";

export interface School {
  id: UUID;
  name: string;
  school_code?: string;
  address?: Record<string, unknown>;
  phone?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: UUID;
  display_name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolMember {
  id: UUID;
  school_id: UUID;
  user_id: UUID;
  membership_status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joined_at: string;
}

export interface Role {
  id: UUID;
  school_id?: UUID | null;
  code: RoleCode | string;
  name: string;
  description?: string;
  is_system: boolean;
}

export interface Permission {
  id: UUID;
  code: PermissionCode;
  description?: string;
}

export interface UserRole {
  id: UUID;
  school_id: UUID;
  user_id: UUID;
  role_id: UUID;
}

export interface AuditLog {
  id: UUID;
  school_id: UUID;
  actor_user_id?: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface SchoolSetting {
  id: UUID;
  school_id: UUID;
  setting_key: string;
  setting_value: Record<string, unknown>;
}

export interface IdempotencyRecord {
  id: UUID;
  school_id: UUID;
  idempotency_key: string;
  operation: string;
  result_reference?: string;
  created_at: string;
}

// Domain 2 & Domain 3
export type DimensionType = "MASS" | "VOLUME" | "COUNT" | "LENGTH";

export interface Unit {
  id: UUID;
  code: string;
  name: string;
  dimension: DimensionType;
  decimal_places: number;
}

export interface UnitConversion {
  id: UUID;
  from_unit_id: UUID;
  to_unit_id: UUID;
  factor: number;
  ingredient_id?: UUID | null;
  notes?: string;
}

export interface IngredientCategory {
  id: UUID;
  school_id: UUID;
  name: string;
  parent_id?: UUID | null;
}

export interface Ingredient {
  id: UUID;
  school_id: UUID;
  code?: string;
  name: string;
  category_id?: UUID | null;
  base_unit_id: UUID;
  purchase_unit_id?: UUID | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface IngredientPrice {
  id: UUID;
  school_id: UUID;
  ingredient_id: UUID;
  supplier_id?: UUID | null;
  unit_id: UUID;
  unit_price: number;
  effective_from: string;
  effective_to?: string | null;
}

export interface Menu {
  id: UUID;
  school_id: UUID;
  name: string;
  category?: string;
  description?: string;
  instructions?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: UUID;
  school_id: UUID;
  menu_id: UUID;
  version: number;
  servings_base: number;
  instructions?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  effective_from: string;
  created_by?: UUID | null;
  created_at?: string;
}

export interface RecipeItem {
  id: UUID;
  recipe_id: UUID;
  ingredient_id: UUID;
  quantity: number;
  unit_id: UUID;
  preparation_note?: string;
  sequence_no: number;
}

export type MealPlanStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface MealPlan {
  id: UUID;
  school_id: UUID;
  meal_date: string;
  estimated_diners: number;
  actual_diners?: number | null;
  status: MealPlanStatus;
  notes?: string;
  confirmed_at?: string | null;
  confirmed_by?: UUID | null;
  created_at?: string;
  updated_at?: string;
}

export interface SnapshotIngredientItem {
  ingredient_id: UUID;
  ingredient_name: string;
  base_recipe_quantity: number;
  calculated_quantity: number;
  unit_id: UUID;
  unit_code: string;
  unit_name: string;
  unit_price: number;
  line_cost: number;
}

export interface RecipeSnapshot {
  menu_id: UUID;
  menu_name: string;
  recipe_version: number;
  servings_base: number;
  target_diners: number;
  total_cost: number;
  cost_per_diner: number;
  frozen_at: string;
  ingredients: SnapshotIngredientItem[];
}

export interface MealPlanItem {
  id: UUID;
  meal_plan_id: UUID;
  menu_id: UUID;
  servings: number;
  sequence_no: number;
  recipe_snapshot: RecipeSnapshot;
  estimated_cost: number;
  notes?: string;
}

// Domain 4: Purchasing
export interface Supplier {
  id: UUID;
  school_id: UUID;
  name: string;
  tax_id?: string | null;
  contact_name?: string;
  phone?: string;
  address?: Record<string, unknown>;
  is_active: boolean;
}

export type POStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrder {
  id: UUID;
  school_id: UUID;
  document_no: string;
  order_date: string;
  required_date: string;
  supplier_id?: UUID | null;
  status: POStatus;
  subtotal: number;
  discount: number;
  tax_amount: number;
  grand_total: number;
  meal_plan_id?: UUID | null;
  created_by: UUID;
  approved_at?: string | null;
  notes?: string;
  created_at?: string;
}

export interface PurchaseOrderItem {
  id: UUID;
  purchase_order_id: UUID;
  ingredient_id: UUID;
  description?: string;
  ordered_quantity: number;
  unit_id: UUID;
  unit_price: number;
  line_total: number;
  received_quantity: number;
  notes?: string;
}

// Domain 5: Receiving & Inspection
export type ReceivingStatus =
  | "DRAFT"
  | "INSPECTING"
  | "PARTIALLY_ACCEPTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export type InspectionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PARTIALLY_ACCEPTED"
  | "REJECTED";

export interface ReceivingRecord {
  id: UUID;
  school_id: UUID;
  document_no: string;
  purchase_order_id: UUID;
  received_at: string;
  received_by: UUID;
  status: ReceivingStatus;
  notes?: string;
  created_at?: string;
}

export interface ReceivingItem {
  id: UUID;
  receiving_record_id: UUID;
  purchase_order_item_id: UUID;
  received_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  unit_id: UUID;
  inspection_status: InspectionStatus;
  quality_note?: string;
  discrepancy_note?: string;
}

export type DiscrepancyType =
  | "SHORTAGE"
  | "OVERAGE"
  | "QUALITY"
  | "DAMAGED"
  | "WRONG_ITEM"
  | "OTHER";

export interface ReceivingDiscrepancy {
  id: UUID;
  receiving_item_id: UUID;
  discrepancy_type: DiscrepancyType;
  expected_value?: number | null;
  actual_value?: number | null;
  description: string;
  resolution_status: "OPEN" | "RESOLVED" | "WAIVED";
  resolved_by?: UUID | null;
  resolved_at?: string | null;
}

export interface ReceivingEvidence {
  id: UUID;
  receiving_item_id: UUID;
  storage_path: string;
  evidence_type: "PHOTO" | "DOCUMENT" | "OTHER";
  caption?: string;
  created_at?: string;
}

// Domain 6: Inventory
export interface InventoryBalance {
  id: UUID;
  school_id: UUID;
  ingredient_id: UUID;
  quantity_on_hand: number;
  updated_at: string;
}

export type MovementType =
  | "RECEIPT"
  | "ISSUE"
  | "RETURN"
  | "ADJUSTMENT"
  | "REVERSAL";

export interface InventoryMovement {
  id: UUID;
  school_id: UUID;
  ingredient_id: UUID;
  movement_type: MovementType;
  quantity: number;
  unit_id: UUID;
  source_type: string;
  source_id: UUID;
  occurred_at: string;
  created_by: UUID;
  idempotency_key?: string | null;
  reversal_of?: UUID | null;
  notes?: string;
}

export interface InventoryIssue {
  id: UUID;
  school_id: UUID;
  document_no: string;
  meal_plan_id?: UUID | null;
  issued_at: string;
  issued_by: UUID;
  status: "DRAFT" | "POSTED" | "CANCELLED";
}

export interface InventoryIssueItem {
  id: UUID;
  inventory_issue_id: UUID;
  ingredient_id: UUID;
  quantity: number;
  unit_id: UUID;
  notes?: string;
}

// =====================================================================
// Package 5: Domain 7 - Budget & Finance
// =====================================================================

export interface BudgetAllocation {
  id: UUID;
  school_id: UUID;
  fiscal_year: number;
  budget_code?: string;
  budget_name: string;
  allocated_amount: number;
  revised_amount: number;
  status: "ACTIVE" | "CLOSED";
  created_at?: string;
}

export interface FinancialCategory {
  id: UUID;
  school_id: UUID;
  code: string;
  name: string;
  category_type: "INCOME" | "EXPENSE";
  is_active: boolean;
}

export type TransactionType = "INCOME" | "EXPENSE" | "ADJUSTMENT" | "REVERSAL";

export type TransactionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export interface FinancialTransaction {
  id: UUID;
  school_id: UUID;
  document_no: string;
  transaction_date: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  total_amount: number;
  category_id: UUID;
  budget_allocation_id?: UUID | null;
  source_type?: string | null; // e.g. 'RECEIVING_RECORD', 'COOK_PAYMENT', 'GAS_BILL'
  source_id?: UUID | null;
  created_by: UUID;
  posted_at?: string | null;
  notes?: string;
  created_at?: string;
}

export interface FinancialTransactionItem {
  id: UUID;
  financial_transaction_id: UUID;
  description: string;
  quantity?: number | null;
  unit_price?: number | null;
  amount: number;
  ingredient_id?: UUID | null;
}

export interface FinancialPayment {
  id: UUID;
  school_id: UUID;
  financial_transaction_id: UUID;
  payment_date: string;
  amount: number;
  payment_method: "CASH" | "BANK_TRANSFER" | "CHEQUE";
  reference_no?: string;
  status: "PENDING" | "COMPLETED" | "VOIDED";
  created_at?: string;
}

export interface FinancialSummary {
  allocatedBudget: number;
  totalIncome: number;
  totalExpenses: number;
  netRemainingBudget: number;
  ingredientExpense: number;
  operationalExpense: number;
  averageCostPerHead: number;
}

-- ====================================================================
-- School Lunch OS: Package 1 - Foundation & Security Schema
-- Master Specification Compliant (Domain 1, Domain 9, Domain 10)
-- Timezone: Asia/Bangkok | Primary Key: UUID | Strict RLS & Multi-tenant
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    school_code TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    phone TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Connects with auth.users if using Supabase Auth
    display_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 3. SCHOOL MEMBERSHIP (Multi-tenant linkage)
CREATE TABLE IF NOT EXISTS school_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    membership_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (membership_status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_user UNIQUE (school_id, user_id)
);

-- 4. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL for system roles
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_school_role_code UNIQUE (school_id, code)
);

-- 5. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT
);

-- 6. ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 7. USER ROLES
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_user_school_role UNIQUE (school_id, user_id, role_id)
);

-- 8. AUDIT LOGS (Append-only, immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_data JSONB NULL,
    after_data JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 9. SCHOOL SETTINGS
CREATE TABLE IF NOT EXISTS school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_school_setting UNIQUE (school_id, setting_key)
);

-- 10. IDEMPOTENCY RECORDS (Prevents double submission)
CREATE TABLE IF NOT EXISTS idempotency_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    operation TEXT NOT NULL,
    result_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_idempotency_op UNIQUE (school_id, idempotency_key, operation)
);

-- ====================================================================
-- SEED DATA: Default Permissions & Roles (Spec 4.1 & 4.2)
-- ====================================================================

INSERT INTO permissions (code, description) VALUES
    ('meal_plan.view', 'View meal plans and daily menus'),
    ('meal_plan.create', 'Create new daily meal plans'),
    ('meal_plan.update', 'Edit draft meal plans'),
    ('meal_plan.confirm', 'Confirm and freeze meal plan snapshots'),
    ('recipe.view', 'View recipe details and ingredient measurements'),
    ('recipe.manage', 'Create, update, and version recipes'),
    ('purchase.view', 'View purchase orders and status'),
    ('purchase.create', 'Create purchase orders'),
    ('purchase.submit', 'Submit purchase orders for executive approval'),
    ('receiving.create', 'Create morning receiving records'),
    ('receiving.inspect', 'Inspect food quality and record actual quantities'),
    ('receiving.confirm', 'Confirm receiving and trigger stock-in movements'),
    ('inventory.view', 'View stock balances and inventory movements'),
    ('inventory.issue', 'Issue ingredients to the kitchen'),
    ('inventory.adjust', 'Record inventory adjustments and reversals'),
    ('finance.view', 'View budget allocations and financial transactions'),
    ('finance.create', 'Create income/expense records'),
    ('finance.post', 'Post financial transactions to general reports'),
    ('approval.view', 'View items in approval queue'),
    ('approval.act', 'Approve, reject, or return items'),
    ('report.view', 'View operational and financial reports'),
    ('report.export', 'Export reports to PDF/Excel'),
    ('user.manage', 'Manage school members and assign roles'),
    ('settings.manage', 'Configure school parameters and workflows')
ON CONFLICT (code) DO NOTHING;

-- Seed System Default Roles
INSERT INTO roles (id, school_id, code, name, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'SYSTEM_ADMIN', 'à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸šà¸à¸¥à¸²à¸‡', 'Technical and system administration', true),
    ('00000000-0000-0000-0000-000000000002', NULL, 'SCHOOL_ADMIN', 'à¸œà¸¹à¹‰à¸”à¸¹à¹à¸¥à¸£à¸°à¸šà¸šà¹‚à¸£à¸‡à¹€à¸£à¸µà¸¢à¸™', 'School administration and user access management', true),
    ('00000000-0000-0000-0000-000000000003', NULL, 'PLANNER', 'à¸œà¸¹à¹‰à¸§à¸²à¸‡à¹à¸œà¸™à¸­à¸²à¸«à¸²à¸£', 'Menu and recipe planning with diner estimation', true),
    ('00000000-0000-0000-0000-000000000004', NULL, 'DUTY_TEACHER', 'à¸„à¸£à¸¹à¹€à¸§à¸£à¸•à¸£à¸§à¸ˆà¸£à¸±à¸šà¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š', 'Morning ingredient receiving, quality inspection, and kitchen issue', true),
    ('00000000-0000-0000-0000-000000000005', NULL, 'FINANCE_OFFICER', 'à¹€à¸ˆà¹‰à¸²à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸à¸²à¸£à¹€à¸‡à¸´à¸™', 'Income, expenses, budget allocation and financial reports', true),
    ('00000000-0000-0000-0000-000000000006', NULL, 'EXECUTIVE', 'à¸œà¸¹à¹‰à¸šà¸£à¸´à¸«à¸²à¸£/à¸œà¸¹à¹‰à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´', 'Executive overview and workflow approvals', true)
ON CONFLICT DO NOTHING;

-- Map Default Permissions to Roles
-- DUTY_TEACHER gets receiving, inspection, viewing menu/recipes, and issuing ingredients
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
    'meal_plan.view', 'recipe.view', 'purchase.view',
    'receiving.create', 'receiving.inspect', 'receiving.confirm',
    'inventory.view', 'inventory.issue'
)
ON CONFLICT DO NOTHING;

-- FINANCE_OFFICER gets finance, budget, reports, and purchase viewing
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN (
    'finance.view', 'finance.create', 'finance.post',
    'purchase.view', 'report.view', 'report.export'
)
ON CONFLICT DO NOTHING;

-- PLANNER gets meal planning and recipe management
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
    'meal_plan.view', 'meal_plan.create', 'meal_plan.update', 'meal_plan.confirm',
    'recipe.view', 'recipe.manage', 'purchase.create', 'report.view'
)
ON CONFLICT DO NOTHING;

-- SCHOOL_ADMIN gets administration, user management, and configuration
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
ON CONFLICT DO NOTHING;
-- ====================================================================
-- School Lunch OS: Package 2 - Menu, Recipe & Ingredient Schema
-- Master Specification Compliant (Domain 2 & Domain 3)
-- Timezone: Asia/Bangkok | Primary Key: UUID | Strict NUMERIC & Snapshot
-- ====================================================================

-- 1. UNITS OF MEASUREMENT
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dimension TEXT NOT NULL CHECK (dimension IN ('MASS', 'VOLUME', 'COUNT', 'LENGTH')),
    decimal_places INTEGER NOT NULL DEFAULT 2
);

-- 2. UNIT CONVERSIONS (Same-dimension or ingredient-specific density)
CREATE TABLE IF NOT EXISTS unit_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    factor NUMERIC(18,8) NOT NULL CHECK (factor > 0),
    ingredient_id UUID NULL, -- NULL for universal (e.g. kg -> g), set for density
    notes TEXT,
    CONSTRAINT uq_unit_conversion UNIQUE (from_unit_id, to_unit_id, ingredient_id)
);

-- 3. INGREDIENT CATEGORIES
CREATE TABLE IF NOT EXISTS ingredient_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
    CONSTRAINT uq_school_category_name UNIQUE (school_id, name)
);

-- 4. INGREDIENTS
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    code TEXT,
    name TEXT NOT NULL,
    category_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
    base_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    purchase_unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_ingredient_name UNIQUE (school_id, name)
);

-- 5. INGREDIENT PRICES (Effective date ranges, historical accuracy)
CREATE TABLE IF NOT EXISTS ingredient_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    supplier_id UUID NULL,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    unit_price NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    source_document_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 6. MENUS
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    category TEXT, -- e.g. MAIN_DISH, SOUP, DESSERT, FRUIT
    description TEXT,
    instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 7. RECIPES (Versioned recipe for reference serving)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    servings_base NUMERIC(12,2) NOT NULL DEFAULT 90.00 CHECK (servings_base > 0),
    instructions TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_menu_version UNIQUE (menu_id, version)
);

-- 8. RECIPE ITEMS
CREATE TABLE IF NOT EXISTS recipe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    preparation_note TEXT,
    sequence_no INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_recipe_ingredient UNIQUE (recipe_id, ingredient_id)
);

-- 9. MEAL PLANS (Daily diner estimation)
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    meal_date DATE NOT NULL,
    estimated_diners INTEGER NOT NULL CHECK (estimated_diners > 0),
    actual_diners INTEGER NULL CHECK (actual_diners >= 0),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    confirmed_at TIMESTAMPTZ NULL,
    confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_meal_date UNIQUE (school_id, meal_date)
);

-- 10. MEAL PLAN ITEMS (With Frozen Snapshot JSONB)
CREATE TABLE IF NOT EXISTS meal_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
    servings INTEGER NOT NULL CHECK (servings > 0),
    sequence_no INTEGER NOT NULL DEFAULT 1,
    recipe_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_cost NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0),
    notes TEXT
);

-- ====================================================================
-- SEED DATA: Standard Thai School Lunch Units & Conversions
-- ====================================================================

INSERT INTO units (id, code, name, dimension, decimal_places) VALUES
    ('00000000-0000-0000-0001-000000000001', 'KG', 'à¸à¸´à¹‚à¸¥à¸à¸£à¸±à¸¡', 'MASS', 3),
    ('00000000-0000-0000-0001-000000000002', 'G', 'à¸à¸£à¸±à¸¡', 'MASS', 1),
    ('00000000-0000-0000-0001-000000000003', 'L', 'à¸¥à¸´à¸•à¸£', 'VOLUME', 3),
    ('00000000-0000-0000-0001-000000000004', 'ML', 'à¸¡à¸´à¸¥à¸¥à¸´à¸¥à¸´à¸•à¸£', 'VOLUME', 1),
    ('00000000-0000-0000-0001-000000000005', 'PIECE', 'à¸Šà¸´à¹‰à¸™', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000006', 'EGG', 'à¸Ÿà¸­à¸‡', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000007', 'BOTTLE', 'à¸‚à¸§à¸”', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000008', 'PACK', 'à¹à¸žà¹‡à¸', 'COUNT', 0)
ON CONFLICT (code) DO NOTHING;

-- Universal Conversions: 1 KG = 1000 G, 1 L = 1000 ML
INSERT INTO unit_conversions (from_unit_id, to_unit_id, factor, ingredient_id, notes) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000002', 1000.00000000, NULL, '1 à¸à¸´à¹‚à¸¥à¸à¸£à¸±à¸¡ = 1000 à¸à¸£à¸±à¸¡'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000001', 0.00100000, NULL, '1 à¸à¸£à¸±à¸¡ = 0.001 à¸à¸´à¹‚à¸¥à¸à¸£à¸±à¸¡'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0001-000000000004', 1000.00000000, NULL, '1 à¸¥à¸´à¸•à¸£ = 1000 à¸¡à¸´à¸¥à¸¥à¸´à¸¥à¸´à¸•à¸£'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0001-000000000003', 0.00100000, NULL, '1 à¸¡à¸´à¸¥à¸¥à¸´à¸¥à¸´à¸•à¸£ = 0.001 à¸¥à¸´à¸•à¸£')
ON CONFLICT DO NOTHING;
-- ====================================================================
-- School Lunch OS: Package 3 & 4 - Purchasing, Receiving & Inventory Schema
-- Master Specification Compliant (Domain 4, Domain 5, Domain 6)
-- Timezone: Asia/Bangkok | Primary Key: UUID | Strict Ledger & Audit
-- ====================================================================

-- 1. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    tax_id TEXT NULL,
    contact_name TEXT,
    phone TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 2. PURCHASE ORDERS (PO)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    document_no TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 
        'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'
    )),
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_po_doc UNIQUE (school_id, document_no)
);

-- 3. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    description TEXT,
    ordered_quantity NUMERIC(14,4) NOT NULL CHECK (ordered_quantity > 0),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    unit_price NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
    received_quantity NUMERIC(14,4) NOT NULL DEFAULT 0.0000 CHECK (received_quantity >= 0),
    notes TEXT,
    CONSTRAINT uq_po_ingredient UNIQUE (purchase_order_id, ingredient_id)
);

-- 4. RECEIVING RECORDS (Morning Inspection Header)
CREATE TABLE IF NOT EXISTS receiving_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    document_no TEXT NOT NULL,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    received_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'INSPECTING', 'PARTIALLY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'CANCELLED'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_receiving_doc UNIQUE (school_id, document_no)
);

-- 5. RECEIVING ITEMS
CREATE TABLE IF NOT EXISTS receiving_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiving_record_id UUID NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
    purchase_order_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
    received_quantity NUMERIC(14,4) NOT NULL CHECK (received_quantity >= 0),
    accepted_quantity NUMERIC(14,4) NOT NULL CHECK (accepted_quantity >= 0),
    rejected_quantity NUMERIC(14,4) NOT NULL DEFAULT 0.0000 CHECK (rejected_quantity >= 0),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    inspection_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (inspection_status IN (
        'PENDING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED'
    )),
    quality_note TEXT,
    discrepancy_note TEXT,
    CONSTRAINT chk_receiving_quantities CHECK ((accepted_quantity + rejected_quantity) <= received_quantity)
);

-- 6. RECEIVING DISCREPANCIES (Shortage, Overage, Damaged, Wrong Item)
CREATE TABLE IF NOT EXISTS receiving_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiving_item_id UUID NOT NULL REFERENCES receiving_items(id) ON DELETE CASCADE,
    discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN (
        'SHORTAGE', 'OVERAGE', 'QUALITY', 'DAMAGED', 'WRONG_ITEM', 'OTHER'
    )),
    expected_value NUMERIC(14,4) NULL,
    actual_value NUMERIC(14,4) NULL,
    description TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (resolution_status IN ('OPEN', 'RESOLVED', 'WAIVED')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL
);

-- 7. RECEIVING EVIDENCE (Photos from mobile inspection in kitchen)
CREATE TABLE IF NOT EXISTS receiving_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiving_item_id UUID NOT NULL REFERENCES receiving_items(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    evidence_type TEXT NOT NULL DEFAULT 'PHOTO' CHECK (evidence_type IN ('PHOTO', 'DOCUMENT', 'OTHER')),
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 8. INVENTORY BALANCES (Fast Read Summary)
CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_ingredient_stock UNIQUE (school_id, ingredient_id)
);

-- 9. INVENTORY MOVEMENTS (Append-Only Stock Ledger - Single Source of Truth)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'RECEIPT', 'ISSUE', 'RETURN', 'ADJUSTMENT', 'REVERSAL'
    )),
    quantity NUMERIC(14,4) NOT NULL, -- Positive for IN, Negative for OUT
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    source_type TEXT NOT NULL, -- e.g. 'RECEIVING', 'ISSUE_TO_KITCHEN'
    source_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    idempotency_key TEXT NULL,
    reversal_of UUID REFERENCES inventory_movements(id) ON DELETE RESTRICT,
    notes TEXT
);

-- 10. INVENTORY ISSUES (Issue to School Kitchen)
CREATE TABLE IF NOT EXISTS inventory_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    document_no TEXT NOT NULL,
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    CONSTRAINT uq_school_issue_doc UNIQUE (school_id, document_no)
);

CREATE TABLE IF NOT EXISTS inventory_issue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_issue_id UUID NOT NULL REFERENCES inventory_issues(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    notes TEXT
);
-- ====================================================================
-- School Lunch OS: Package 5 - Budget & Finance Schema
-- Master Specification Compliant (Domain 7)
-- Timezone: Asia/Bangkok | Primary Key: UUID | Strict Ledger & Reversal
-- ====================================================================

-- 1. BUDGET ALLOCATIONS (Government / Local Authority Lunch Grants)
CREATE TABLE IF NOT EXISTS budget_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL DEFAULT 2569,
    budget_code TEXT,
    budget_name TEXT NOT NULL,
    allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount >= 0),
    revised_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (revised_amount >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    source_document_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 2. FINANCIAL CATEGORIES
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category_type TEXT NOT NULL CHECK (category_type IN ('INCOME', 'EXPENSE')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_school_finance_cat UNIQUE (school_id, code)
);

-- 3. FINANCIAL TRANSACTIONS (Single Source of Truth for Money)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    document_no TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'ADJUSTMENT', 'REVERSAL')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED', 'REVERSED'
    )),
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    category_id UUID NOT NULL REFERENCES financial_categories(id) ON DELETE RESTRICT,
    budget_allocation_id UUID REFERENCES budget_allocations(id) ON DELETE SET NULL,
    source_type TEXT NULL, -- e.g. 'RECEIVING_RECORD', 'MANUAL_VOUCHER'
    source_id UUID NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    posted_at TIMESTAMPTZ NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now()),
    CONSTRAINT uq_school_finance_doc UNIQUE (school_id, document_no)
);

-- 4. FINANCIAL TRANSACTION ITEMS
CREATE TABLE IF NOT EXISTS financial_transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(14,4) NULL,
    unit_price NUMERIC(14,4) NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL
);

-- 5. FINANCIAL COMMITMENTS (Encumbrance from Purchase Orders)
CREATE TABLE IF NOT EXISTS financial_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    source_type TEXT NOT NULL DEFAULT 'PURCHASE_ORDER',
    source_id UUID NOT NULL,
    budget_allocation_id UUID REFERENCES budget_allocations(id) ON DELETE SET NULL,
    committed_amount NUMERIC(14,2) NOT NULL CHECK (committed_amount >= 0),
    released_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (released_amount >= 0),
    status TEXT NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'RELEASED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- 6. FINANCIAL PAYMENTS (Cash / Transfer Disbursements)
CREATE TABLE IF NOT EXISTS financial_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    financial_transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHEQUE')),
    reference_no TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'VOIDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Bangkok'::text, now())
);

-- ====================================================================
-- SEED DATA: Standard Thai School Lunch Financial Categories
-- ====================================================================

INSERT INTO financial_categories (id, school_id, code, name, category_type, is_active) VALUES
    ('00000000-0005-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'INC_GRANT', 'à¹€à¸‡à¸´à¸™à¸­à¸¸à¸”à¸«à¸™à¸¸à¸™à¸­à¸²à¸«à¸²à¸£à¸à¸¥à¸²à¸‡à¸§à¸±à¸™ (à¸£à¸±à¸/à¸­à¸›à¸—.)', 'INCOME', true),
    ('00000000-0005-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'INC_DONATION', 'à¹€à¸‡à¸´à¸™à¸šà¸£à¸´à¸ˆà¸²à¸„/à¸ªà¸™à¸±à¸šà¸ªà¸™à¸¸à¸™à¹‚à¸„à¸£à¸‡à¸à¸²à¸£à¸­à¸²à¸«à¸²à¸£', 'INCOME', true),
    ('00000000-0005-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'EXP_INGREDIENT', 'à¸„à¹ˆà¸²à¸ˆà¸±à¸”à¸‹à¸·à¹‰à¸­à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¸‚à¸­à¸‡à¸ªà¸”à¹à¸¥à¸°à¸‚à¸­à¸‡à¹à¸«à¹‰à¸‡', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'EXP_COOK_WAGE', 'à¸„à¹ˆà¸²à¸ˆà¹‰à¸²à¸‡à¹€à¸«à¸¡à¸²à¹à¸¡à¹ˆà¸„à¸£à¸±à¸§/à¸œà¸¹à¹‰à¸›à¸£à¸°à¸à¸­à¸šà¸­à¸²à¸«à¸²à¸£', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'EXP_GAS_FUEL', 'à¸„à¹ˆà¸²à¸à¹Šà¸²à¸‹à¸«à¸¸à¸‡à¸•à¹‰à¸¡à¹à¸¥à¸°à¹€à¸Šà¸·à¹‰à¸­à¹€à¸žà¸¥à¸´à¸‡', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'EXP_CLEANING', 'à¸§à¸±à¸ªà¸”à¸¸à¸—à¸³à¸„à¸§à¸²à¸¡à¸ªà¸°à¸­à¸²à¸”à¹à¸¥à¸°à¸ªà¸¸à¸‚à¸²à¸ à¸´à¸šà¸²à¸¥à¹‚à¸£à¸‡à¸„à¸£à¸±à¸§', 'EXPENSE', true)
ON CONFLICT (school_id, code) DO NOTHING;

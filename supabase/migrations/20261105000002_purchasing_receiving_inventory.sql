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

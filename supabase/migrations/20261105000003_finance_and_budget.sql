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
    ('00000000-0005-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'INC_GRANT', 'เงินอุดหนุนอาหารกลางวัน (รัฐ/อปท.)', 'INCOME', true),
    ('00000000-0005-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'INC_DONATION', 'เงินบริจาค/สนับสนุนโครงการอาหาร', 'INCOME', true),
    ('00000000-0005-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'EXP_INGREDIENT', 'ค่าจัดซื้อวัตถุดิบของสดและของแห้ง', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'EXP_COOK_WAGE', 'ค่าจ้างเหมาแม่ครัว/ผู้ประกอบอาหาร', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'EXP_GAS_FUEL', 'ค่าก๊าซหุงต้มและเชื้อเพลิง', 'EXPENSE', true),
    ('00000000-0005-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'EXP_CLEANING', 'วัสดุทำความสะอาดและสุขาภิบาลโรงครัว', 'EXPENSE', true)
ON CONFLICT (school_id, code) DO NOTHING;

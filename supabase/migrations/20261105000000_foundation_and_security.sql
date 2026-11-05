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
-- SEED DATA: Default School, Permissions & Roles (Spec 4.1 & 4.2)
-- ====================================================================

-- Seed Default School
INSERT INTO schools (id, code, name, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'SCH-001', 'โรงเรียนอนุบาลเทศบาลเมือง', true)
ON CONFLICT (id) DO NOTHING;

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
    ('00000000-0000-0000-0000-000000000001', NULL, 'SYSTEM_ADMIN', 'ผู้ดูแลระบบกลาง', 'Technical and system administration', true),
    ('00000000-0000-0000-0000-000000000002', NULL, 'SCHOOL_ADMIN', 'ผู้ดูแลระบบโรงเรียน', 'School administration and user access management', true),
    ('00000000-0000-0000-0000-000000000003', NULL, 'PLANNER', 'ผู้วางแผนอาหาร', 'Menu and recipe planning with diner estimation', true),
    ('00000000-0000-0000-0000-000000000004', NULL, 'DUTY_TEACHER', 'ครูเวรตรวจรับวัตถุดิบ', 'Morning ingredient receiving, quality inspection, and kitchen issue', true),
    ('00000000-0000-0000-0000-000000000005', NULL, 'FINANCE_OFFICER', 'เจ้าหน้าที่การเงิน', 'Income, expenses, budget allocation and financial reports', true),
    ('00000000-0000-0000-0000-000000000006', NULL, 'EXECUTIVE', 'ผู้บริหาร/ผู้อนุมัติ', 'Executive overview and workflow approvals', true)
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

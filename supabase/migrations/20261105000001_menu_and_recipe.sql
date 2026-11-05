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
    ('00000000-0000-0000-0001-000000000001', 'KG', 'กิโลกรัม', 'MASS', 3),
    ('00000000-0000-0000-0001-000000000002', 'G', 'กรัม', 'MASS', 1),
    ('00000000-0000-0000-0001-000000000003', 'L', 'ลิตร', 'VOLUME', 3),
    ('00000000-0000-0000-0001-000000000004', 'ML', 'มิลลิลิตร', 'VOLUME', 1),
    ('00000000-0000-0000-0001-000000000005', 'PIECE', 'ชิ้น', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000006', 'EGG', 'ฟอง', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000007', 'BOTTLE', 'ขวด', 'COUNT', 0),
    ('00000000-0000-0000-0001-000000000008', 'PACK', 'แพ็ก', 'COUNT', 0)
ON CONFLICT (code) DO NOTHING;

-- Universal Conversions: 1 KG = 1000 G, 1 L = 1000 ML
INSERT INTO unit_conversions (from_unit_id, to_unit_id, factor, ingredient_id, notes) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0001-000000000002', 1000.00000000, NULL, '1 กิโลกรัม = 1000 กรัม'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0001-000000000001', 0.00100000, NULL, '1 กรัม = 0.001 กิโลกรัม'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0001-000000000004', 1000.00000000, NULL, '1 ลิตร = 1000 มิลลิลิตร'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0001-000000000003', 0.00100000, NULL, '1 มิลลิลิตร = 0.001 ลิตร')
ON CONFLICT DO NOTHING;

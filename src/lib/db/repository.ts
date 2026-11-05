import {
  AuditLog,
  DimensionType,
  Ingredient,
  IngredientPrice,
  MealPlan,
  MealPlanItem,
  Menu,
  PermissionCode,
  Recipe,
  RecipeItem,
  Role,
  RoleCode,
  School,
  SchoolMember,
  SchoolSetting,
  Unit,
  UnitConversion,
  UserProfile,
  UserRole,
  UUID,
} from "@/types";
import { ROLE_DEFAULT_PERMISSIONS, UserContext } from "../auth/rbac";

export class DataStore {
  // Domain 1: School & Identity
  public schools: Map<UUID, School> = new Map();
  public profiles: Map<UUID, UserProfile> = new Map();
  public schoolMembers: Map<UUID, SchoolMember> = new Map();
  public roles: Map<UUID, Role> = new Map();
  public userRoles: Map<UUID, UserRole> = new Map();
  public settings: Map<string, SchoolSetting> = new Map();
  public auditLogs: AuditLog[] = [];

  // Domain 2: Menu & Recipe
  public menus: Map<UUID, Menu> = new Map();
  public recipes: Map<UUID, Recipe> = new Map();
  public recipeItems: RecipeItem[] = [];
  public mealPlans: Map<UUID, MealPlan> = new Map();
  public mealPlanItems: MealPlanItem[] = [];

  // Domain 3: Ingredient & Unit
  public units: Map<UUID, Unit> = new Map();
  public unitConversions: UnitConversion[] = [];
  public ingredients: Map<UUID, Ingredient> = new Map();
  public ingredientPrices: Map<UUID, IngredientPrice> = new Map();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    // -------------------------------------------------------------
    // 1. Seed Demonstration School & Roles
    // -------------------------------------------------------------
    const schoolId: UUID = "11111111-1111-1111-1111-111111111111";
    this.schools.set(schoolId, {
      id: schoolId,
      name: "โรงเรียนบ้านหนองแคนพัฒนา",
      school_code: "SCH-001",
      phone: "043-123456",
      settings: {
        defaultDiners: 90,
        currency: "THB",
        subsidyPerHead: 22.0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const roleTeacherId: UUID = "00000000-0000-0000-0000-000000000004";
    const roleFinanceId: UUID = "00000000-0000-0000-0000-000000000005";
    const roleExecId: UUID = "00000000-0000-0000-0000-000000000006";
    const rolePlannerId: UUID = "00000000-0000-0000-0000-000000000003";

    this.roles.set(roleTeacherId, {
      id: roleTeacherId,
      school_id: null,
      code: "DUTY_TEACHER",
      name: "ครูเวรตรวจรับวัตถุดิบ",
      is_system: true,
    });
    this.roles.set(roleFinanceId, {
      id: roleFinanceId,
      school_id: null,
      code: "FINANCE_OFFICER",
      name: "เจ้าหน้าที่การเงิน",
      is_system: true,
    });
    this.roles.set(roleExecId, {
      id: roleExecId,
      school_id: null,
      code: "EXECUTIVE",
      name: "ผู้บริหาร/ผู้อนุมัติ",
      is_system: true,
    });
    this.roles.set(rolePlannerId, {
      id: rolePlannerId,
      school_id: null,
      code: "PLANNER",
      name: "ผู้วางแผนอาหาร",
      is_system: true,
    });

    // Users
    const teacherId: UUID = "22222222-2222-2222-2222-222222222222";
    this.profiles.set(teacherId, {
      id: teacherId,
      display_name: "ครูสมศรี (ครูเวรประจำวัน)",
      email: "somsri@school.ac.th",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.schoolMembers.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: teacherId,
      membership_status: "ACTIVE",
      joined_at: new Date().toISOString(),
    });
    this.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: teacherId,
      role_id: roleTeacherId,
    });

    const execId: UUID = "33333333-3333-3333-3333-333333333333";
    this.profiles.set(execId, {
      id: execId,
      display_name: "ผอ.สมเกียรติ (ผู้อำนวยการ)",
      email: "somkiat@school.ac.th",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.schoolMembers.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: execId,
      membership_status: "ACTIVE",
      joined_at: new Date().toISOString(),
    });
    this.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: execId,
      role_id: roleExecId,
    });

    const financeId: UUID = "44444444-4444-4444-4444-444444444444";
    this.profiles.set(financeId, {
      id: financeId,
      display_name: "คุณนภา (เจ้าหน้าที่การเงิน)",
      email: "napha@school.ac.th",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    this.schoolMembers.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: financeId,
      membership_status: "ACTIVE",
      joined_at: new Date().toISOString(),
    });
    this.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: financeId,
      role_id: roleFinanceId,
    });

    // -------------------------------------------------------------
    // 2. Seed Units of Measurement & Conversions
    // -------------------------------------------------------------
    const unitKg: UUID = "00000000-0000-0001-0000-000000000001";
    const unitG: UUID = "00000000-0000-0001-0000-000000000002";
    const unitL: UUID = "00000000-0000-0001-0000-000000000003";
    const unitMl: UUID = "00000000-0000-0001-0000-000000000004";
    const unitEgg: UUID = "00000000-0000-0001-0000-000000000006";
    const unitBottle: UUID = "00000000-0000-0001-0000-000000000007";

    this.units.set(unitKg, { id: unitKg, code: "KG", name: "กิโลกรัม", dimension: "MASS", decimal_places: 3 });
    this.units.set(unitG, { id: unitG, code: "G", name: "กรัม", dimension: "MASS", decimal_places: 1 });
    this.units.set(unitL, { id: unitL, code: "L", name: "ลิตร", dimension: "VOLUME", decimal_places: 3 });
    this.units.set(unitMl, { id: unitMl, code: "ML", name: "มิลลิลิตร", dimension: "VOLUME", decimal_places: 1 });
    this.units.set(unitEgg, { id: unitEgg, code: "EGG", name: "ฟอง", dimension: "COUNT", decimal_places: 0 });
    this.units.set(unitBottle, { id: unitBottle, code: "BOTTLE", name: "ขวด", dimension: "COUNT", decimal_places: 0 });

    this.unitConversions.push({
      id: crypto.randomUUID(),
      from_unit_id: unitKg,
      to_unit_id: unitG,
      factor: 1000,
    });
    this.unitConversions.push({
      id: crypto.randomUUID(),
      from_unit_id: unitL,
      to_unit_id: unitMl,
      factor: 1000,
    });

    // -------------------------------------------------------------
    // 3. Seed Ingredients & Prices
    // -------------------------------------------------------------
    const ingChicken: UUID = "00000000-0002-0000-0000-000000000001";
    const ingRice: UUID = "00000000-0002-0000-0000-000000000002";
    const ingCucumber: UUID = "00000000-0002-0000-0000-000000000003";
    const ingMelon: UUID = "00000000-0002-0000-0000-000000000004";
    const ingPork: UUID = "00000000-0002-0000-0000-000000000005";
    const ingEgg: UUID = "00000000-0002-0000-0000-000000000006";
    const ingBasil: UUID = "00000000-0002-0000-0000-000000000007";
    const ingSoySauce: UUID = "00000000-0002-0000-0000-000000000008";

    this.ingredients.set(ingChicken, {
      id: ingChicken,
      school_id: schoolId,
      code: "ING-001",
      name: "เนื้อไก่สด (อกและสะโพก)",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingRice, {
      id: ingRice,
      school_id: schoolId,
      code: "ING-002",
      name: "ข้าวสารหอมมะลิ 100%",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingCucumber, {
      id: ingCucumber,
      school_id: schoolId,
      code: "ING-003",
      name: "แตงกวาสดคัดเกรด",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingMelon, {
      id: ingMelon,
      school_id: schoolId,
      code: "ING-004",
      name: "ฟักเขียวสำหรับต้มน้ำซุป",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingPork, {
      id: ingPork,
      school_id: schoolId,
      code: "ING-005",
      name: "หมูสับอนามัย",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingEgg, {
      id: ingEgg,
      school_id: schoolId,
      code: "ING-006",
      name: "ไข่ไก่สด เบอร์ 3",
      base_unit_id: unitEgg,
      is_active: true,
    });
    this.ingredients.set(ingBasil, {
      id: ingBasil,
      school_id: schoolId,
      code: "ING-007",
      name: "ใบกะเพราสด",
      base_unit_id: unitKg,
      is_active: true,
    });
    this.ingredients.set(ingSoySauce, {
      id: ingSoySauce,
      school_id: schoolId,
      code: "ING-008",
      name: "ซีอิ๊วขาวสูตร 1",
      base_unit_id: unitBottle,
      is_active: true,
    });

    // Prices (THB)
    this.ingredientPrices.set(ingChicken, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingChicken,
      unit_id: unitKg,
      unit_price: 85.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingRice, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingRice,
      unit_id: unitKg,
      unit_price: 38.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingCucumber, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingCucumber,
      unit_id: unitKg,
      unit_price: 30.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingMelon, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingMelon,
      unit_id: unitKg,
      unit_price: 20.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingPork, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingPork,
      unit_id: unitKg,
      unit_price: 140.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingEgg, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingEgg,
      unit_id: unitEgg,
      unit_price: 4.2,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingBasil, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingBasil,
      unit_id: unitKg,
      unit_price: 50.0,
      effective_from: "2026-01-01",
    });
    this.ingredientPrices.set(ingSoySauce, {
      id: crypto.randomUUID(),
      school_id: schoolId,
      ingredient_id: ingSoySauce,
      unit_id: unitBottle,
      unit_price: 45.0,
      effective_from: "2026-01-01",
    });

    // -------------------------------------------------------------
    // 4. Seed Menus & Recipes (Base for 90 Diners)
    // -------------------------------------------------------------
    // Menu 1: ข้าวมันไก่ตอน
    const menuChickenRice: UUID = "00000000-0003-0000-0000-000000000001";
    this.menus.set(menuChickenRice, {
      id: menuChickenRice,
      school_id: schoolId,
      name: "ข้าวมันไก่ตอน + แตงกวาสด + น้ำซุปฟัก",
      category: "MAIN_DISH",
      description: "ข้าวมันหอมนุ่ม ไก่ต้มสุกสะอาด พร้อมน้ำจิ้มรสกลมกล่อมและน้ำซุปฟักร้อนๆ",
      is_active: true,
    });

    const recipeChickenRice: UUID = "00000000-0004-0000-0000-000000000001";
    this.recipes.set(recipeChickenRice, {
      id: recipeChickenRice,
      school_id: schoolId,
      menu_id: menuChickenRice,
      version: 1,
      servings_base: 90.0,
      status: "ACTIVE",
      effective_from: "2026-01-01",
    });

    this.recipeItems.push(
      {
        id: crypto.randomUUID(),
        recipe_id: recipeChickenRice,
        ingredient_id: ingChicken,
        quantity: 9.0, // 9 kg for 90 kids (100g/kid)
        unit_id: unitKg,
        sequence_no: 1,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeChickenRice,
        ingredient_id: ingRice,
        quantity: 10.0, // 10 kg
        unit_id: unitKg,
        sequence_no: 2,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeChickenRice,
        ingredient_id: ingCucumber,
        quantity: 3.0, // 3 kg
        unit_id: unitKg,
        sequence_no: 3,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeChickenRice,
        ingredient_id: ingMelon,
        quantity: 4.0, // 4 kg
        unit_id: unitKg,
        sequence_no: 4,
      }
    );

    // Menu 2: ผัดกะเพราหมูสับไข่ดาว
    const menuBasilPork: UUID = "00000000-0003-0000-0000-000000000002";
    this.menus.set(menuBasilPork, {
      id: menuBasilPork,
      school_id: schoolId,
      name: "ผัดกะเพราหมูสับไข่ดาว + ข้าวสวย",
      category: "MAIN_DISH",
      description: "ผัดกะเพราหมูสับรสกลมกล่อมไม่เผ็ดจัดสำหรับเด็ก พร้อมไข่ดาวสุกปลอดภัย",
      is_active: true,
    });

    const recipeBasilPork: UUID = "00000000-0004-0000-0000-000000000002";
    this.recipes.set(recipeBasilPork, {
      id: recipeBasilPork,
      school_id: schoolId,
      menu_id: menuBasilPork,
      version: 1,
      servings_base: 90.0,
      status: "ACTIVE",
      effective_from: "2026-01-01",
    });

    this.recipeItems.push(
      {
        id: crypto.randomUUID(),
        recipe_id: recipeBasilPork,
        ingredient_id: ingPork,
        quantity: 7.0, // 7 kg
        unit_id: unitKg,
        sequence_no: 1,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeBasilPork,
        ingredient_id: ingEgg,
        quantity: 90.0, // 90 eggs (1 egg/kid)
        unit_id: unitEgg,
        sequence_no: 2,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeBasilPork,
        ingredient_id: ingRice,
        quantity: 10.0,
        unit_id: unitKg,
        sequence_no: 3,
      },
      {
        id: crypto.randomUUID(),
        recipe_id: recipeBasilPork,
        ingredient_id: ingBasil,
        quantity: 1.5,
        unit_id: unitKg,
        sequence_no: 4,
      }
    );
  }

  public getUserContext(userId: UUID, schoolId: UUID): UserContext | null {
    const profile = this.profiles.get(userId);
    if (!profile || !profile.is_active) return null;

    const isMember = Array.from(this.schoolMembers.values()).some(
      (m) =>
        m.user_id === userId &&
        m.school_id === schoolId &&
        m.membership_status === "ACTIVE"
    );
    if (!isMember) return null;

    const assignedRoles: RoleCode[] = [];
    const permissionsSet = new Set<PermissionCode>();

    for (const ur of this.userRoles.values()) {
      if (ur.user_id === userId && ur.school_id === schoolId) {
        const role = this.roles.get(ur.role_id);
        if (role) {
          const code = role.code as RoleCode;
          assignedRoles.push(code);
          const perms = ROLE_DEFAULT_PERMISSIONS[code] || [];
          perms.forEach((p) => permissionsSet.add(p));
        }
      }
    }

    return {
      userId,
      schoolId,
      roles: assignedRoles,
      permissions: Array.from(permissionsSet),
    };
  }
}

export const db = new DataStore();

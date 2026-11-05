import { supabase, isSupabaseConfigured } from "./supabase/client";

export const DEFAULT_SCHOOL_ID = "11111111-1111-1111-1111-111111111111";
export const STORAGE_KEY = "school_lunch_os_state_v2";

export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export interface DayDefinition {
  key: DayKey;
  label: string;
  shortLabel: string;
  dotColor: string;
  activeBadge: string;
}

export const DAY_DEFINITIONS: DayDefinition[] = [
  { key: "monday", label: "วันจันทร์", shortLabel: "จันทร์", dotColor: "bg-amber-400", activeBadge: "bg-amber-50 text-amber-900 border-amber-300 ring-amber-400/30" },
  { key: "tuesday", label: "วันอังคาร", shortLabel: "อังคาร", dotColor: "bg-pink-400", activeBadge: "bg-pink-50 text-pink-900 border-pink-300 ring-pink-400/30" },
  { key: "wednesday", label: "วันพุธ", shortLabel: "พุธ", dotColor: "bg-emerald-500", activeBadge: "bg-emerald-50 text-emerald-900 border-emerald-300 ring-emerald-400/30" },
  { key: "thursday", label: "วันพฤหัสบดี", shortLabel: "พฤหัสบดี", dotColor: "bg-orange-500", activeBadge: "bg-orange-50 text-orange-900 border-orange-300 ring-orange-400/30" },
  { key: "friday", label: "วันศุกร์", shortLabel: "ศุกร์", dotColor: "bg-blue-400", activeBadge: "bg-blue-50 text-blue-900 border-blue-300 ring-blue-400/30" },
];

export function getTodayDayKey(): DayKey {
  const d = new Date().getDay();
  switch (d) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    default:
      return "thursday";
  }
}

export interface DutyRoster {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
}

export interface SchoolSettings {
  schoolName: string;
  directorName: string;
  nutritionHeadName: string;
  academicYear: string;
  semester: string;
  totalSemesterDays?: number;
  dutyRoster: DutyRoster;
}

export const DEFAULT_DUTY_ROSTER: DutyRoster = {
  monday: ["ครูสมศรี ใจดี", "ครูมานะ ขยันยิ่ง"],
  tuesday: ["ครูวิชัย เก่งการ", "ครูชลธิชา สดใส"],
  wednesday: ["ครูประภาส สุขสงบ", "ครูณัฐพล ส่องแสง"],
  thursday: ["ครูอนงค์ รักเด็ก", "ครูชวลิต มั่งมี"],
  friday: ["ครูสุชาติ พากเพียร", "ครูกานดา วาจางาม"],
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: "โรงเรียนบ้านควนเนียง (สพป. สฎ. เขต 3)",
  directorName: "นายวิเชียร มุ่งมั่น (ผู้อำนวยการโรงเรียน)",
  nutritionHeadName: "ครูพรทิพย์ เจริญจิตต์ (ผู้รับผิดชอบโครงการอาหารกลางวัน)",
  academicYear: "2569",
  semester: "ภาคเรียนที่ 2",
  totalSemesterDays: 100,
  dutyRoster: DEFAULT_DUTY_ROSTER,
};

export interface MenuItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface PresetMenu {
  id: string;
  name: string;
  category: string;
  ingredients: MenuItem[];
}

export interface DayPlan {
  menuName: string;
  category: string;
  ingredients: MenuItem[];
  isFrozen?: boolean;
}

export type WeeklyPlan = Record<DayKey, DayPlan>;

export const DEFAULT_WEEKLY_PLAN: WeeklyPlan = {
  monday: {
    menuName: "เมนูวันจันทร์",
    category: "อาหารจานเดียว",
    ingredients: [],
    isFrozen: false,
  },
  tuesday: {
    menuName: "เมนูวันอังคาร",
    category: "อาหารจานเดียว",
    ingredients: [],
    isFrozen: false,
  },
  wednesday: {
    menuName: "เมนูวันพุธ",
    category: "อาหารจานเดียว",
    ingredients: [],
    isFrozen: false,
  },
  thursday: {
    menuName: "เมนูวันพฤหัสบดี",
    category: "อาหารจานเดียว",
    ingredients: [],
    isFrozen: false,
  },
  friday: {
    menuName: "แกงกะทิไก่/ฟักทอง/ผัดวุ้นเส้น/ผลไม้",
    category: "กับข้าว",
    ingredients: [
      { id: "ing-fri-1", name: "เนื้อสัตว์หลัก (ไก่/หมู)", qty: 6, unit: "กก.", unitPrice: 110 },
      { id: "ing-fri-2", name: "ผักสด / เครื่องแกง", qty: 2.5, unit: "กก.", unitPrice: 40 },
      { id: "ing-fri-3", name: "ข้าวสารหอมมะลิ 100%", qty: 10, unit: "กก.", unitPrice: 38 },
      { id: "ing-fri-4", name: "เครื่องปรุงรส", qty: 1, unit: "ขวด", unitPrice: 45 },
    ],
    isFrozen: false,
  },
};

export interface InspectionItemState {
  id: string;
  name: string;
  ordered: number;
  received: number;
  accepted: number;
  rejected: number;
  unit: string;
  unitPrice: number;
  status: "PENDING" | "ACCEPTED" | "DISCREPANCY";
  isAdHoc?: boolean;
  note?: string;
  photoUrl?: string;
}

export interface FinancialTransactionDisplay {
  id: string;
  documentNo: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
}

export interface AppSyncPayload {
  settings?: SchoolSettings;
  weeklyPlan?: WeeklyPlan;
  selectedDayKey?: DayKey;
  presetMenus?: PresetMenu[];
  selectedMenuId?: string;
  activeMenuId?: string;
  dailyIngredients?: MenuItem[];
  transactions?: FinancialTransactionDisplay[];
  inspectionItems?: InspectionItemState[];
  isPlanFrozen?: boolean;
  isReceivingConfirmed?: boolean;
  confirmedAtTime?: string | null;
  lastUpdated?: string;
}

/**
 * Defensive Normalizer: Flattens or un-nests school settings, guarantees valid strings and arrays
 */
export function normalizeSchoolSettings(raw: unknown, fallbackName?: string): SchoolSettings {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SCHOOL_SETTINGS,
      ...(fallbackName ? { schoolName: fallbackName } : {}),
    };
  }

  const obj = raw as Record<string, unknown>;
  const source =
    obj.settings && typeof obj.settings === "object"
      ? (obj.settings as Record<string, unknown>)
      : obj;

  const dutyRaw =
    source.dutyRoster && typeof source.dutyRoster === "object"
      ? (source.dutyRoster as Record<string, unknown>)
      : {};

  const cleanDuty: DutyRoster = {
    monday:
      Array.isArray(dutyRaw.monday) && dutyRaw.monday.length > 0
        ? (dutyRaw.monday as string[])
        : DEFAULT_DUTY_ROSTER.monday,
    tuesday:
      Array.isArray(dutyRaw.tuesday) && dutyRaw.tuesday.length > 0
        ? (dutyRaw.tuesday as string[])
        : DEFAULT_DUTY_ROSTER.tuesday,
    wednesday:
      Array.isArray(dutyRaw.wednesday) && dutyRaw.wednesday.length > 0
        ? (dutyRaw.wednesday as string[])
        : DEFAULT_DUTY_ROSTER.wednesday,
    thursday:
      Array.isArray(dutyRaw.thursday) && dutyRaw.thursday.length > 0
        ? (dutyRaw.thursday as string[])
        : DEFAULT_DUTY_ROSTER.thursday,
    friday:
      Array.isArray(dutyRaw.friday) && dutyRaw.friday.length > 0
        ? (dutyRaw.friday as string[])
        : DEFAULT_DUTY_ROSTER.friday,
  };

  const resolvedName =
    (typeof source.schoolName === "string" && source.schoolName.trim()) ||
    (typeof fallbackName === "string" && fallbackName.trim()) ||
    DEFAULT_SCHOOL_SETTINGS.schoolName;

  return {
    schoolName: resolvedName,
    directorName:
      (typeof source.directorName === "string" && source.directorName.trim()) ||
      DEFAULT_SCHOOL_SETTINGS.directorName,
    nutritionHeadName:
      (typeof source.nutritionHeadName === "string" && source.nutritionHeadName.trim()) ||
      DEFAULT_SCHOOL_SETTINGS.nutritionHeadName,
    academicYear:
      (typeof source.academicYear === "string" && source.academicYear.trim()) ||
      DEFAULT_SCHOOL_SETTINGS.academicYear,
    semester:
      (typeof source.semester === "string" && source.semester.trim()) ||
      DEFAULT_SCHOOL_SETTINGS.semester,
    totalSemesterDays:
      Number(source.totalSemesterDays) || DEFAULT_SCHOOL_SETTINGS.totalSemesterDays,
    dutyRoster: cleanDuty,
  };
}

/**
 * Defensive Normalizer: Guarantees complete 5-day WeeklyPlan structure
 */
export function normalizeWeeklyPlan(raw: unknown): WeeklyPlan {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WEEKLY_PLAN };
  const obj = raw as Record<string, unknown>;
  const days: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const result: WeeklyPlan = {
    monday: { ...DEFAULT_WEEKLY_PLAN.monday },
    tuesday: { ...DEFAULT_WEEKLY_PLAN.tuesday },
    wednesday: { ...DEFAULT_WEEKLY_PLAN.wednesday },
    thursday: { ...DEFAULT_WEEKLY_PLAN.thursday },
    friday: { ...DEFAULT_WEEKLY_PLAN.friday },
  };

  for (const day of days) {
    if (obj[day] && typeof obj[day] === "object") {
      const dp = obj[day] as Record<string, unknown>;
      result[day] = {
        menuName:
          typeof dp.menuName === "string" && dp.menuName.trim()
            ? dp.menuName
            : DEFAULT_WEEKLY_PLAN[day].menuName,
        category: typeof dp.category === "string" ? dp.category : "อาหารจานเดียว",
        ingredients: Array.isArray(dp.ingredients) ? (dp.ingredients as MenuItem[]) : [],
        isFrozen: typeof dp.isFrozen === "boolean" ? dp.isFrozen : false,
      };
    }
  }
  return result;
}

export function loadLocalState(): AppSyncPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("school_lunch_os_state_v2") ||
      localStorage.getItem("school_lunch_os_state_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppSyncPayload;
    if (parsed.settings) {
      parsed.settings = normalizeSchoolSettings(parsed.settings);
    }
    if (parsed.weeklyPlan) {
      parsed.weeklyPlan = normalizeWeeklyPlan(parsed.weeklyPlan);
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load local storage:", e);
    return null;
  }
}

export function saveLocalState(payload: AppSyncPayload) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadLocalState() || {};
    const merged: AppSyncPayload = {
      ...existing,
      ...payload,
      lastUpdated: payload.lastUpdated || new Date().toISOString(),
    };
    if (merged.settings) {
      merged.settings = normalizeSchoolSettings(merged.settings);
    }
    if (merged.weeklyPlan) {
      merged.weeklyPlan = normalizeWeeklyPlan(merged.weeklyPlan);
    }
    const serialized = JSON.stringify(merged);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem("school_lunch_os_state_v2", serialized);
  } catch (e) {
    console.error("Failed to save local storage:", e);
  }
}

export async function fetchCloudState(): Promise<AppSyncPayload | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("name, settings")
      .eq("id", DEFAULT_SCHOOL_ID)
      .single();

    if (error || !data) {
      console.warn("Supabase fetch warning:", error);
      return null;
    }

    const cloudData = (data.settings as Record<string, unknown>) || {};
    const normalizedSettings = normalizeSchoolSettings(cloudData, data.name);
    const normalizedWeeklyPlan = cloudData.weeklyPlan
      ? normalizeWeeklyPlan(cloudData.weeklyPlan)
      : undefined;

    const result: AppSyncPayload = {
      settings: normalizedSettings,
      weeklyPlan: normalizedWeeklyPlan,
      selectedDayKey:
        typeof cloudData.selectedDayKey === "string"
          ? (cloudData.selectedDayKey as DayKey)
          : undefined,
      presetMenus: Array.isArray(cloudData.presetMenus)
        ? (cloudData.presetMenus as PresetMenu[])
        : undefined,
      selectedMenuId:
        typeof cloudData.selectedMenuId === "string"
          ? cloudData.selectedMenuId
          : undefined,
      activeMenuId:
        typeof cloudData.activeMenuId === "string"
          ? cloudData.activeMenuId
          : undefined,
      dailyIngredients: Array.isArray(cloudData.dailyIngredients)
        ? (cloudData.dailyIngredients as MenuItem[])
        : undefined,
      transactions: Array.isArray(cloudData.transactions)
        ? (cloudData.transactions as FinancialTransactionDisplay[])
        : undefined,
      inspectionItems: Array.isArray(cloudData.inspectionItems)
        ? (cloudData.inspectionItems as InspectionItemState[])
        : undefined,
      isPlanFrozen:
        typeof cloudData.isPlanFrozen === "boolean"
          ? cloudData.isPlanFrozen
          : undefined,
      isReceivingConfirmed:
        typeof cloudData.isReceivingConfirmed === "boolean"
          ? cloudData.isReceivingConfirmed
          : undefined,
      confirmedAtTime:
        typeof cloudData.confirmedAtTime === "string"
          ? cloudData.confirmedAtTime
          : null,
      lastUpdated:
        typeof cloudData.lastUpdated === "string"
          ? cloudData.lastUpdated
          : new Date().toISOString(),
    };

    // Cache to local storage
    saveLocalState(result);
    return result;
  } catch (e) {
    console.error("fetchCloudState exception:", e);
    return null;
  }
}

export async function saveCloudState(
  payload: AppSyncPayload
): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately persist to local cache
  saveLocalState(payload);

  if (!supabase) {
    return { success: true, error: "Cloud not configured, saved locally." };
  }

  try {
    // 2. Fetch existing cloud record to perform atomic merge and avoid clobbering fields
    const { data: existingData } = await supabase
      .from("schools")
      .select("name, settings")
      .eq("id", DEFAULT_SCHOOL_ID)
      .single();

    const currentCloud = (existingData?.settings as Record<string, unknown>) || {};
    const local = loadLocalState() || {};

    // 3. Resolve normalized settings
    const mergedSettings = payload.settings
      ? normalizeSchoolSettings(payload.settings)
      : normalizeSchoolSettings(currentCloud, existingData?.name);

    const mergedWeeklyPlan = payload.weeklyPlan
      ? normalizeWeeklyPlan(payload.weeklyPlan)
      : currentCloud.weeklyPlan
      ? normalizeWeeklyPlan(currentCloud.weeklyPlan)
      : undefined;

    const fullMerged: Record<string, unknown> = {
      ...currentCloud,
      ...local,
      ...payload,
      settings: mergedSettings,
      ...(mergedWeeklyPlan ? { weeklyPlan: mergedWeeklyPlan } : {}),
      lastUpdated: new Date().toISOString(),
    };

    const updateFields: { settings: Record<string, unknown>; name?: string } = {
      settings: fullMerged,
    };

    if (mergedSettings.schoolName) {
      updateFields.name = mergedSettings.schoolName;
    }

    const { error } = await supabase
      .from("schools")
      .update(updateFields)
      .eq("id", DEFAULT_SCHOOL_ID);

    if (error) {
      console.error("Supabase update error:", error);
      return { success: false, error: error.message };
    }

    // Refresh local cache with the complete authoritative state
    saveLocalState(fullMerged as unknown as AppSyncPayload);
    return { success: true };
  } catch (e) {
    console.error("saveCloudState exception:", e);
    return { success: false, error: String(e) };
  }
}

import { supabase, isSupabaseConfigured } from "./supabase/client";

export const DEFAULT_SCHOOL_ID = "11111111-1111-1111-1111-111111111111";
export const STORAGE_KEY = "school_lunch_os_state_v2";

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
  // Support both nested { settings: { ... } } and flat { ... }
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

    const result: AppSyncPayload = {
      settings: normalizedSettings,
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

    const fullMerged: Record<string, unknown> = {
      ...currentCloud,
      ...local,
      ...payload,
      settings: mergedSettings,
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

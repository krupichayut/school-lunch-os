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

export function loadLocalState(): AppSyncPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem("school_lunch_os_state_v2") ||
      localStorage.getItem("school_lunch_os_state_v1") ||
      localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load local storage:", e);
    return null;
  }
}

export function saveLocalState(payload: AppSyncPayload) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadLocalState() || {};
    const merged = { ...existing, ...payload, lastUpdated: new Date().toISOString() };
    const serialized = JSON.stringify(merged);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem("school_lunch_os_state_v2", serialized);
    localStorage.setItem("school_lunch_os_state_v1", serialized);
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

    const cloudSettings = (data.settings as Record<string, unknown>) || {};
    const result: AppSyncPayload = {
      ...(cloudSettings as AppSyncPayload),
    };

    if (data.name && (!result.settings || !result.settings.schoolName)) {
      result.settings = {
        ...(result.settings as SchoolSettings),
        schoolName: data.name,
      };
    } else if (data.name && result.settings) {
      result.settings.schoolName = data.name;
    }

    // LWW (Last-Write-Wins) Conflict Guard
    const local = loadLocalState();
    const localTime = local?.lastUpdated ? new Date(local.lastUpdated).getTime() : 0;
    const cloudTime = result.lastUpdated ? new Date(result.lastUpdated).getTime() : 0;

    // If local edits are newer than cloud, don't overwrite local with stale cloud data!
    if (local && localTime > cloudTime) {
      console.log("Local state is newer than cloud. Synchronizing local state up to Cloud...");
      await saveCloudState(local);
      return local;
    }

    // Cache latest cloud to local storage
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
  // Always persist to local cache immediately
  saveLocalState(payload);

  if (!supabase) {
    return { success: true, error: "Cloud not configured, saved locally." };
  }

  try {
    const local = loadLocalState() || {};
    const fullMerged: AppSyncPayload = {
      ...local,
      ...payload,
      lastUpdated: new Date().toISOString(),
    };

    const updateFields: { settings: Record<string, unknown>; name?: string } = {
      settings: fullMerged as unknown as Record<string, unknown>,
    };

    if (fullMerged.settings?.schoolName) {
      updateFields.name = fullMerged.settings.schoolName;
    }

    const { error } = await supabase
      .from("schools")
      .update(updateFields)
      .eq("id", DEFAULT_SCHOOL_ID);

    if (error) {
      console.error("Supabase update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("saveCloudState exception:", e);
    return { success: false, error: String(e) };
  }
}

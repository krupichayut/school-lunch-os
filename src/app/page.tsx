"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  UtensilsCrossed,
  ClipboardCheck,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Calendar,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  Download,
  Smartphone,
  LayoutDashboard,
  Eye,
  Check,
  CheckCheck,
  Activity,
  Flame,
  ShoppingBag,
  ArrowRight,
  Cpu,
  Trash2,
  Settings,
  Building2,
  UserCheck,
  BarChart3,
  PieChart,
  Clock,
  ArrowUpRight,
  CheckSquare,
  Save,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  AlertCircle,
  X,
  Printer,
  Calculator,
  Pencil,
  Unlock,
  BookOpen,
} from "lucide-react";
import OfficialReportModal, { OfficialFormType } from "@/components/OfficialReportModal";
import MenuCalendarPlanner from "@/components/MenuCalendarPlanner";
import MobileInstallGuideModal from "@/components/MobileInstallGuideModal";
import MasterMenuLibrary from "@/components/MasterMenuLibrary";
import {
  parseIngredientsExcel,
  downloadExcelTemplate,
  toMenuItems,
  ExcelImportResult,
} from "@/lib/excel-importer";
import {
  loadLocalState,
  saveLocalState,
  fetchCloudState,
  saveCloudState,
  DEFAULT_SCHOOL_SETTINGS,
  DEFAULT_DUTY_ROSTER,
  DEFAULT_WEEKLY_PLAN,
  DEFAULT_PRESET_MENUS,
  DEFAULT_WEEKDAY_DATES,
  ensureDatePlans,
  getRoundSchoolDays,
  normalizeWeeklyPlan,
  DAY_DEFINITIONS,
  getTodayDayKey,
  getDefaultActiveDayKey,
  isWeekend,
  formatThaiDateShort,
  formatThaiDateFull,
  toISODate,
  getDayDefaultDate,
  parseDateToTimestamp,
  DEFAULT_ROUND_1_INCOME_TRANSACTION,
  DEFAULT_FINANCIAL_TRANSACTIONS,
  ensureRound1Income,
  SchoolSettings,
  DutyRoster,
  DayKey,
  DayPlan,
  WeeklyPlan,
  MenuItem,
  PresetMenu,
  InspectionItemState,
  FinancialTransactionDisplay,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Preset Master Recipes (Initial Seed from Library)
const PRESET_MENUS: PresetMenu[] = DEFAULT_PRESET_MENUS;

// Helper to safely parse numbers with commas, whitespace, and guard against NaN
function parseCleanNumber(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper to provide friendly, recognizable food icons without heavy images
function getFoodEmoji(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("เส้น") || n.includes("ก๋วยเตี๋ยว") || n.includes("ก๋วยจั๊บ") || n.includes("บะหมี่") || n.includes("ขนมจีน")) return "🍜";
  if (n.includes("หมู") || n.includes("เนื้อ") || n.includes("หมูสับ") || n.includes("ซี่โครง")) return "🥩";
  if (n.includes("ไก่") || n.includes("ปีกไก่") || n.includes("น่องไก่")) return "🍗";
  if (n.includes("ปลา") || n.includes("กุ้ง") || n.includes("หมึก") || n.includes("อาหารทะเล")) return "🐟";
  if (n.includes("ไข่") || n.includes("ไข่ไก่") || n.includes("ไข่เป็ด")) return "🥚";
  if (n.includes("กะหล่ำ") || n.includes("ผัก") || n.includes("คะน้า") || n.includes("ผักบุ้ง") || n.includes("ถั่วงอก") || n.includes("แตงกวา")) return "🥬";
  if (n.includes("แครอท") || n.includes("ฟักทอง") || n.includes("มะละกอ")) return "🥕";
  if (n.includes("ลูกชิ้น") || n.includes("ไส้กรอก")) return "🍡";
  if (n.includes("ผลไม้") || n.includes("ส้ม") || n.includes("กล้วย") || n.includes("แตงโม") || n.includes("ฝรั่ง")) return "🍎";
  if (n.includes("ข้าว") || n.includes("ข้าวสาร")) return "🍚";
  if (n.includes("แก๊ส") || n.includes("ก๊าซ")) return "🔥";
  if (n.includes("น้ำมัน") || n.includes("ซอส") || n.includes("ซีอิ๊ว") || n.includes("น้ำปลา") || n.includes("เครื่องปรุง") || n.includes("พริก")) return "🧂";
  return "🍲";
}

export default function HomePage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "KITCHEN_HUD" | "MENU_PLAN" | "ANALYTICS" | "FINANCE_LEDGER" | "SETTINGS"
  >("KITCHEN_HUD");

  // =========================================================================
  // 1. SETTINGS STATE (ข้อมูลโรงเรียน, ผู้บริหาร, ครูเวรรายวัน)
  // =========================================================================
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [settingsForm, setSettingsForm] = useState<SchoolSettings>(DEFAULT_SCHOOL_SETTINGS);
  const [settingsSaveToast, setSettingsSaveToast] = useState(false);
  const [ingredientSaveToast, setIngredientSaveToast] = useState(false);

  // Auto-persist Settings Form draft to local cache
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveLocalState({ settings: settingsForm });
  }, [settingsForm]);

  // Cloud & Local Persistence Sync
  const [syncStatus, setSyncStatus] = useState<"SYNCED" | "SAVING" | "LOCAL">("SYNCED");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // =========================================================================
  // 2. DAILY MENU & INGREDIENT STATE (ตาราง 5 วันทำการ จันทร์-ศุกร์)
  // =========================================================================
  const todayDayKey = useMemo(() => getTodayDayKey(), []);
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>(getDefaultActiveDayKey());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(DEFAULT_WEEKLY_PLAN);

  const [presetMenus, setPresetMenus] = useState<PresetMenu[]>(PRESET_MENUS);
  const [newMenuCategory, setNewMenuCategory] = useState<string>("อาหารจานเดียว");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("menu-custom");
  const [dailyIngredients, setDailyIngredients] = useState<MenuItem[]>([]);

  // Date-Based Calendar Menu Planning State
  const [datePlans, setDatePlans] = useState<Record<string, DayPlan>>(() =>
    ensureDatePlans({}, DEFAULT_WEEKLY_PLAN)
  );
  const [menuPlanningView, setMenuPlanningView] = useState<"CALENDAR" | "LIBRARY" | "DATE_DETAIL">("CALENDAR");
  const [selectedPlanningDate, setSelectedPlanningDate] = useState<string>("2026-11-06");
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Auto-persist Weekly Plan & Day Selection to Local Storage
  const isWeeklyMount = useRef(true);
  useEffect(() => {
    if (isWeeklyMount.current) {
      isWeeklyMount.current = false;
      return;
    }
    saveLocalState({ weeklyPlan, selectedDayKey, datePlans });
  }, [weeklyPlan, selectedDayKey, datePlans]);

  // Persistent State Hydration: LocalStorage First, then Cloud Sync
  useEffect(() => {
    // 1. Instant local cache load
    const local = loadLocalState();
    if (local) {
      if (local.settings) {
        setSettings(local.settings);
        setSettingsForm(local.settings);
      }
      if (local.weeklyPlan) {
        setWeeklyPlan(local.weeklyPlan);
      }
      if (local.selectedDayKey) {
        setSelectedDayKey(local.selectedDayKey);
      }
      if (local.presetMenus && local.presetMenus.length > 0) {
        setPresetMenus(local.presetMenus);
      } else {
        setPresetMenus(DEFAULT_PRESET_MENUS);
      }
      if (local.datePlans) {
        setDatePlans(ensureDatePlans(local.datePlans, local.weeklyPlan || DEFAULT_WEEKLY_PLAN));
      } else {
        setDatePlans(ensureDatePlans({}, local.weeklyPlan || DEFAULT_WEEKLY_PLAN));
      }
      if (local.selectedMenuId) {
        setSelectedMenuId(local.selectedMenuId);
      }
      if (local.transactions && Array.isArray(local.transactions)) {
        const cleaned = local.transactions.filter(
          (t) => !["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"].includes(t.id)
        );
        const verified = ensureRound1Income(cleaned);
        setTransactions(verified);
      } else {
        setTransactions(DEFAULT_FINANCIAL_TRANSACTIONS);
      }
    }

    // 2. Fetch and merge latest from Supabase
    fetchCloudState()
      .then((cloud) => {
        if (cloud) {
          if (cloud.settings) {
            setSettings(cloud.settings);
            setSettingsForm(cloud.settings);
          }
          if (cloud.weeklyPlan) {
            setWeeklyPlan(cloud.weeklyPlan);
          }
          if (cloud.selectedDayKey) {
            setSelectedDayKey(cloud.selectedDayKey);
          }
          if (cloud.presetMenus && cloud.presetMenus.length > 0) {
            setPresetMenus(cloud.presetMenus);
          } else {
            setPresetMenus(DEFAULT_PRESET_MENUS);
          }
          if (cloud.datePlans) {
            const hydrated = ensureDatePlans(cloud.datePlans, cloud.weeklyPlan || DEFAULT_WEEKLY_PLAN);
            setDatePlans(hydrated);
            saveLocalState({ datePlans: hydrated });
          } else {
            const seeded = ensureDatePlans(local?.datePlans, cloud.weeklyPlan || DEFAULT_WEEKLY_PLAN);
            setDatePlans(seeded);
            saveLocalState({ datePlans: seeded });
          }
          if (cloud.selectedMenuId) {
            setSelectedMenuId(cloud.selectedMenuId);
          }
          if (cloud.transactions && Array.isArray(cloud.transactions)) {
            const cleaned = cloud.transactions.filter(
              (t) => !["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"].includes(t.id)
            );
            const verified = ensureRound1Income(cleaned);
            setTransactions(verified);
            saveLocalState({ transactions: verified });
          } else {
            const verified = [DEFAULT_ROUND_1_INCOME_TRANSACTION];
            setTransactions(verified);
            saveLocalState({ transactions: verified });
            saveCloudState({ transactions: verified }).catch(console.warn);
          }
          setSyncStatus("SYNCED");
          setLastSyncTime(
            new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
          );
        } else {
          setSyncStatus(isSupabaseConfigured ? "SYNCED" : "LOCAL");
        }
      })
      .catch((err) => {
        console.warn("Could not fetch cloud state, using local cache:", err);
        setSyncStatus("LOCAL");
      });
  }, []);

  // Auto-detect Day of Week & Today's Duty Teachers
  const todayDutyInfo = useMemo(() => {
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const isWeekendDay = day === 0 || day === 6;
    let dayName = "วันจันทร์";
    let dayLabel = "วันจันทร์";
    let teachers = settings.dutyRoster.monday;

    switch (day) {
      case 1:
        dayName = "วันจันทร์";
        dayLabel = "วันจันทร์";
        teachers = settings.dutyRoster.monday;
        break;
      case 2:
        dayName = "วันอังคาร";
        dayLabel = "วันอังคาร";
        teachers = settings.dutyRoster.tuesday;
        break;
      case 3:
        dayName = "วันพุธ";
        dayLabel = "วันพุธ";
        teachers = settings.dutyRoster.wednesday;
        break;
      case 4:
        dayName = "วันพฤหัสบดี";
        dayLabel = "วันพฤหัสบดี";
        teachers = settings.dutyRoster.thursday;
        break;
      case 5:
        dayName = "วันศุกร์";
        dayLabel = "วันศุกร์";
        teachers = settings.dutyRoster.friday;
        break;
      case 6:
        dayName = "วันเสาร์";
        dayLabel = "วันเสาร์ (วันหยุดราชการ)";
        teachers = settings.dutyRoster.monday;
        break;
      case 0:
        dayName = "วันอาทิตย์";
        dayLabel = "วันอาทิตย์ (วันหยุดราชการ)";
        teachers = settings.dutyRoster.monday;
        break;
    }
    const safeTeachers = teachers && teachers.length > 0 ? teachers : ["ครูเวรประจำวัน"];
    return {
      day,
      dayName,
      dayLabel,
      isWeekendDay,
      teachers: safeTeachers,
      teachersSummary: safeTeachers.join(", "),
    };
  }, [settings.dutyRoster]);

  // Handlers for Managing Multiple Teachers per Day in Settings
  const handleAddTeacherToDay = (day: keyof DutyRoster) => {
    setSettingsForm((prev) => {
      const currentList = prev.dutyRoster?.[day] || [];
      return {
        ...prev,
        dutyRoster: {
          ...DEFAULT_DUTY_ROSTER,
          ...prev.dutyRoster,
          [day]: [...currentList, ""],
        },
      };
    });
  };

  const handleUpdateTeacherName = (
    day: keyof DutyRoster,
    index: number,
    newName: string
  ) => {
    setSettingsForm((prev) => {
      const currentList = prev.dutyRoster?.[day] || [];
      return {
        ...prev,
        dutyRoster: {
          ...DEFAULT_DUTY_ROSTER,
          ...prev.dutyRoster,
          [day]: currentList.map((name, i) => (i === index ? newName : name)),
        },
      };
    });
  };

  const handleRemoveTeacherFromDay = (day: keyof DutyRoster, index: number) => {
    setSettingsForm((prev) => {
      const currentList = prev.dutyRoster?.[day] || [];
      return {
        ...prev,
        dutyRoster: {
          ...DEFAULT_DUTY_ROSTER,
          ...prev.dutyRoster,
          [day]: currentList.filter((_, i) => i !== index),
        },
      };
    });
  };

  const activeDayDefinition = useMemo(() => {
    return DAY_DEFINITIONS.find((d) => d.key === selectedDayKey) || DAY_DEFINITIONS[3];
  }, [selectedDayKey]);

  const activeDayPlan = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];

  const activeDayCost = useMemo(() => {
    return (activeDayPlan.ingredients || []).reduce(
      (sum, item) => sum + Number((item.qty * item.unitPrice).toFixed(2)),
      0
    );
  }, [activeDayPlan.ingredients]);

  const totalWeeklyPlannedCost = useMemo(() => {
    return Object.values(weeklyPlan).reduce((sum, day) => {
      const dCost = (day.ingredients || []).reduce(
        (s, item) => s + Number((item.qty * item.unitPrice).toFixed(2)),
        0
      );
      return sum + dCost;
    }, 0);
  }, [weeklyPlan]);

  // Dynamic Budget Calculations based on School Settings
  const studentCount = settings.studentCount || 86;
  const subsidyPerHead = settings.subsidyPerHead || 27;
  const daysPerInstallment = settings.daysPerInstallment || 20;
  const currentRoundTitle = settings.currentRoundTitle || "งวดที่ 1 (2 พ.ย. – 27 พ.ย. 2569)";
  const dailyBudgetCeiling = studentCount * subsidyPerHead; // 86 * 27 = 2,322 ฿
  const weeklyBudgetAllocation = dailyBudgetCeiling * 5; // 86 * 27 * 5 = 11,610 ฿
  const installmentBudgetAllocation = dailyBudgetCeiling * daysPerInstallment; // 86 * 27 * 20 = 46,440 ฿

  const activeMenu = useMemo(() => {
    return {
      name: activeDayPlan.menuName || `เมนู${activeDayDefinition.label}`,
    };
  }, [activeDayPlan.menuName, activeDayDefinition.label]);

  const handleUpdateDayMenuName = (newName: string) => {
    setWeeklyPlan((prev) => {
      const cur = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const updatedPlan: WeeklyPlan = {
        ...prev,
        [selectedDayKey]: {
          ...cur,
          menuName: newName,
        },
      };
      saveLocalState({ weeklyPlan: updatedPlan });
      saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
      return updatedPlan;
    });
    setIsPlanFrozen(false);
  };

  const handleUpdateMenuName = (newName: string) => {
    handleUpdateDayMenuName(newName);
  };

  const handleMoveOrSwapMenu = async (targetDay: DayKey, action: "swap" | "move") => {
    if (targetDay === selectedDayKey) return;
    const currentDayPlan = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
    const targetDayPlan = weeklyPlan[targetDay] || DEFAULT_WEEKLY_PLAN[targetDay];

    const targetDef = DAY_DEFINITIONS.find((d) => d.key === targetDay);
    const targetName = targetDef ? targetDef.label : targetDay;

    let updatedPlan: WeeklyPlan;
    if (action === "swap") {
      updatedPlan = {
        ...weeklyPlan,
        [selectedDayKey]: { ...targetDayPlan },
        [targetDay]: { ...currentDayPlan },
      };
    } else {
      updatedPlan = {
        ...weeklyPlan,
        [targetDay]: { ...currentDayPlan },
        [selectedDayKey]: {
          menuName: `เมนู${activeDayDefinition.label}`,
          category: "อาหารจานเดียว",
          ingredients: [],
          isFrozen: false,
        },
      };
    }

    setWeeklyPlan(updatedPlan);
    setSelectedDayKey(targetDay);
    setDailyIngredients(currentDayPlan.ingredients || []);
    setIsPlanFrozen(!!currentDayPlan.isFrozen);

    saveLocalState({ weeklyPlan: updatedPlan, selectedDayKey: targetDay });
    await saveCloudState({ weeklyPlan: updatedPlan, selectedDayKey: targetDay });

    alert(`✓ สลับเมนู "${currentDayPlan.menuName}" ไปยัง${targetName}เรียบร้อยแล้ว`);
  };

  // Date-Based Calendar Handlers
  const handleUpdateDatePlan = async (dateStr: string, plan: DayPlan) => {
    setDatePlans((prev) => {
      const updated = { ...prev, [dateStr]: plan };
      saveLocalState({ datePlans: updated });
      saveCloudState({ datePlans: updated }).catch(console.warn);
      return updated;
    });

    const weekdayKeys: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const matchedDay = weekdayKeys.find(
      (k) => DEFAULT_WEEKDAY_DATES[k] === dateStr || weeklyPlan[k]?.inspectionDate === dateStr
    );

    if (matchedDay) {
      setWeeklyPlan((prev) => {
        const cur = prev[matchedDay] || DEFAULT_WEEKLY_PLAN[matchedDay];
        const updatedWeekly: WeeklyPlan = {
          ...prev,
          [matchedDay]: {
            ...cur,
            menuName: plan.menuName,
            category: plan.category || "อาหารจานเดียว",
            ingredients: (plan.ingredients || []).map((i) => ({ ...i })),
            inspectionDate: dateStr,
          },
        };
        saveLocalState({ weeklyPlan: updatedWeekly });
        saveCloudState({ weeklyPlan: updatedWeekly }).catch(console.warn);
        return updatedWeekly;
      });
    }
  };

  const handleSelectDateForDetail = (dateStr: string, dayKey?: DayKey) => {
    const d = new Date(dateStr);
    const dayNum = d.getDay();
    let targetDayKey: DayKey = "monday";
    if (dayNum === 2) targetDayKey = "tuesday";
    else if (dayNum === 3) targetDayKey = "wednesday";
    else if (dayNum === 4) targetDayKey = "thursday";
    else if (dayNum === 5) targetDayKey = "friday";
    else if (dayKey) targetDayKey = dayKey;

    setSelectedDayKey(targetDayKey);
    setSelectedPlanningDate(dateStr);

    if (datePlans[dateStr]) {
      const plan = datePlans[dateStr];
      setWeeklyPlan((prev) => {
        const cur = prev[targetDayKey] || DEFAULT_WEEKLY_PLAN[targetDayKey];
        const updated: WeeklyPlan = {
          ...prev,
          [targetDayKey]: {
            ...cur,
            menuName: plan.menuName || cur.menuName,
            category: plan.category || cur.category,
            ingredients:
              plan.ingredients && plan.ingredients.length > 0
                ? plan.ingredients.map((i) => ({ ...i }))
                : cur.ingredients,
            inspectionDate: dateStr,
          },
        };
        saveLocalState({ weeklyPlan: updated });
        return updated;
      });
    }

    setMenuPlanningView("DATE_DETAIL");
  };

  const handleAddNewPresetMenu = async (newMenu: PresetMenu) => {
    const updated = [...presetMenus, newMenu];
    setPresetMenus(updated);
    saveLocalState({ presetMenus: updated });
    await saveCloudState({ presetMenus: updated }).catch(console.warn);
  };

  const handleUpdatePresetMenu = async (updatedMenu: PresetMenu) => {
    const updated = presetMenus.map((m) => (m.id === updatedMenu.id ? updatedMenu : m));
    setPresetMenus(updated);
    saveLocalState({ presetMenus: updated });
    await saveCloudState({ presetMenus: updated }).catch(console.warn);
  };

  const handleDeletePresetMenu = async (menuId: string) => {
    const updated = presetMenus.filter((m) => m.id !== menuId);
    setPresetMenus(updated);
    saveLocalState({ presetMenus: updated });
    await saveCloudState({ presetMenus: updated }).catch(console.warn);
  };

  const handleAssignMenuToDate = async (menu: PresetMenu, dateStr: string) => {
    const d = new Date(dateStr);
    const dayNum = d.getDay();
    let targetDayKey: DayKey = "monday";
    if (dayNum === 2) targetDayKey = "tuesday";
    else if (dayNum === 3) targetDayKey = "wednesday";
    else if (dayNum === 4) targetDayKey = "thursday";
    else if (dayNum === 5) targetDayKey = "friday";

    const updatedDatePlans = {
      ...datePlans,
      [dateStr]: {
        menuName: menu.name,
        category: menu.category || "อาหารจานเดียว",
        ingredients: menu.ingredients.map((item, idx) => ({
          ...item,
          id: `ing-${dateStr}-${idx + 1}`,
        })),
        isFrozen: false,
        frozenAtTime: null,
        inspectionItems: [],
        isReceivingConfirmed: false,
        confirmedAtTime: null,
        inspectionDate: dateStr,
      },
    };

    setDatePlans(updatedDatePlans);
    saveLocalState({ datePlans: updatedDatePlans });
    await saveCloudState({ datePlans: updatedDatePlans }).catch(console.warn);

    // If matches currently selected dayKey, update weeklyPlan too
    if (selectedDayKey === targetDayKey) {
      setWeeklyPlan((prev) => {
        const cur = prev[targetDayKey] || DEFAULT_WEEKLY_PLAN[targetDayKey];
        const updated = {
          ...prev,
          [targetDayKey]: {
            ...cur,
            menuName: menu.name,
            category: menu.category || "อาหารจานเดียว",
            ingredients: menu.ingredients.map((i, idx) => ({ ...i, id: `ing-${dateStr}-${idx + 1}` })),
            inspectionDate: dateStr,
          },
        };
        saveLocalState({ weeklyPlan: updated });
        return updated;
      });
    }
  };

  const handleDeleteMenu = async () => {
    if (confirm(`ต้องการล้างเมนูและรายการวัตถุดิบของ${activeDayDefinition.label}ใช่หรือไม่?`)) {
      setWeeklyPlan((prev) => {
        const updatedPlan: WeeklyPlan = {
          ...prev,
          [selectedDayKey]: {
            menuName: `เมนู${activeDayDefinition.label}`,
            category: "อาหารจานเดียว",
            ingredients: [],
            isFrozen: false,
          },
        };
        saveLocalState({ weeklyPlan: updatedPlan, dailyIngredients: [] });
        saveCloudState({ weeklyPlan: updatedPlan, dailyIngredients: [] }).catch(console.warn);
        return updatedPlan;
      });
      setDailyIngredients([]);
      setIsPlanFrozen(false);
      alert(`✓ ล้างรายการเมนูและวัตถุดิบ${activeDayDefinition.label}เรียบร้อยแล้ว`);
    }
  };

  const handleUpdateDayIngredient = (
    id: string,
    field: "name" | "qty" | "unit" | "unitPrice",
    val: string | number
  ) => {
    setWeeklyPlan((prev) => {
      const curDay = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const sourceIngredients = curDay.ingredients || [];
      const updatedIngredients = sourceIngredients.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      );
      const updatedPlan: WeeklyPlan = {
        ...prev,
        [selectedDayKey]: {
          ...curDay,
          ingredients: updatedIngredients,
        },
      };
      saveLocalState({ weeklyPlan: updatedPlan });
      saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
      return updatedPlan;
    });

    if (selectedPlanningDate && datePlans[selectedPlanningDate]) {
      setDatePlans((prev) => {
        const curDatePlan = prev[selectedPlanningDate];
        const source = curDatePlan.ingredients || [];
        const updatedIngredients = source.map((item) =>
          item.id === id ? { ...item, [field]: val } : item
        );
        const updatedDatePlans = {
          ...prev,
          [selectedPlanningDate]: {
            ...curDatePlan,
            ingredients: updatedIngredients,
            isFrozen: false,
          },
        };
        saveLocalState({ datePlans: updatedDatePlans });
        saveCloudState({ datePlans: updatedDatePlans }).catch(console.warn);
        return updatedDatePlans;
      });
    }

    setDailyIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
    setIsPlanFrozen(false);
  };

  const handleUpdateIngredient = handleUpdateDayIngredient;

  const handleDeleteDayIngredient = (id: string) => {
    setWeeklyPlan((prev) => {
      const curDay = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const sourceIngredients = curDay.ingredients || [];
      const updatedIngredients = sourceIngredients.filter((item) => item.id !== id);
      const updatedPlan: WeeklyPlan = {
        ...prev,
        [selectedDayKey]: {
          ...curDay,
          ingredients: updatedIngredients,
        },
      };
      saveLocalState({ weeklyPlan: updatedPlan });
      saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
      return updatedPlan;
    });

    if (selectedPlanningDate && datePlans[selectedPlanningDate]) {
      setDatePlans((prev) => {
        const curDatePlan = prev[selectedPlanningDate];
        const source = curDatePlan.ingredients || [];
        const updatedIngredients = source.filter((item) => item.id !== id);
        const updatedDatePlans = {
          ...prev,
          [selectedPlanningDate]: {
            ...curDatePlan,
            ingredients: updatedIngredients,
            isFrozen: false,
          },
        };
        saveLocalState({ datePlans: updatedDatePlans });
        saveCloudState({ datePlans: updatedDatePlans }).catch(console.warn);
        return updatedDatePlans;
      });
    }

    setDailyIngredients((prev) => prev.filter((item) => item.id !== id));
    setIsPlanFrozen(false);
  };

  const handleDeleteIngredient = handleDeleteDayIngredient;

  const totalDailyCost = activeDayCost;

  // =========================================================================
  // 3. MORNING RECEIVING INSPECTION (DUTY TEACHER HUD) - PER-DAY ISOLATED
  // =========================================================================
  const isReceivingConfirmed = !!activeDayPlan.isReceivingConfirmed;
  const receivingDocNo = `RCV-2569-${activeDayDefinition.shortLabel}`;
  const confirmedAtTime = activeDayPlan.confirmedAtTime || null;
  const isPlanFrozen = !!activeDayPlan.isFrozen;
  const frozenSnapshotTime = activeDayPlan.frozenAtTime || "06:30 น.";
  const setIsPlanFrozen = (val: boolean) => {
    setWeeklyPlan((prev) => {
      const cur = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      return {
        ...prev,
        [selectedDayKey]: {
          ...cur,
          isFrozen: val,
        },
      };
    });
  };

  const inspectionItems: InspectionItemState[] = useMemo(() => {
    if (activeDayPlan.inspectionItems && activeDayPlan.inspectionItems.length > 0) {
      return activeDayPlan.inspectionItems;
    }
    if (activeDayPlan.ingredients && activeDayPlan.ingredients.length > 0) {
      return activeDayPlan.ingredients.map((item) => ({
        id: item.id,
        name: item.name,
        ordered: item.qty,
        received: item.qty,
        accepted: item.qty,
        rejected: 0,
        unit: item.unit,
        unitPrice: item.unitPrice,
        status: "ACCEPTED" as const,
      }));
    }
    return [];
  }, [activeDayPlan.inspectionItems, activeDayPlan.ingredients]);

  const handleUpdateReceivedQty = (id: string, newQty: number) => {
    const cleanQty = Math.round(Math.max(0, newQty) * 10) / 10;
    setWeeklyPlan((prev) => {
      const curDay = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const currentList =
        curDay.inspectionItems && curDay.inspectionItems.length > 0
          ? curDay.inspectionItems
          : inspectionItems;
      const updatedList = currentList.map((item) => {
        if (item.id === id) {
          const shortage = cleanQty < item.ordered;
          return {
            ...item,
            received: cleanQty,
            accepted: cleanQty,
            status: shortage ? ("DISCREPANCY" as const) : ("ACCEPTED" as const),
            note: shortage
              ? `ขาด ${Number((item.ordered - cleanQty).toFixed(2))} ${item.unit}`
              : undefined,
          };
        }
        return item;
      });
      const updatedPlan: WeeklyPlan = {
        ...prev,
        [selectedDayKey]: {
          ...curDay,
          inspectionItems: updatedList,
        },
      };
      saveLocalState({ weeklyPlan: updatedPlan });
      saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
      return updatedPlan;
    });
  };

  const handle1ClickAcceptAll = () => {
    setWeeklyPlan((prev) => {
      const curDay = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const currentList =
        curDay.inspectionItems && curDay.inspectionItems.length > 0
          ? curDay.inspectionItems
          : inspectionItems;
      const updatedList = currentList.map((item) => ({
        ...item,
        received: item.ordered,
        accepted: item.ordered,
        rejected: 0,
        status: "ACCEPTED" as const,
        note: undefined,
      }));
      const updatedPlan: WeeklyPlan = {
        ...prev,
        [selectedDayKey]: {
          ...curDay,
          inspectionItems: updatedList,
        },
      };
      saveLocalState({ weeklyPlan: updatedPlan });
      saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
      return updatedPlan;
    });
  };

  const handlePhotoCapture = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        // Defensive compression to prevent localStorage QuotaExceededError
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL("image/jpeg", 0.7);
            setWeeklyPlan((prev) => {
              const curDay = prev[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
              const currentList =
                curDay.inspectionItems && curDay.inspectionItems.length > 0
                  ? curDay.inspectionItems
                  : inspectionItems;
              const updatedList = currentList.map((item) =>
                item.id === id ? { ...item, photoUrl: compressedUrl } : item
              );
              const updatedPlan: WeeklyPlan = {
                ...prev,
                [selectedDayKey]: {
                  ...curDay,
                  inspectionItems: updatedList,
                },
              };
              saveLocalState({ weeklyPlan: updatedPlan });
              saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
              return updatedPlan;
            });
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmMorningReceiving = async () => {
    const nowTime = new Date().toLocaleTimeString("th-TH");
    setSyncStatus("SAVING");

    // Calculate total received cost ONLY for scheduled items (exclude ad-hoc to prevent double counting)
    const totalReceivedCost = inspectionItems
      .filter((item) => !item.isAdHoc)
      .reduce(
        (sum, item) => sum + item.received * item.unitPrice,
        0
      );

    const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
    const actualInspectionDate =
      curDay.inspectionDate || getDayDefaultDate(selectedDayKey, settings.currentRoundStartDate);
    const formattedInspectionDate = formatThaiDateShort(actualInspectionDate);

    // Auto-create or update ledger expense for this receiving record
    let updatedTx = transactions;
    const existingTxIndex = transactions.findIndex((t) => t.documentNo.includes(receivingDocNo));
    if (existingTxIndex >= 0) {
      const updatedList = [...transactions];
      updatedList[existingTxIndex] = {
        ...updatedList[existingTxIndex],
        date: formattedInspectionDate,
        amount: totalReceivedCost,
        description: `ตัดจ่ายค่าวัตถุดิบอาหารสด (${activeMenu.name}) ประจำ${activeDayDefinition.label} (${formattedInspectionDate})`,
      };
      updatedTx = updatedList.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
      setTransactions(updatedTx);
    } else if (totalReceivedCost > 0) {
      const dailyExpenseTx: FinancialTransactionDisplay = {
        id: `tx-recv-${Date.now()}`,
        documentNo: `FIN-${receivingDocNo}`,
        date: formattedInspectionDate,
        type: "EXPENSE",
        category: "ค่าวัตถุดิบ",
        description: `ตัดจ่ายค่าวัตถุดิบอาหารสด (${activeMenu.name}) ประจำ${activeDayDefinition.label} (${formattedInspectionDate})`,
        amount: totalReceivedCost,
      };
      updatedTx = [...transactions, dailyExpenseTx].sort(
        (a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
      );
      setTransactions(updatedTx);
    }

    const updatedPlan: WeeklyPlan = {
      ...weeklyPlan,
      [selectedDayKey]: {
        ...curDay,
        isReceivingConfirmed: true,
        confirmedAtTime: nowTime,
        inspectionItems,
      },
    };

    setWeeklyPlan(updatedPlan);
    saveLocalState({ weeklyPlan: updatedPlan, transactions: updatedTx });
    await saveCloudState({
      weeklyPlan: updatedPlan,
      transactions: updatedTx,
    });
    setSyncStatus("SYNCED");

    const dutyTeachers =
      settings.dutyRoster?.[selectedDayKey] &&
      settings.dutyRoster[selectedDayKey].length > 0
        ? settings.dutyRoster[selectedDayKey]
        : ["ครูเวรประจำวัน"];
    alert(
      `✓ ตรวจรับและซิงก์สต็อกเรียบร้อย (${nowTime})\nประจำ${activeDayDefinition.label} (เลขที่: ${receivingDocNo})\nคณะผู้ตรวจรับ (${dutyTeachers.length} ท่าน):\n${dutyTeachers.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}\nบันทึกข้อมูลขึ้นระบบ Cloud (Supabase) เรียบร้อยแล้ว`
    );
  };

  const handleConfirmPlan = async () => {
    const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
    const ingredientsToFreeze = curDay.ingredients || [];
    const nowTime = new Date().toLocaleTimeString("th-TH");

    // Preserve existing ad-hoc items if present
    const existingAdHoc = (curDay.inspectionItems || []).filter((item) => item.isAdHoc);

    const newItems: InspectionItemState[] = [
      ...ingredientsToFreeze.map((item) => ({
        id: item.id,
        name: item.name,
        ordered: item.qty,
        received: item.qty,
        accepted: item.qty,
        rejected: 0,
        unit: item.unit,
        unitPrice: item.unitPrice,
        status: "ACCEPTED" as const,
      })),
      ...existingAdHoc,
    ];

    const updatedPlan: WeeklyPlan = {
      ...weeklyPlan,
      [selectedDayKey]: {
        ...curDay,
        ingredients: ingredientsToFreeze,
        isFrozen: true,
        frozenAtTime: nowTime,
        inspectionItems: newItems,
      },
    };

    setWeeklyPlan(updatedPlan);
    setSyncStatus("SAVING");
    saveLocalState({ weeklyPlan: updatedPlan });
    await saveCloudState({
      weeklyPlan: updatedPlan,
      selectedDayKey,
    });
    setSyncStatus("SYNCED");

    const dutyTeachers =
      settings.dutyRoster?.[selectedDayKey] &&
      settings.dutyRoster[selectedDayKey].length > 0
        ? settings.dutyRoster[selectedDayKey]
        : ["ครูเวรประจำวัน"];
    alert(
      `🔒 ตรึงรายการวัตถุดิบ${activeDayDefinition.label} เรียบร้อย (${nowTime})\nเมนู: ${curDay.menuName}\nจำนวน: ${ingredientsToFreeze.length} รายการ (รวม ${activeDayCost.toLocaleString()} ฿)\nบันทึกลง Cloud และส่งรายการตรวจรับไปยังมือถือคณะครูเวร (${dutyTeachers.join(", ")}) แล้ว`
    );
  };

  // =========================================================================
  // 4. FINANCIAL LEDGER STATE
  // =========================================================================
  const [transactions, setTransactions] =
    useState<FinancialTransactionDisplay[]>(DEFAULT_FINANCIAL_TRANSACTIONS);

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("ต้องการลบรายการนี้ออกจากสมุดบัญชีใช่หรือไม่?")) {
      setSyncStatus("SAVING");
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      saveLocalState({ transactions: updated });
      await saveCloudState({ transactions: updated });
      setSyncStatus("SYNCED");
    }
  };

  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  const totalIncomeReceived = useMemo(() => {
    return transactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalActualExpenses = useMemo(() => {
    return transactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netCashRemaining = totalIncomeReceived - totalActualExpenses;

  // Modals Input States
  const [showAddIncomeModal, setShowAddIncomeModal] = useState<boolean>(false);
  const [incomeAmount, setIncomeAmount] = useState<string>("");
  const [incomeName, setIncomeName] = useState<string>("เงินอุดหนุนอาหารกลางวันงวดที่ 1 (2 พ.ย. – 27 พ.ย. 2569)");
  const [incomeDate, setIncomeDate] = useState<string>("2026-11-02");

  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("ค่าก๊าซหุงต้มและเชื้อเพลิง");
  const [expenseDesc, setExpenseDesc] = useState<string>("ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)");
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Edit Transaction States
  const [showEditTxModal, setShowEditTxModal] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<FinancialTransactionDisplay | null>(null);
  const [editTxDate, setEditTxDate] = useState<string>("");
  const [editTxDocNo, setEditTxDocNo] = useState<string>("");
  const [editTxType, setEditTxType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [editTxCategory, setEditTxCategory] = useState<string>("ค่าวัตถุดิบ");
  const [editTxDesc, setEditTxDesc] = useState<string>("");
  const [editTxAmount, setEditTxAmount] = useState<string>("");

  const [showAdHocModal, setShowAdHocModal] = useState<boolean>(false);
  const [adHocName, setAdHocName] = useState<string>("");
  const [adHocQty, setAdHocQty] = useState<string>("1");
  const [adHocUnit, setAdHocUnit] = useState<string>("ขวด");
  const [adHocPrice, setAdHocPrice] = useState<string>("");

  const [showAddIngredientModal, setShowAddIngredientModal] = useState<boolean>(false);
  const [newIngName, setNewIngName] = useState<string>("");
  const [newIngQty, setNewIngQty] = useState<string>("1");
  const [newIngUnit, setNewIngUnit] = useState<string>("กก.");
  const [newIngPrice, setNewIngPrice] = useState<string>("");

  const [showNewMenuModal, setShowNewMenuModal] = useState<boolean>(false);
  const [newMenuName, setNewMenuName] = useState<string>("");

  // Excel Import States
  const [showExcelImportModal, setShowExcelImportModal] = useState<boolean>(false);
  const [excelImportResult, setExcelImportResult] = useState<ExcelImportResult | null>(null);
  const [excelTargetDay, setExcelTargetDay] = useState<DayKey | "PRESET">("friday");
  const [excelImportMode, setExcelImportMode] = useState<"replace" | "append">("replace");
  const [excelMenuName, setExcelMenuName] = useState<string>("");
  const [excelUploadedFileName, setExcelUploadedFileName] = useState<string>("");
  const [isProcessingExcel, setIsProcessingExcel] = useState<boolean>(false);
  const [excelErrorMessage, setExcelErrorMessage] = useState<string | null>(null);
  const [excelSuccessToast, setExcelSuccessToast] = useState<string | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Official Report Modal States
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportFormType, setReportFormType] = useState<OfficialFormType>("RECEIVING");

  const handleOpenReportModal = (formType: OfficialFormType) => {
    setReportFormType(formType);
    setShowReportModal(true);
  };

  // Backdated and Edit Transaction Handlers
  const handleOpenEditTransaction = (tx: FinancialTransactionDisplay) => {
    setEditingTx(tx);
    setEditTxDate(toISODate(tx.date));
    setEditTxDocNo(tx.documentNo);
    setEditTxType(tx.type);
    setEditTxCategory(tx.category);
    setEditTxDesc(tx.description);
    setEditTxAmount(tx.amount.toString());
    setShowEditTxModal(true);
  };

  const handleSaveEditTransaction = async () => {
    if (!editingTx) return;
    const val = parseCleanNumber(editTxAmount);
    if (val <= 0 || !editTxDesc.trim()) return;

    const formattedDate = formatThaiDateShort(editTxDate);
    const updated = transactions
      .map((t) => {
        if (t.id === editingTx.id) {
          return {
            ...t,
            date: formattedDate,
            documentNo: editTxDocNo.trim() || t.documentNo,
            type: editTxType,
            category: editTxCategory.trim() || t.category,
            description: editTxDesc.trim(),
            amount: val,
          };
        }
        return t;
      })
      .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));

    setTransactions(updated);
    setShowEditTxModal(false);
    setEditingTx(null);
    setSyncStatus("SAVING");
    saveLocalState({ transactions: updated });
    await saveCloudState({ transactions: updated });
    setSyncStatus("SYNCED");
  };

  const handleUnlockReceiving = async () => {
    const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
    const updatedPlan: WeeklyPlan = {
      ...weeklyPlan,
      [selectedDayKey]: {
        ...curDay,
        isReceivingConfirmed: false,
        confirmedAtTime: null,
      },
    };
    setWeeklyPlan(updatedPlan);
    saveLocalState({ weeklyPlan: updatedPlan });
    await saveCloudState({ weeklyPlan: updatedPlan });
  };

  const handleUpdateInspectionDate = async (newDate: string) => {
    const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
    const updatedPlan: WeeklyPlan = {
      ...weeklyPlan,
      [selectedDayKey]: {
        ...curDay,
        inspectionDate: newDate,
      },
    };
    setWeeklyPlan(updatedPlan);
    saveLocalState({ weeklyPlan: updatedPlan });
    await saveCloudState({ weeklyPlan: updatedPlan });
  };

  // Modal Handlers
  const handleAddIncome = async () => {
    const val = parseCleanNumber(incomeAmount);
    if (val > 0) {
      const formattedDate = formatThaiDateShort(incomeDate);
      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-2569-${String(transactions.length + 1).padStart(6, "0")}`,
        date: formattedDate,
        type: "INCOME",
        category: "เงินอุดหนุน",
        description: incomeName,
        amount: val,
      };
      const updated = [...transactions, newTx].sort(
        (a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
      );
      setTransactions(updated);
      setShowAddIncomeModal(false);
      setIncomeAmount("");
      setSyncStatus("SAVING");
      saveLocalState({ transactions: updated });
      await saveCloudState({ transactions: updated });
      setSyncStatus("SYNCED");
    }
  };

  const handleAddExpense = async () => {
    const val = parseCleanNumber(expenseAmount);
    if (val > 0) {
      const formattedDate = formatThaiDateShort(expenseDate);
      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-2569-${String(transactions.length + 1).padStart(6, "0")}`,
        date: formattedDate,
        type: "EXPENSE",
        category: expenseCategory,
        description: expenseDesc,
        amount: val,
      };
      const updated = [...transactions, newTx].sort(
        (a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
      );
      setTransactions(updated);
      setShowAddExpenseModal(false);
      setExpenseAmount("");
      setSyncStatus("SAVING");
      saveLocalState({ transactions: updated });
      await saveCloudState({ transactions: updated });
      setSyncStatus("SYNCED");
    }
  };

  const handleAddAdHocItem = async () => {
    const qty = parseCleanNumber(adHocQty) || 1;
    const price = parseCleanNumber(adHocPrice) || 0;

    if (adHocName.trim() && price > 0) {
      const newItem: InspectionItemState = {
        id: `adhoc-${Date.now()}`,
        name: adHocName.trim(),
        ordered: qty,
        received: qty,
        accepted: qty,
        rejected: 0,
        unit: adHocUnit || "รายการ",
        unitPrice: price,
        status: "ACCEPTED",
        isAdHoc: true,
        note: "ซื้อเพิ่มหน้างาน (นอกสูตรประจำวัน)",
      };

      const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const currentList =
        curDay.inspectionItems && curDay.inspectionItems.length > 0
          ? curDay.inspectionItems
          : inspectionItems;
      const updatedInspection = [...currentList, newItem];

      const actualInspectionDate =
        curDay.inspectionDate || getDayDefaultDate(selectedDayKey, settings.currentRoundStartDate);
      const formattedInspectionDate = formatThaiDateShort(actualInspectionDate);

      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-${Date.now().toString().slice(-6)}`,
        date: formattedInspectionDate,
        type: "EXPENSE",
        category: "เครื่องปรุงเพิ่มหน้างาน",
        description: `ซื้อเพิ่มหน้างาน (${activeDayDefinition.label}): ${adHocName} (${qty} ${adHocUnit || "รายการ"})`,
        amount: qty * price,
      };
      const updatedTx = [...transactions, newTx].sort(
        (a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
      );
      setTransactions(updatedTx);

      const updatedPlan: WeeklyPlan = {
        ...weeklyPlan,
        [selectedDayKey]: {
          ...curDay,
          inspectionItems: updatedInspection,
        },
      };

      setWeeklyPlan(updatedPlan);
      setShowAdHocModal(false);
      setAdHocName("");
      setAdHocPrice("");

      setSyncStatus("SAVING");
      saveLocalState({ weeklyPlan: updatedPlan, transactions: updatedTx });
      await saveCloudState({
        weeklyPlan: updatedPlan,
        transactions: updatedTx,
      });
      setSyncStatus("SYNCED");

      alert(`✓ เพิ่มรายการซื้อหน้างาน "${adHocName}" (${(qty * price).toLocaleString()} ฿) เข้าสู่ใบตรวจรับ${activeDayDefinition.label}และสมุดบัญชีแล้ว`);
    }
  };

  const handleAddNewDailyIngredient = async () => {
    const qty = parseCleanNumber(newIngQty) || 1;
    const price = parseCleanNumber(newIngPrice) || 0;
    if (newIngName.trim() && price > 0) {
      const newItem: MenuItem = {
        id: `ing-${Date.now()}`,
        name: newIngName.trim(),
        qty,
        unit: newIngUnit || "กก.",
        unitPrice: price,
      };

      const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const updatedIngredients = [...(curDay.ingredients || []), newItem];
      const updatedPlan: WeeklyPlan = {
        ...weeklyPlan,
        [selectedDayKey]: {
          ...curDay,
          ingredients: updatedIngredients,
          isFrozen: false,
        },
      };

      setWeeklyPlan(updatedPlan);
      setDailyIngredients(updatedIngredients);

      if (selectedPlanningDate && datePlans[selectedPlanningDate]) {
        setDatePlans((prev) => {
          const curDatePlan = prev[selectedPlanningDate];
          const updatedIngs = [...(curDatePlan.ingredients || []), newItem];
          const updatedDatePlans = {
            ...prev,
            [selectedPlanningDate]: {
              ...curDatePlan,
              ingredients: updatedIngs,
              isFrozen: false,
            },
          };
          saveLocalState({ datePlans: updatedDatePlans });
          saveCloudState({ datePlans: updatedDatePlans }).catch(console.warn);
          return updatedDatePlans;
        });
      }

      setShowAddIngredientModal(false);
      setNewIngName("");
      setNewIngPrice("");
      setIsPlanFrozen(false);

      saveLocalState({ weeklyPlan: updatedPlan, dailyIngredients: updatedIngredients });
      saveCloudState({ weeklyPlan: updatedPlan, dailyIngredients: updatedIngredients }).catch(console.warn);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncStatus("SAVING");
    setSettings(settingsForm);
    setSettingsSaveToast(true);

    try {
      await saveCloudState({ settings: settingsForm });
      setSyncStatus("SYNCED");
      setLastSyncTime(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Save settings error:", err);
      setSyncStatus("LOCAL");
    }

    setTimeout(() => setSettingsSaveToast(false), 3500);
  };

  const handleSaveDailyIngredients = async () => {
    setSyncStatus("SAVING");
    try {
      const updatedPresetMenus = presetMenus.map((m) =>
        m.id === selectedMenuId ? { ...m, ingredients: dailyIngredients } : m
      );
      setPresetMenus(updatedPresetMenus);
      await saveCloudState({
        presetMenus: updatedPresetMenus,
        selectedMenuId,
        dailyIngredients,
      });
      setSyncStatus("SYNCED");
      setIngredientSaveToast(true);
      setTimeout(() => setIngredientSaveToast(false), 3000);
    } catch (err) {
      console.error("Save ingredients error:", err);
      setSyncStatus("LOCAL");
    }
  };

  const handleCreateNewMenu = async () => {
    if (newMenuName.trim()) {
      const newMenu: PresetMenu = {
        id: `menu-${Date.now()}`,
        name: newMenuName.trim(),
        category: newMenuCategory,
        ingredients: [
          { id: `ing-${Date.now()}-1`, name: "เนื้อสัตว์หลัก (ไก่/หมู)", qty: 6.0, unit: "กก.", unitPrice: 110 },
          { id: `ing-${Date.now()}-2`, name: "ผักสด / เครื่องแกง", qty: 2.5, unit: "กก.", unitPrice: 40 },
          { id: `ing-${Date.now()}-3`, name: "ข้าวสารหอมมะลิ 100%", qty: 10.0, unit: "กก.", unitPrice: 38 },
          { id: `ing-${Date.now()}-4`, name: "เครื่องปรุงรส", qty: 1.0, unit: "ขวด", unitPrice: 45 },
        ],
      };
      const updatedMenus = [...presetMenus, newMenu];
      const curDay = weeklyPlan[selectedDayKey] || DEFAULT_WEEKLY_PLAN[selectedDayKey];
      const updatedPlan: WeeklyPlan = {
        ...weeklyPlan,
        [selectedDayKey]: {
          ...curDay,
          menuName: newMenu.name,
          category: newMenu.category,
          ingredients: newMenu.ingredients.map((ing) => ({ ...ing })),
          isFrozen: false,
        },
      };

      setPresetMenus(updatedMenus);
      setSelectedMenuId(newMenu.id);
      setWeeklyPlan(updatedPlan);
      setDailyIngredients(newMenu.ingredients.map((ing) => ({ ...ing })));
      setIsPlanFrozen(false);
      setShowNewMenuModal(false);
      setNewMenuName("");
      setSyncStatus("SAVING");
      await saveCloudState({
        presetMenus: updatedMenus,
        selectedMenuId: newMenu.id,
        weeklyPlan: updatedPlan,
        dailyIngredients: newMenu.ingredients,
      });
      setSyncStatus("SYNCED");
      alert(`✓ บันทึกเมนู "${newMenu.name}" เข้าสู่ระบบ Cloud เรียบร้อยแล้ว`);
    }
  };

  // Excel File Upload & Parser Handler
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    setExcelErrorMessage(null);
    setExcelUploadedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseIngredientsExcel(buffer);
      if (result.error) {
        setExcelErrorMessage(result.error);
        setExcelImportResult(null);
      } else {
        setExcelImportResult(result);
        if (result.detectedMenuName) {
          setExcelMenuName(result.detectedMenuName);
        } else if (!excelMenuName) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/^[_\s-]+|[_\s-]+$/g, "");
          setExcelMenuName(cleanName);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExcelErrorMessage(`ไม่สามารถอ่านไฟล์ได้: ${msg}`);
      setExcelImportResult(null);
    } finally {
      setIsProcessingExcel(false);
      e.target.value = "";
    }
  };

  // Confirm Excel Import Handler
  const handleConfirmExcelImport = async () => {
    if (!excelImportResult || excelImportResult.items.length === 0) return;

    const importedMenuItems = toMenuItems(excelImportResult.items);
    if (importedMenuItems.length === 0) {
      setExcelErrorMessage("ไม่มีรายการวัตถุดิบที่สมบูรณ์สำหรับนำเข้า");
      return;
    }

    if (excelTargetDay === "PRESET") {
      const targetMenuTitle =
        excelMenuName.trim() || excelImportResult.detectedMenuName || "สูตรอาหารนำเข้าจาก Excel";
      const newPreset: PresetMenu = {
        id: `preset-${Date.now()}`,
        name: targetMenuTitle,
        category: "อาหารจานเดียว",
        ingredients: importedMenuItems,
      };
      const updatedPresets = [...presetMenus, newPreset];
      setPresetMenus(updatedPresets);
      saveLocalState({ presetMenus: updatedPresets });
      setSyncStatus("SAVING");
      await saveCloudState({ presetMenus: updatedPresets });
      setSyncStatus("SYNCED");
      setExcelSuccessToast(
        `✓ นำเข้าเป็นสูตรต้นแบบ "${targetMenuTitle}" (${importedMenuItems.length} รายการ) เรียบร้อยแล้ว`
      );
    } else {
      const targetDay = excelTargetDay as DayKey;
      const targetPlan = weeklyPlan[targetDay] || DEFAULT_WEEKLY_PLAN[targetDay];
      const targetMenuTitle =
        excelMenuName.trim() ||
        excelImportResult.detectedMenuName ||
        targetPlan.menuName ||
        "เมนูอาหารกลางวัน";

      const finalIngredients =
        excelImportMode === "replace"
          ? importedMenuItems
          : [...(targetPlan.ingredients || []), ...importedMenuItems];

      const updatedPlan: WeeklyPlan = {
        ...weeklyPlan,
        [targetDay]: {
          ...targetPlan,
          menuName: targetMenuTitle,
          ingredients: finalIngredients,
          isFrozen: false,
          frozenAtTime: null,
          inspectionItems: [],
          isReceivingConfirmed: false,
          confirmedAtTime: null,
        },
      };

      setWeeklyPlan(updatedPlan);
      setSelectedDayKey(targetDay);
      setDailyIngredients(finalIngredients);
      saveLocalState({ weeklyPlan: updatedPlan });
      setSyncStatus("SAVING");
      await saveCloudState({ weeklyPlan: updatedPlan });
      setSyncStatus("SYNCED");

      const dayLabel = DAY_DEFINITIONS.find((d) => d.key === targetDay)?.label || targetDay;
      setExcelSuccessToast(
        `✓ นำเข้า ${importedMenuItems.length} รายการวัตถุดิบสู่วัน${dayLabel} เรียบร้อยแล้ว`
      );
    }

    setShowExcelImportModal(false);
    setTimeout(() => setExcelSuccessToast(null), 4000);
  };

  const handleExportCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["เลขที่เอกสาร", "วันที่", "ประเภท", "หมวดหมู่", "รายการ", "จำนวนเงิน (บาท)"];
    const rows = transactions.map((t) => [
      t.documentNo,
      t.date,
      t.type === "INCOME" ? "รายรับ" : "รายจ่าย",
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
    ]);

    const csvContent = BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeSchoolName = settings.schoolName.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
    link.setAttribute(
      "download",
      `รายงานการเงินอาหารกลางวัน_${safeSchoolName}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 5. ANALYTICS ENGINE (WEEKLY & MONTHLY BREAKDOWNS)
  // =========================================================================
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"WEEKLY" | "MONTHLY" | "SEMESTER">("WEEKLY");

  const analyticsSummary = useMemo(() => {
    const rawIngredientsExpense = transactions
      .filter((t) => t.type === "EXPENSE" && t.category === "ค่าวัตถุดิบ")
      .reduce((sum, t) => sum + t.amount, 0);

    const adhocExpense = transactions
      .filter((t) => t.type === "EXPENSE" && t.category.includes("หน้างาน"))
      .reduce((sum, t) => sum + t.amount, 0);

    // Any other expense is operational (gas, cook wages, cleaning materials, kitchen utensils)
    const operationalExpense = transactions
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          t.category !== "ค่าวัตถุดิบ" &&
          !t.category.includes("หน้างาน")
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalActualExp = rawIngredientsExpense + operationalExpense + adhocExpense;
    const hasExpenses = totalActualExp > 0;

    const rawPercent = hasExpenses ? Math.round((rawIngredientsExpense / totalActualExp) * 100) : 0;
    const opPercent = hasExpenses ? Math.round((operationalExpense / totalActualExp) * 100) : 0;
    const adhocPercent = hasExpenses ? Math.max(0, 100 - rawPercent - opPercent) : 0;

    // Daily Average & Estimated Days remaining based on actual government benchmark allocation
    const benchmarkDailySpend = (settings.studentCount || 86) * (settings.subsidyPerHead || 27);
    const avgDailySpend = benchmarkDailySpend;
    const daysPerInstallment = settings.daysPerInstallment || 20;
    const estimatedDaysRemaining =
      avgDailySpend > 0 && netCashRemaining > 0
        ? Math.min(daysPerInstallment, Math.floor(netCashRemaining / avgDailySpend))
        : 0;

    // Dynamic 4-Week Breakdown of Round 1 (Nov 2026: 20 school days)
    const weeksConfig = [
      { weekNum: 1, name: "สัปดาห์ที่ 1", dates: "2 พ.ย. - 6 พ.ย.", startDate: "2026-11-02", endDate: "2026-11-06" },
      { weekNum: 2, name: "สัปดาห์ที่ 2", dates: "9 พ.ย. - 13 พ.ย.", startDate: "2026-11-09", endDate: "2026-11-13" },
      { weekNum: 3, name: "สัปดาห์ที่ 3", dates: "16 พ.ย. - 20 พ.ย.", startDate: "2026-11-16", endDate: "2026-11-20" },
      { weekNum: 4, name: "สัปดาห์ที่ 4", dates: "23 พ.ย. - 27 พ.ย.", startDate: "2026-11-23", endDate: "2026-11-27" },
    ];

    const weeklyAllocation = benchmarkDailySpend * 5;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const weeklyAnalyticsData = weeksConfig.map((w) => {
      // 1. Calculate actual spend from transactions
      const actualSpend = transactions
        .filter((t) => t.type === "EXPENSE" && t.date >= w.startDate && t.date <= w.endDate)
        .reduce((sum, t) => sum + t.amount, 0);

      // 2. Calculate planned spend from datePlans for days in this week
      let plannedSpend = 0;
      let planDaysCount = 0;
      const dCur = new Date(w.startDate);
      const dEnd = new Date(w.endDate);
      while (dCur <= dEnd) {
        if (dCur.getDay() >= 1 && dCur.getDay() <= 5) {
          const iso = `${dCur.getFullYear()}-${String(dCur.getMonth() + 1).padStart(2, "0")}-${String(dCur.getDate()).padStart(2, "0")}`;
          const dp = datePlans[iso];
          if (dp && dp.ingredients && dp.ingredients.length > 0) {
            const dayCost = dp.ingredients.reduce((s, ing) => s + (ing.qty || 0) * (ing.unitPrice || 0), 0);
            plannedSpend += dayCost;
            planDaysCount++;
          }
        }
        dCur.setDate(dCur.getDate() + 1);
      }

      const isPast = todayIso > w.endDate;
      const isCurrent = (todayIso >= w.startDate && todayIso <= w.endDate) || (w.weekNum === 1 && todayIso <= w.endDate);
      const isFuture = todayIso < w.startDate && !isCurrent;

      let status = "รอเริ่มสัปดาห์";
      if (actualSpend > 0 && isCurrent) {
        status = "สัปดาห์ปัจจุบัน (จ่ายจริงแล้ว)";
      } else if (actualSpend > 0) {
        status = "จ่ายจริงแล้ว";
      } else if (isCurrent) {
        status = "สัปดาห์ปัจจุบัน (กำลังดำเนินการ)";
      } else if (plannedSpend > 0) {
        status = "ประมาณการตามแผน";
      } else {
        status = "รอเริ่มสัปดาห์";
      }

      const displaySpend = actualSpend > 0 ? actualSpend : plannedSpend;

      return {
        ...w,
        actualSpend,
        plannedSpend,
        displaySpend,
        max: weeklyAllocation,
        isPast,
        isCurrent,
        isFuture,
        status,
        planDaysCount,
      };
    });

    return {
      rawIngredientsExpense,
      operationalExpense,
      adhocExpense,
      totalActualExp,
      rawPercent,
      opPercent,
      adhocPercent,
      benchmarkDailySpend,
      avgDailySpend,
      estimatedDaysRemaining,
      weeklyAnalyticsData,
      weeklyAllocation,
    };
  }, [transactions, netCashRemaining, datePlans, settings.studentCount, settings.subsidyPerHead, settings.daysPerInstallment]);

  const acceptedCount = inspectionItems.filter((i) => i.status === "ACCEPTED").length;
  const progressPercent =
    inspectionItems.length > 0
      ? Math.round((acceptedCount / inspectionItems.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#18201C] font-sans antialiased selection:bg-[#1F5E4B] selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE COMMAND BAR (NORDIC BOTANICAL ATELIER) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-[#E7E4DC] shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & School Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E7E4DC] p-0.5 flex items-center justify-center shadow-md shadow-[#1F5E4B]/10 overflow-hidden shrink-0">
              <img
                src="/app-logo.png"
                alt="School Lunch OS Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#1F5E4B]">
                  ระบบบริหารจัดการอาหารกลางวัน
                </span>
                <span className="text-[11px] text-[#8C9890] font-mono">v2.2</span>
              </div>
              <h1 className="text-base font-extrabold text-[#18201C] tracking-tight leading-tight mt-0.5 flex items-center gap-2">
                <span>{settings.schoolName}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F2F8F5] text-[#1F5E4B] border border-[#C7E2D6]">
                  {settings.semester} / {settings.academicYear}
                </span>
              </h1>
            </div>
          </div>

          {/* Dynamic Duty Teacher Badge & Live Budget Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white border border-[#E7E4DC] shadow-xs max-w-xs sm:max-w-md">
              {todayDutyInfo.isWeekendDay ? (
                <Calendar className="w-4 h-4 text-[#D97757] shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-[#1F5E4B] shrink-0" />
              )}
              <div className="text-xs leading-tight truncate">
                <span className="text-[11px] text-[#8C9890] block">
                  {todayDutyInfo.isWeekendDay ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#B55232]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
                      วันนี้: {todayDutyInfo.dayLabel}
                    </span>
                  ) : (
                    `ครูเวรประจำ${todayDutyInfo.dayLabel} (${todayDutyInfo.teachers.length} ท่าน)`
                  )}
                </span>
                <span className="font-bold text-[#18201C] truncate block">
                  {todayDutyInfo.isWeekendDay
                    ? `ครูเวรเปิดสัปดาห์วันจันทร์: ${todayDutyInfo.teachersSummary}`
                    : todayDutyInfo.teachersSummary}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-[#E7E4DC] shadow-xs">
              <Users className="w-4 h-4 text-[#1F5E4B]" />
              <div className="text-xs leading-tight">
                <span className="text-[11px] text-[#8C9890] block">นักเรียน / รายหัว</span>
                <span className="font-extrabold text-[#18201C] tabular-nums">
                  {studentCount} คน <span className="text-[10px] font-normal text-[#66746C]">({subsidyPerHead} ฿/วัน)</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-[#E7E4DC] shadow-xs">
              <Wallet className="w-4 h-4 text-[#D97757]" />
              <div className="text-xs leading-tight">
                <span className="text-[11px] text-[#8C9890] block">งบคงเหลือสุทธิ</span>
                <span className="font-extrabold font-mono text-[#1F5E4B] tabular-nums">
                  {netCashRemaining.toLocaleString()} ฿
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#1F5E4B] text-xs font-bold text-[#18201C] transition-smooth shadow-xs"
              title="ดูวิธีติดตั้งแอปไว้บนหน้าจอโฮมมือถือ"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#1F5E4B]" />
              <span className="hidden sm:inline">วิธีติดตั้งบนมือถือ</span>
              <span className="sm:hidden">ติดตั้งแอป</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FLOATING SEGMENTED DOCK (5 MASTER TABS - DESKTOP / TABLET) */}
        {/* ========================================================================= */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 pt-1 overflow-x-auto">
          <nav className="flex items-center gap-1 bg-[#F4F2EB] p-1 rounded-2xl border border-[#E7E4DC] w-max">
            <button
              onClick={() => setActiveTab("KITCHEN_HUD")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "KITCHEN_HUD"
                  ? "bg-white text-[#1F5E4B] shadow-sm"
                  : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60 font-medium"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#D97757]" />
              <span>ตรวจรับของสด</span>
            </button>

            <button
              onClick={() => setActiveTab("MENU_PLAN")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "MENU_PLAN"
                  ? "bg-white text-[#1F5E4B] shadow-sm"
                  : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60 font-medium"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#1F5E4B]" />
              <span>วางแผนเมนูอาหาร</span>
            </button>

            <button
              onClick={() => setActiveTab("ANALYTICS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "ANALYTICS"
                  ? "bg-white text-[#1F5E4B] shadow-sm"
                  : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60 font-medium"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#2E6B8E]" />
              <span>ภาพรวมงบประมาณ</span>
            </button>

            <button
              onClick={() => setActiveTab("FINANCE_LEDGER")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "FINANCE_LEDGER"
                  ? "bg-white text-[#1F5E4B] shadow-sm"
                  : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60 font-medium"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1F5E4B]" />
              <span>สมุดบัญชี</span>
            </button>

            <button
              onClick={() => setActiveTab("SETTINGS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "SETTINGS"
                  ? "bg-white text-[#1F5E4B] shadow-sm"
                  : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60 font-medium"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-[#66746C]" />
              <span>ตั้งค่าโรงเรียน</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-5 pb-24 md:pb-8">
        {/* ========================================================================= */}
        {/* TAB 1: KITCHEN HUD (ครูเวรตรวจรับของสดตอนเช้าหน้าเตา) */}
        {/* ========================================================================= */}
        {activeTab === "KITCHEN_HUD" && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* 5-Day Switcher in Kitchen HUD */}
            <div className="flex items-center gap-1.5 bg-[#F4F2EB] p-1.5 rounded-2xl border border-[#E7E4DC] overflow-x-auto w-full shadow-xs">
              {DAY_DEFINITIONS.map(({ key, shortLabel, dotColor }) => {
                const isSelected = selectedDayKey === key;
                const isToday = todayDayKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(key);
                    }}
                    className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl text-xs font-bold transition-smooth flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      isSelected
                        ? "bg-white text-[#1F5E4B] shadow-xs border border-[#C7E2D6]"
                        : "text-[#66746C] hover:text-[#18201C] hover:bg-white/60"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{shortLabel}</span>
                    {isToday && (
                      <span className="text-[10px] bg-[#1F5E4B] text-white px-1.5 py-0.2 rounded-sm font-bold">
                        วันนี้
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Weekend Context Notice if accessed on Saturday or Sunday */}
            {todayDutyInfo.isWeekendDay && (
              <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#FDF4F0] border border-[#F2D7CA] flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-[#D97757]" />
                  </div>
                  <div>
                    <span className="font-bold text-[#18201C] block">
                      วันนี้คือ{todayDutyInfo.dayName} (วันหยุดราชการ • โรงครัวปิดทำการ)
                    </span>
                    <span className="text-[11px] text-[#8C9890]">
                      กำลังแสดงตารางตรวจรับของ &ldquo;{activeDayDefinition.label}&rdquo; สำหรับตรวจทานย้อนหลังหรือเตรียมการล่วงหน้า
                    </span>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-[#EBF4F0] text-[#1F5E4B] font-bold text-[11px] border border-[#C7E2D6] shrink-0">
                  โหมดดูข้อมูลล่วงหน้า
                </span>
              </div>
            )}

            {/* Terminal Header */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E7E4DC] shadow-card relative overflow-hidden space-y-4">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#ECE8DE]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1F5E4B] uppercase tracking-wider">
                      จุดตรวจรับของสดหน้าเตา • 06:30 น.
                    </span>
                    <span className="inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#4B5850] border border-[#E7E4DC]">
                      {receivingDocNo}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#18201C] mt-1 tracking-tight">
                    ตรวจรับของสดในโรงครัว
                  </h2>
                  <p className="text-xs text-[#66746C] mt-1 flex flex-wrap items-center gap-1.5">
                    <span>เมนู{activeDayDefinition.label}:</span>
                    <strong className="text-[#18201C] bg-[#FAF9F6] px-2.5 py-0.5 rounded-lg border border-[#E7E4DC]">
                      {activeDayPlan.menuName}
                    </strong>
                    <span className="text-[#8C9890]">•</span>
                    <span>นักเรียน {studentCount} คน</span>
                    <span className="text-[#8C9890]">•</span>
                    <span className="font-semibold text-[#1F5E4B]">
                      งบจัดสรร {dailyBudgetCeiling.toLocaleString()} ฿/วัน
                    </span>
                  </p>

                  {/* Backdated Inspection Date Selector */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#4B5850] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#1F5E4B]" />
                      <span>วันที่ตรวจรับจริง:</span>
                    </span>
                    <input
                      type="date"
                      value={toISODate(
                        activeDayPlan.inspectionDate ||
                          getDayDefaultDate(selectedDayKey, settings.currentRoundStartDate)
                      )}
                      onChange={(e) => handleUpdateInspectionDate(e.target.value)}
                      className="text-xs font-mono font-bold text-[#18201C] bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#1F5E4B] focus:border-[#1F5E4B] rounded-xl px-2.5 py-1 outline-none transition-smooth shadow-2xs"
                    />
                    <span className="text-xs font-bold text-[#1F5E4B] bg-[#EBF4F0] px-2 py-0.5 rounded-lg border border-[#C7E2D6]">
                      {formatThaiDateShort(
                        activeDayPlan.inspectionDate ||
                          getDayDefaultDate(selectedDayKey, settings.currentRoundStartDate)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-[#8C9890] block">
                    ครูเวรประจำ{activeDayDefinition.label}
                  </span>
                  <div className="text-xs font-bold text-[#18201C] mt-0.5 space-y-0.5">
                    {((settings.dutyRoster?.[selectedDayKey] && settings.dutyRoster[selectedDayKey].length > 0)
                      ? settings.dutyRoster[selectedDayKey]
                      : ["ครูเวรประจำวัน"]
                    ).map((t, idx) => (
                      <div key={idx} className="flex items-center justify-end gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F5E4B] inline-block" />
                        <span>{t}</span>
                      </div>
                    ))}
                    {settings.cookName?.trim() && (
                      <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#66746C] pt-0.5">
                        <span className="text-[#8C9890]">แม่ครัว:</span>
                        <span className="font-semibold text-[#18201C]">{settings.cookName.trim()}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 border ${
                      isReceivingConfirmed
                        ? "bg-[#EBF4F0] text-[#1F5E4B] border-[#C7E2D6]"
                        : "bg-[#FDF4F0] text-[#B55232] border-[#F2D7CA]"
                    }`}
                  >
                    {isReceivingConfirmed ? "บันทึกสต็อกแล้ว ✓" : "กำลังตรวจเช็ค"}
                  </span>
                </div>
              </div>

              {/* Progress & Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                    <span className="text-[#66746C]">ความคืบหน้าการตรวจรับ</span>
                    <span className="font-mono tabular-nums text-[#18201C] font-bold">
                      {acceptedCount} / {inspectionItems.length} รายการ ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E4DC]">
                    <div
                      className="h-full bg-gradient-to-r from-[#1F5E4B] to-[#31866B] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenReportModal("RECEIVING")}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#C7E2D6] text-[#1F5E4B] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-xs"
                    title="พิมพ์ใบตรวจรับพัสดุราชการ (แบบ ตร.01)"
                  >
                    <Printer className="w-4 h-4 text-[#1F5E4B]" />
                    <span className="hidden sm:inline">พิมพ์ใบตรวจรับ (แบบ ตร.01)</span>
                    <span className="sm:hidden">พิมพ์ ตร.01</span>
                  </button>

                  <button
                    onClick={() => setShowAdHocModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#FDF4F0] hover:bg-[#FBEDE6] border border-[#F2D7CA] text-[#B55232] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ ซื้อของเพิ่ม</span>
                  </button>

                  <button
                    onClick={handle1ClickAcceptAll}
                    className="px-3.5 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft active:scale-95"
                  >
                    <CheckCheck className="w-4 h-4 text-[#EAD598]" />
                    <span>รับครบ 100% (ปุ่มด่วน)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* High-Legibility Food Cards */}
            <div className="space-y-3">
              {/* Mobile Quick Accept Banner */}
              {inspectionItems.length > 0 && acceptedCount < inspectionItems.length && (
                <div className="bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1F5E4B] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#EAD598]" />
                      <span>ของสดมาส่งตรงตามสั่งครบทุกอย่าง?</span>
                    </div>
                    <div className="text-[11px] text-[#66746C] mt-0.5">
                      ตรวจรับเสร็จใน 1 คลิก (เหลืออีก {inspectionItems.length - acceptedCount} จาก {inspectionItems.length} รายการ)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handle1ClickAcceptAll}
                    className="px-3.5 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft shrink-0 active:scale-95"
                  >
                    <CheckCheck className="w-4 h-4 text-[#EAD598]" />
                    <span>รับครบทั้งหมด</span>
                  </button>
                </div>
              )}

              {inspectionItems.length > 0 && acceptedCount === inspectionItems.length && (
                <div className="bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl p-3 px-4 flex items-center justify-between gap-2 shadow-xs text-xs text-[#1F5E4B] font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F5E4B]" />
                    <span>ตรวจรับของสดครบทุกรายการแล้ว ({acceptedCount}/{inspectionItems.length})</span>
                  </div>
                  {!isReceivingConfirmed && (
                    <span className="text-[11px] font-medium text-[#66746C] hidden sm:inline">กดปุ่มลงนามด้านล่างเพื่อบันทึกสต็อก</span>
                  )}
                </div>
              )}

              {inspectionItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-[#E7E4DC] text-center space-y-3 shadow-card">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F8F5] border border-[#C7E2D6] flex items-center justify-center mx-auto text-[#1F5E4B]">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#18201C] text-sm">ยังไม่มีรายการตรวจรับวัตถุดิบสำหรับ{activeDayDefinition.label}</h3>
                    <p className="text-xs text-[#66746C] mt-1 max-w-md mx-auto leading-relaxed">
                      คณะครูเวรสามารถตรวจรับของสดได้เมื่อมีการกำหนดเมนูที่แท็บ <strong>&quot;วางแผนเมนูอาหาร&quot;</strong> แล้วกดปุ่ม <strong>&quot;ตรึง Snapshot และส่งให้ครูเวร&quot;</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("MENU_PLAN")}
                    className="px-4 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-smooth shadow-soft"
                  >
                    <span>ไปกำหนดเมนูและวัตถุดิบ ({activeDayDefinition.shortLabel})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                inspectionItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-xs ${
                    item.isAdHoc
                      ? "border-[#F2D7CA] bg-[#FDF4F0]/40"
                      : item.status === "ACCEPTED"
                      ? "border-[#D4E8DE] bg-[#F4F9F6]/50 shadow-[0_2px_12px_rgba(31,94,75,0.04)]"
                      : item.status === "DISCREPANCY"
                      ? "border-[#F2D7CA] bg-[#FDF4F0]/50"
                      : "border-[#E7E4DC] hover:border-[#D4E8DE] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between sm:justify-start gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-9 h-9 rounded-2xl bg-[#F4F2EB] flex items-center justify-center text-lg shrink-0 select-none">
                            {getFoodEmoji(item.name)}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-[#18201C] text-base sm:text-lg tracking-tight leading-normal truncate">
                              {item.name}
                            </h3>
                          </div>
                          {item.isAdHoc && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D97757] text-white shadow-2xs shrink-0">
                              ซื้อเพิ่ม
                            </span>
                          )}
                        </div>
                        {item.status === "ACCEPTED" && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF4F0] text-[#1F5E4B] border border-[#C7E2D6] shrink-0 flex items-center gap-1 shadow-2xs">
                            <Check className="w-3.5 h-3.5 text-[#1F5E4B]" />
                            <span>ครบ ✓</span>
                          </span>
                        )}
                        {item.status === "DISCREPANCY" && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FDF4F0] text-[#B55232] border border-[#F2D7CA] shrink-0">
                            มีส่วนต่าง
                          </span>
                        )}
                      </div>

                      {/* Mobile View: Clean single line of order vs received (Cuts visual noise) */}
                      <div className="sm:hidden flex items-center justify-between text-xs text-[#66746C] mt-2 font-medium">
                        <span>สั่ง: <strong className="text-[#18201C] font-semibold">{item.ordered} {item.unit}</strong></span>
                        <span>ส่งจริง: <strong className="text-[#1F5E4B] font-mono font-bold">{item.received} {item.unit}</strong></span>
                      </div>

                      {/* Desktop Quantitative Data Chips */}
                      <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-2.5 mt-2.5">
                        <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3 py-1.5 flex items-baseline gap-1.5 shadow-2xs">
                          <span className="text-[11px] text-[#8C9890] font-medium">
                            {item.isAdHoc ? "จำนวนที่ซื้อ:" : "จำนวนที่สั่ง:"}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-[#18201C] tabular-nums">
                            {item.ordered} <span className="text-xs font-normal text-[#66746C]">{item.unit}</span>
                          </span>
                        </div>

                        <div className="bg-[#F2F8F5] border border-[#C7E2D6] rounded-xl px-3 py-1.5 flex items-baseline gap-1.5 shadow-2xs">
                          <span className="text-[11px] text-[#1F5E4B] font-semibold">
                            ส่งจริงเช้านี้:
                          </span>
                          <span className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-[#1F5E4B]">
                            {item.received} <span className="text-xs font-normal text-[#1F5E4B]/80">{item.unit}</span>
                          </span>
                        </div>

                        <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3 py-1.5 flex items-baseline gap-1.5 shadow-2xs">
                          <span className="text-[11px] text-[#8C9890] font-medium">
                            ราคาคำนวณ:
                          </span>
                          <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#18201C]">
                            {(item.received * item.unitPrice).toLocaleString()} ฿
                          </span>
                        </div>
                      </div>

                      {item.note && (
                        <div className="mt-2.5 text-xs font-semibold text-[#B55232] bg-[#FDF4F0] p-2.5 rounded-xl border border-[#F2D7CA] flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97757] shrink-0" />
                          <span>{item.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Step Adjust Controls & Camera (Thumb-Friendly Touch Targets) */}
                    <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-[#F4F2EB] shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#FAF9F6] rounded-2xl p-1 border border-[#E7E4DC] shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateReceivedQty(item.id, Math.max(0, item.received - 0.5))}
                            className="w-10 h-10 rounded-xl bg-white border border-[#E7E4DC] shadow-xs font-bold text-[#18201C] hover:bg-[#F2F0E8] transition-smooth flex items-center justify-center active:scale-95 text-base"
                            title="ลดลง 0.5"
                            aria-label={`ลดจำนวน ${item.name}`}
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-sm font-extrabold font-mono tabular-nums text-[#18201C]">
                            {item.received}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateReceivedQty(item.id, item.received + 0.5)}
                            className="w-10 h-10 rounded-xl bg-white border border-[#E7E4DC] shadow-xs font-bold text-[#18201C] hover:bg-[#F2F0E8] transition-smooth flex items-center justify-center active:scale-95 text-base"
                            title="เพิ่มขึ้น 0.5"
                            aria-label={`เพิ่มจำนวน ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        {/* Photo Capture & Thumbnail Preview */}
                        <div className="flex items-center gap-1.5">
                          {item.photoUrl && (
                            <div className="relative group">
                              <img
                                src={item.photoUrl}
                                alt="รูปตาชั่ง"
                                className="w-10 h-10 rounded-xl object-cover border border-[#C7E2D6] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  const w = window.open("");
                                  if (w) {
                                    w.document.write(`<title>ภาพถ่ายตรวจรับ - ${item.name}</title><body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${item.photoUrl}" style="max-width:95vw; max-height:95vh; object-fit:contain; border-radius:8px;" /></body>`);
                                  }
                                }}
                                title="คลิกดูภาพเต็ม"
                              />
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#1F5E4B] ring-2 ring-white" />
                            </div>
                          )}
                          <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border border-[#E7E4DC] bg-white hover:bg-[#FAF9F6] transition-smooth text-[#18201C] shadow-xs active:scale-95">
                            <Camera className="w-4 h-4 text-[#66746C]" />
                            <span className="hidden sm:inline">{item.photoUrl ? "เปลี่ยนรูป" : "ถ่ายตาชั่ง"}</span>
                            <span className="sm:hidden">{item.photoUrl ? "เปลี่ยน" : "ถ่าย"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoCapture(item.id, e)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )))}
            </div>

            {/* Confirm Receiving Floating Bar */}
            <div className="sticky bottom-20 md:bottom-4 pt-2 flex items-center gap-2 z-30">
              <button
                onClick={handleConfirmMorningReceiving}
                disabled={isReceivingConfirmed}
                className={`flex-1 py-4 rounded-2xl text-sm font-extrabold tracking-tight shadow-floating transition-smooth flex items-center justify-center gap-2 active:scale-98 ${
                  isReceivingConfirmed
                    ? "bg-[#1F5E4B] text-white cursor-default"
                    : "bg-[#1F5E4B] hover:bg-[#143B30] text-white"
                }`}
              >
                {isReceivingConfirmed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#C7E2D6]" />
                    <span>บันทึกตรวจรับเรียบร้อยแล้ว ({confirmedAtTime})</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-5 h-5 text-[#EAD598]" />
                    <span>ลงนามยืนยันการตรวจรับ (คณะครูเวร {todayDutyInfo.teachers.length} ท่าน)</span>
                  </>
                )}
              </button>

              {isReceivingConfirmed && (
                <>
                  <button
                    type="button"
                    onClick={handleUnlockReceiving}
                    className="py-4 px-4 rounded-2xl bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#D97757] text-[#B55232] hover:bg-[#FDF4F0] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-floating shrink-0"
                    title="ปลดล็อกเพื่อแก้ไขรายการตรวจรับ ปริมาณ หรือรูปถ่าย"
                  >
                    <Unlock className="w-4 h-4 text-[#D97757]" />
                    <span>ปลดล็อกเพื่อแก้ไข</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReportModal("RECEIVING")}
                    className="py-4 px-5 rounded-2xl bg-white border border-[#C7E2D6] text-[#1F5E4B] hover:bg-[#F2F8F5] text-xs font-bold transition-smooth flex items-center gap-2 shadow-floating shrink-0"
                    title="พิมพ์ใบตรวจรับพัสดุราชการ (แบบ ตร.01)"
                  >
                    <Printer className="w-4 h-4 text-[#1F5E4B]" />
                    <span>พิมพ์ ตร.01</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MENU PLAN & INGREDIENT PRICING */}
        {/* ========================================================================= */}
        {activeTab === "MENU_PLAN" && (
          <div className="space-y-5">
            {/* Success Toast */}
            {ingredientSaveToast && (
              <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>บันทึกรายการวัตถุดิบและราคาเรียบร้อยแล้ว! ข้อมูลถูกซิงก์ขึ้นระบบ Cloud ทันที</span>
              </div>
            )}
            {excelSuccessToast && (
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>{excelSuccessToast}</span>
              </div>
            )}

            {/* View Mode Switcher: Calendar View vs Master Menu Library */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-[#E7E4DC] shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[#18201C] flex items-center gap-1.5 pl-1">
                  <SlidersHorizontal className="w-4 h-4 text-[#1F5E4B]" />
                  <span>รูปแบบการวางแผน:</span>
                </span>
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-2xl border border-[#E7E4DC]">
                  <button
                    type="button"
                    onClick={() => setMenuPlanningView("CALENDAR")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      menuPlanningView === "CALENDAR"
                        ? "bg-[#1F5E4B] text-white shadow-xs"
                        : "text-[#66746C] hover:text-[#18201C]"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>📅 มุมมองปฏิทินทั้งงวด (20 วัน)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuPlanningView("LIBRARY")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      menuPlanningView === "LIBRARY"
                        ? "bg-[#1F5E4B] text-white shadow-xs"
                        : "text-[#66746C] hover:text-[#18201C]"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>🍲 คลังรายการเมนูอาหาร (Master Library)</span>
                  </button>
                </div>
              </div>

              {menuPlanningView === "DATE_DETAIL" ? (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMenuPlanningView("CALENDAR")}
                    className="px-3.5 py-1.5 rounded-xl border border-[#C7E2D6] bg-[#F2F8F5] text-[#1F5E4B] text-xs font-bold hover:bg-[#EBF4F0] transition-smooth flex items-center gap-1.5 shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>กลับไปหน้าปฏิทิน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuPlanningView("LIBRARY")}
                    className="px-3.5 py-1.5 rounded-xl border border-[#E7E4DC] bg-white text-[#18201C] text-xs font-bold hover:bg-[#FAF9F6] transition-smooth flex items-center gap-1.5 shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#1F5E4B]" />
                    <span>ไปคลังเมนูอาหาร</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[#66746C]">
                  {menuPlanningView === "CALENDAR" ? (
                    <span>กดเลือกวันที่ในปฏิทิน เพื่อดึงเมนูอาหารและปรับวัตถุดิบ</span>
                  ) : (
                    <span>จัดการสูตรอาหารทั้งหมด และกด &ldquo;ดึงลงปฏิทิน&rdquo; ได้ทันที</span>
                  )}
                </div>
              )}
            </div>

            {/* View 1: Render Calendar View when selected */}
            {menuPlanningView === "CALENDAR" && (
              <MenuCalendarPlanner
                datePlans={datePlans}
                onUpdateDatePlan={handleUpdateDatePlan}
                presetMenus={presetMenus}
                settings={settings}
                onSelectDateForDetail={handleSelectDateForDetail}
                onSaveNewPreset={handleAddNewPresetMenu}
              />
            )}

            {/* View 2: Render Master Menu Library when selected */}
            {menuPlanningView === "LIBRARY" && (
              <MasterMenuLibrary
                presetMenus={presetMenus}
                datePlans={datePlans}
                settings={settings}
                onAddNewPresetMenu={handleAddNewPresetMenu}
                onUpdatePresetMenu={handleUpdatePresetMenu}
                onDeletePresetMenu={handleDeletePresetMenu}
                onAssignMenuToDate={handleAssignMenuToDate}
                onOpenExcelImport={() => {
                  setExcelImportResult(null);
                  setExcelErrorMessage(null);
                  setExcelUploadedFileName("");
                  setExcelTargetDay(selectedDayKey);
                  setShowExcelImportModal(true);
                }}
                onGoToCalendar={() => setMenuPlanningView("CALENDAR")}
                onSelectDateForDetail={(dateStr) => handleSelectDateForDetail(dateStr)}
              />
            )}

            {/* View 3: Render Date-Specific Ingredient Detail View when opened from Calendar or Library */}
            {menuPlanningView === "DATE_DETAIL" && (
              <div className="space-y-4">
                {/* Date-Specific Detail View Header Banner */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E4DC] shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DE] pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF4F0] text-[#1F5E4B] border border-[#C7E2D6]">
                          📅 {selectedPlanningDate ? formatThaiDateFull(selectedPlanningDate) : activeDayDefinition.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            activeDayPlan.isFrozen
                              ? "bg-[#EBF4F0] text-[#1F5E4B] border-[#C7E2D6]"
                              : "bg-[#FDF4F0] text-[#B55232] border-[#F2D7CA]"
                          }`}
                        >
                          {activeDayPlan.isFrozen ? "ตรึง Snapshot แล้ว ✓" : "กำลังร่างรายการ"}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#18201C] tracking-tight">
                        ปรับแต่งวัตถุดิบและรายการอาหารสำหรับวันนี้
                      </h3>
                      <p className="text-xs text-[#66746C]">
                        คุณสามารถปรับเปลี่ยนวัตถุดิบตามที่ตลาดเช้ามีจำหน่ายจริง ข้อมูลจะแยกอิสระเฉพาะวันนี้ ไม่กระทบวันอื่นในปฏิทิน
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setMenuPlanningView("CALENDAR")}
                        className="px-3.5 py-2 rounded-xl border border-[#C7E2D6] bg-[#F2F8F5] text-[#1F5E4B] text-xs font-bold hover:bg-[#EBF4F0] transition-smooth flex items-center gap-1.5 shadow-2xs"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>📅 กลับไปมุมมองปฏิทิน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMenuPlanningView("LIBRARY")}
                        className="px-3.5 py-2 rounded-xl border border-[#E7E4DC] bg-white text-[#18201C] text-xs font-bold hover:bg-[#FAF9F6] transition-smooth flex items-center gap-1.5 shadow-xs"
                      >
                        <BookOpen className="w-4 h-4 text-[#1F5E4B]" />
                        <span>🍲 ไปคลังเมนูอาหาร</span>
                      </button>
                    </div>
                  </div>

                  {/* Daily Budget Summary Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3.5 text-right">
                      <span className="text-[10px] text-[#8C9890] block font-semibold">
                        งบจัดสรรประจำวัน ({studentCount} คน × {subsidyPerHead}฿)
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#1F5E4B] font-mono tabular-nums">
                        {(studentCount * subsidyPerHead).toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                      </span>
                    </div>

                    <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3.5 text-right">
                      <span className="text-[10px] text-[#8C9890] block font-semibold">
                        ประมาณการวัตถุดิบวันนี้
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#2E6B8E] font-mono tabular-nums">
                        {activeDayCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                      </span>
                    </div>

                    <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3.5 text-right">
                      <span className="text-[10px] text-[#8C9890] block font-semibold">
                        คงเหลือ (แม่ครัว/แก๊ส/สำรอง)
                      </span>
                      <span className={`text-sm sm:text-base font-extrabold font-mono tabular-nums ${studentCount * subsidyPerHead - activeDayCost >= 0 ? "text-[#1F5E4B]" : "text-[#B55232]"}`}>
                        {(studentCount * subsidyPerHead - activeDayCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                      </span>
                    </div>
                  </div>
                </div>

            {/* Unified Single Canvas Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E7E4DC] shadow-card space-y-5">
              {/* Menu Title Hero & Quick Actions */}
              <div className="space-y-4 pb-4 border-b border-[#ECE8DE]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EBF4F0] text-[#1F5E4B] border border-[#C7E2D6]">
                      {activeDayDefinition.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        activeDayPlan.isFrozen
                          ? "bg-[#EBF4F0] text-[#1F5E4B] border-[#C7E2D6]"
                          : "bg-[#FDF4F0] text-[#B55232] border-[#F2D7CA]"
                      }`}
                    >
                      {activeDayPlan.isFrozen ? "ตรึง Snapshot แล้ว ✓" : "กำลังร่างรายการ"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs text-[#66746C]">ยอดรวมวัตถุดิบ{activeDayDefinition.label}:</span>
                    <span className="text-xl font-black tabular-nums text-[#1F5E4B]">
                      {activeDayCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-xs font-normal text-[#66746C]">฿</span>
                    </span>
                  </div>
                </div>

                {/* Menu Name Input */}
                <div>
                  <label className="text-xs font-bold text-[#18201C] block mb-1.5">
                    ชื่อเมนูอาหารกลางวัน{activeDayDefinition.label}:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={activeDayPlan.menuName}
                      onChange={(e) => handleUpdateMenuName(e.target.value)}
                      placeholder={`พิมพ์ชื่อเมนูอาหารกลางวัน เช่น แกงกะทิไก่ฟักทอง, ข้าวผัดไข่`}
                      className="flex-1 min-w-[260px] bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#9ECBB9] focus:border-[#1F5E4B] focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-bold text-[#18201C] outline-none shadow-xs"
                    />

                    {/* Move/Swap Menu Dropdown */}
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const target = e.target.value as DayKey;
                        if (!target) return;
                        handleMoveOrSwapMenu(target, "swap");
                        e.target.value = "";
                      }}
                      className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3 py-2.5 text-xs font-bold text-[#4B5850] hover:bg-[#F2F0E8] transition-colors cursor-pointer shadow-xs"
                      title="สลับเมนูนี้กับวันอื่น"
                    >
                      <option value="" disabled>
                        ⇄ สลับเมนูกับวัน...
                      </option>
                      {DAY_DEFINITIONS.filter((d) => d.key !== selectedDayKey).map((d) => (
                        <option key={d.key} value={d.key}>
                          สลับกับ {d.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleDeleteMenu}
                      className="p-2.5 rounded-xl border border-[#F2D7CA] bg-[#FDF4F0] text-[#B55232] hover:bg-[#FBEDE6] transition-colors shadow-xs"
                      title={`ล้างเมนูและรายการวัตถุดิบ${activeDayDefinition.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Preset Recipe Pull */}
                {presetMenus.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs text-[#66746C] whitespace-nowrap">
                      หรือดึงสูตรเมนูต้นแบบ:
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const selected = presetMenus.find((m) => m.id === val);
                        if (selected) {
                          const clonedIngs = selected.ingredients.map((ing) => ({
                            ...ing,
                            id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          }));
                          setWeeklyPlan((prev) => {
                            const updatedPlan: WeeklyPlan = {
                              ...prev,
                              [selectedDayKey]: {
                                menuName: selected.name,
                                category: selected.category || "อาหารจานเดียว",
                                ingredients: clonedIngs,
                                isFrozen: false,
                              },
                            };
                            saveLocalState({ weeklyPlan: updatedPlan });
                            saveCloudState({ weeklyPlan: updatedPlan }).catch(console.warn);
                            return updatedPlan;
                          });
                          setIsPlanFrozen(false);
                        }
                      }}
                      className="bg-white border border-[#E7E4DC] rounded-xl px-3 py-1.5 text-xs font-medium text-[#18201C] focus:outline-none focus:border-[#1F5E4B] max-w-sm"
                    >
                      <option value="">-- เลือกดึงสูตรอาหารต้นแบบมาใส่ใน{activeDayDefinition.label} --</option>
                      {presetMenus.map((m) => {
                        const assignedDay = DAY_DEFINITIONS.find(
                          (d) => weeklyPlan[d.key]?.menuName === m.name && d.key !== selectedDayKey
                        );
                        return (
                          <option key={m.id} value={m.id}>
                            {m.name} {assignedDay ? `(ใช้อยู่ใน${assignedDay.label})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* Direct Daily Ingredients Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#18201C]">
                  <thead className="bg-[#FAF9F6] text-[#66746C] font-bold border-y border-[#E7E4DC] text-xs">
                    <tr>
                      <th className="py-3 px-4">รายการวัตถุดิบ</th>
                      <th className="py-3 px-4 text-center">จำนวนที่สั่ง</th>
                      <th className="py-3 px-4 text-center">หน่วยนับ</th>
                      <th className="py-3 px-4 text-center">ราคา / หน่วย (฿)</th>
                      <th className="py-3 px-4 text-right">รวมเป็นเงิน (฿)</th>
                      <th className="py-3 px-3 text-center w-12">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE4] font-medium">
                    {(activeDayPlan.ingredients || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#8C9890]">
                          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#1F5E4B]" />
                          <span className="block text-sm font-bold text-[#18201C]">ยังไม่มีรายการวัตถุดิบในเมนูนี้</span>
                          <span className="block text-xs text-[#66746C] mt-1">
                            คลิกปุ่ม <strong>&quot;+ เพิ่มวัตถุดิบในเมนูนี้&quot;</strong> หรือ <strong>&quot;📥 นำเข้าจาก Excel&quot;</strong> ด้านล่างเพื่อเริ่มระบุวัตถุดิบและราคา
                          </span>
                        </td>
                      </tr>
                    ) : (
                      (activeDayPlan.ingredients || []).map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF9F6]/80 transition-smooth">
                        <td className="py-3 px-4 font-bold text-[#18201C] text-sm">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "name", e.target.value)
                            }
                            className="w-full bg-transparent border-b border-transparent hover:border-[#C7E2D6] focus:border-[#1F5E4B] focus:outline-none py-1"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "qty", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1.5 text-center font-bold font-mono tabular-nums text-[#18201C] bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1F5E4B] shadow-2xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "unit", e.target.value)
                            }
                            className="w-16 px-1.5 py-1.5 text-center text-[#4B5850] bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1F5E4B] shadow-2xs"
                            title="พิมพ์เปลี่ยนหน่วยได้โดยตรง"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1.5 text-center font-mono tabular-nums text-[#18201C] bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1F5E4B] shadow-2xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono tabular-nums text-[#18201C] text-sm">
                          {(item.qty * item.unitPrice).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteIngredient(item.id)}
                            className="p-1.5 rounded-lg text-[#8C9890] hover:text-[#B55232] hover:bg-[#FDF4F0] transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#ECE8DE] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddIngredientModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-[#E7E4DC] bg-white text-[#18201C] text-xs font-bold hover:bg-[#FAF9F6] transition-smooth flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-[#1F5E4B]" />
                    <span>+ เพิ่มวัตถุดิบ</span>
                  </button>

                  <button
                    onClick={() => setShowNewMenuModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-[#E7E4DC] bg-white text-[#18201C] text-xs font-bold hover:bg-[#FAF9F6] transition-smooth flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-[#D97757]" />
                    <span>เพิ่มเมนูอาหารใหม่</span>
                  </button>

                  <button
                    onClick={() => {
                      setExcelImportResult(null);
                      setExcelErrorMessage(null);
                      setExcelUploadedFileName("");
                      setExcelTargetDay(selectedDayKey);
                      setExcelMenuName(activeDayPlan.menuName || "");
                      setShowExcelImportModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#F2D7CA] bg-[#FDF4F0] text-[#B55232] text-xs font-bold hover:bg-[#FBEDE6] transition-smooth flex items-center gap-1.5 shadow-xs"
                    title="นำเข้ารายการอาหารและวัตถุดิบจากไฟล์ Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#B55232]" />
                    <span>📥 นำเข้าจาก Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReportModal("WEEKLY_PLAN")}
                    className="px-4 py-2.5 rounded-xl border border-[#C7E2D6] bg-white text-[#1F5E4B] text-xs font-bold hover:bg-[#F2F8F5] transition-smooth flex items-center gap-1.5 shadow-xs"
                    title="พิมพ์รายงานสรุปแผนอาหารประจำสัปดาห์ (แบบ อห.02)"
                  >
                    <Printer className="w-4 h-4 text-[#1F5E4B]" />
                    <span>พิมพ์แผนสัปดาห์ (แบบ อห.02)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setSyncStatus("SAVING");
                      await saveCloudState({ weeklyPlan, selectedDayKey, dailyIngredients });
                      setSyncStatus("SYNCED");
                      setIngredientSaveToast(true);
                      setTimeout(() => setIngredientSaveToast(false), 3000);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#E7E4DC] bg-white text-[#18201C] text-xs font-bold hover:bg-[#FAF9F6] transition-smooth flex items-center gap-1.5 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-[#1F5E4B]" />
                    <span>บันทึกวัตถุดิบ</span>
                  </button>

                  <button
                    onClick={handleConfirmPlan}
                    className="px-5 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold tracking-tight transition-smooth flex items-center gap-2 shadow-soft"
                  >
                    <Lock className="w-4 h-4 text-[#EAD598]" />
                    <span>
                      {isPlanFrozen
                        ? "ตรึง Snapshot แล้ว ✓"
                        : "ตรึง Snapshot และส่งให้ครูเวร"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

        {/* ========================================================================= */}
        {/* TAB 3: WEEKLY & MONTHLY EXECUTIVE ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === "ANALYTICS" && (
          <div className="space-y-6">
            {/* Analytics Header & Timeframe Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E7E4DC] shadow-card">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F5E4B] block">
                  รายงานวิเคราะห์การเงินและโภชนาการ
                </span>
                <h2 className="text-xl font-extrabold text-[#18201C] tracking-tight mt-0.5">
                  แดชบอร์ดสรุปผลการใช้งบประมาณอาหารกลางวัน
                </h2>
                <p className="text-xs text-[#66746C] mt-0.5">
                  วิเคราะห์อัตราการใช้งบประมาณรายสัปดาห์และความเพียงพอของงบประมาณตลอดภาคเรียน
                </p>
              </div>

              {/* Timeframe Pill Switcher */}
              <div className="flex bg-[#F4F2EB] p-1 rounded-2xl border border-[#E7E4DC] text-xs font-bold">
                <button
                  onClick={() => setAnalyticsTimeframe("WEEKLY")}
                  className={`px-3.5 py-1.5 rounded-xl transition-smooth ${
                    analyticsTimeframe === "WEEKLY"
                      ? "bg-white text-[#1F5E4B] shadow-xs"
                      : "text-[#66746C] hover:text-[#18201C]"
                  }`}
                >
                  รายสัปดาห์
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe("MONTHLY")}
                  className={`px-3.5 py-1.5 rounded-xl transition-smooth ${
                    analyticsTimeframe === "MONTHLY"
                      ? "bg-white text-[#1F5E4B] shadow-xs"
                      : "text-[#66746C] hover:text-[#18201C]"
                  }`}
                >
                  รายเดือน
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe("SEMESTER")}
                  className={`px-3.5 py-1.5 rounded-xl transition-smooth ${
                    analyticsTimeframe === "SEMESTER"
                      ? "bg-white text-[#1F5E4B] shadow-xs"
                      : "text-[#66746C] hover:text-[#18201C]"
                  }`}
                >
                  ทั้งภาคเรียน ({settings.semester})
                </button>
              </div>
            </div>

            {/* 4 Key Performance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#E7E4DC] shadow-card">
                <div className="flex items-center justify-between text-[#8C9890]">
                  <span className="text-xs font-bold tracking-wider">
                    งบที่ได้รับแล้ว (เงินงวดสะสม)
                  </span>
                  <Wallet className="w-4 h-4 text-[#1F5E4B]" />
                </div>
                <div className="text-2xl font-black font-mono tabular-nums text-[#18201C] mt-2">
                  {totalIncomeReceived.toLocaleString()} <span className="text-xs font-sans font-normal text-[#66746C]">฿</span>
                </div>
                <div className="text-xs text-[#66746C] mt-1 font-medium">
                  คำนวณจากเงินงวดที่โอนเข้าบัญชีจริง
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E7E4DC] shadow-card">
                <div className="flex items-center justify-between text-[#8C9890]">
                  <span className="text-xs font-bold tracking-wider">
                    รายจ่ายจริงสะสม
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#D97757]" />
                </div>
                <div className="text-2xl font-black font-mono tabular-nums text-[#18201C] mt-2">
                  {totalActualExpenses.toLocaleString()} <span className="text-xs font-sans font-normal text-[#66746C]">฿</span>
                </div>
                <div className="text-xs text-[#66746C] mt-1 font-medium">
                  {totalIncomeReceived > 0
                    ? `คิดเป็น ${Math.round((totalActualExpenses / totalIncomeReceived) * 100)}% ของงบที่รับแล้ว`
                    : "ยังไม่มีรายการบันทึกเงินงวด"}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E7E4DC] shadow-card">
                <div className="flex items-center justify-between text-[#8C9890]">
                  <span className="text-xs font-bold tracking-wider">
                    งบประมาณคงเหลือจริง
                  </span>
                  {netCashRemaining >= 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1F5E4B]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#D97757]" />
                  )}
                </div>
                <div
                  className={`text-2xl font-black font-mono tabular-nums mt-2 ${
                    netCashRemaining >= 0 ? "text-[#1F5E4B]" : "text-[#B55232]"
                  }`}
                >
                  {netCashRemaining.toLocaleString()} <span className="text-xs font-sans font-normal">฿</span>
                </div>
                <div
                  className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                    netCashRemaining >= 0 ? "text-[#1F5E4B]" : "text-[#B55232]"
                  }`}
                >
                  {netCashRemaining >= 0 ? (
                    <span>✓ สถานะเงินสดปลอดภัย</span>
                  ) : (
                    <span>⚠️ ยอดเงินติดลบ เกินวงเงินที่ได้รับจัดสรร</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#E7E4DC] shadow-card">
                <div className="flex items-center justify-between text-[#8C9890]">
                  <span className="text-xs font-bold tracking-wider">
                    ประมาณการวันคงเหลือ
                  </span>
                  <Clock className="w-4 h-4 text-[#2E6B8E]" />
                </div>
                <div className="text-2xl font-black font-mono tabular-nums text-[#18201C] mt-2">
                  {analyticsSummary.estimatedDaysRemaining} <span className="text-xs font-sans font-normal text-[#66746C]">วันเปิดเรียน</span>
                </div>
                <div className="text-xs text-[#66746C] mt-1 font-medium">
                  เกณฑ์ ~{analyticsSummary.benchmarkDailySpend.toLocaleString()} ฿ / วัน (คงเหลืองวดที่ 1 อีก {analyticsSummary.estimatedDaysRemaining} จาก {settings.daysPerInstallment || 20} วัน)
                </div>
              </div>
            </div>

            {/* Conditional Views based on analyticsTimeframe */}
            {analyticsTimeframe === "WEEKLY" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left 2 Cols: Weekly Spending Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#18201C] text-sm tracking-tight">
                        เปรียบเทียบยอดใช้จ่ายแยกตามสัปดาห์
                      </h3>
                      <p className="text-xs text-[#66746C] mt-0.5">
                        คำนวณจากยอดเบิกจ่ายจริงและรายการแผนเมนูอาหารในแต่ละสัปดาห์ (กรอบงบ {analyticsSummary.weeklyAllocation.toLocaleString()} ฿ / สัปดาห์)
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#1F5E4B] bg-[#F2F8F5] px-2.5 py-1 rounded-lg border border-[#C7E2D6]">
                      งวดที่ 1 (พฤศจิกายน 2569)
                    </span>
                  </div>

                  {/* CSS Bar Chart */}
                  <div className="pt-4 space-y-4">
                    {analyticsSummary.weeklyAnalyticsData.map((bar) => {
                      const pct = Math.min(100, Math.round((bar.displaySpend / (bar.max || 1)) * 100));
                      return (
                        <div key={bar.weekNum} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={bar.isCurrent ? "text-[#18201C] font-extrabold flex items-center gap-1.5" : "text-[#66746C] flex items-center gap-1.5"}>
                              {bar.isCurrent && <span className="w-2 h-2 rounded-full bg-[#1F5E4B] animate-pulse" />}
                              <span>{bar.name} ({bar.dates})</span>
                            </span>
                            <span className="font-mono tabular-nums text-[#18201C]">
                              {bar.displaySpend > 0 ? (
                                <>
                                  {bar.displaySpend.toLocaleString()} ฿{" "}
                                  <span className={`text-[10px] font-normal ${bar.actualSpend > 0 ? "text-[#1F5E4B] font-semibold" : "text-[#8C9890]"}`}>
                                    ({bar.status})
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] text-[#8C9890] font-normal">
                                  รอเริ่มสัปดาห์ ({bar.status})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-3.5 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E4DC] p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                bar.actualSpend > 0
                                  ? "bg-gradient-to-r from-[#1F5E4B] to-[#31866B]"
                                  : bar.plannedSpend > 0
                                  ? "bg-[#88A89A]"
                                  : "bg-[#E7E4DC]"
                              }`}
                              style={{ width: `${Math.max(bar.displaySpend > 0 ? 3 : 0, pct)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-[#8C9890]">
                            <span>
                              {bar.actualSpend > 0
                                ? `เบิกจ่ายจริง ${bar.actualSpend.toLocaleString()} ฿`
                                : bar.plannedSpend > 0
                                ? `แผนวัตถุดิบ ${bar.plannedSpend.toLocaleString()} ฿ (${bar.planDaysCount} วัน)`
                                : "ยังไม่มีรายการเบิกจ่าย"}
                            </span>
                            <span>กรอบงบสัปดาห์ {bar.max.toLocaleString()} ฿</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 1 Col: Category Proportion */}
                <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-4">
                  <div>
                    <h3 className="font-extrabold text-[#18201C] text-sm tracking-tight">
                      สัดส่วนหมวดหมู่ค่าใช้จ่าย
                    </h3>
                    <p className="text-xs text-[#66746C] mt-0.5">แบ่งตามประเภทการตัดจ่ายจริง</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#1F5E4B] inline-block" />
                          ค่าวัตถุดิบสดตามเมนู
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#18201C]">
                          {analyticsSummary.rawPercent}%
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-[#66746C]">
                        {analyticsSummary.rawIngredientsExpense.toLocaleString()} ฿
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D97757] inline-block" />
                          ของซื้อเพิ่มหน้างาน
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#18201C]">
                          {analyticsSummary.adhocPercent}%
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-[#66746C]">
                        {analyticsSummary.adhocExpense.toLocaleString()} ฿
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[#18201C] flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D49B38] inline-block" />
                          ค่าแก๊สและค่าจ้างแม่ครัว
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#18201C]">
                          {analyticsSummary.opPercent}%
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-[#66746C]">
                        {analyticsSummary.operationalExpense.toLocaleString()} ฿
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#ECE8DE]">
                    <div className="p-3.5 bg-[#F2F8F5] rounded-2xl border border-[#C7E2D6] text-[#1F5E4B] text-xs">
                      <strong className="block font-bold mb-0.5">✓ สรุปการตรวจสอบ (Audit Insight)</strong>
                      สัดส่วนค่าอาหารสดอยู่ในเกณฑ์มาตรฐาน สตง. (สูงกว่า 80% ของงบประมาณรวม)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MONTHLY VIEW */}
            {analyticsTimeframe === "MONTHLY" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Month 1: November 2026 */}
                <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-[#1F5E4B] bg-[#F2F8F5] px-2.5 py-1 rounded-lg border border-[#C7E2D6]">
                        เดือนปัจจุบัน (งวดที่ 1)
                      </span>
                      <h3 className="font-black text-[#18201C] text-lg mt-2">
                        พฤศจิกายน 2569
                      </h3>
                      <p className="text-xs text-[#66746C]">
                        งวดที่ 1 (2 พ.ย. - 27 พ.ย. 2569 • 20 วันทำการ)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#8C9890] font-medium">งบที่ได้รับ</div>
                      <div className="text-lg font-black font-mono text-[#18201C]">
                        {totalIncomeReceived.toLocaleString()} ฿
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#E7E4DC] space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#66746C]">ยอดเบิกจ่ายจริงสะสม:</span>
                      <span className="font-mono font-bold text-[#18201C]">{totalActualExpenses.toLocaleString()} ฿</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#66746C]">ประมาณการใช้จ่าย {analyticsSummary.estimatedDaysRemaining} วันที่เหลือ:</span>
                      <span className="font-mono font-bold text-[#18201C]">
                        {(analyticsSummary.estimatedDaysRemaining * analyticsSummary.benchmarkDailySpend).toLocaleString()} ฿
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E7E4DC] font-bold text-[#1F5E4B]">
                      <span>งบประมาณคงเหลือจริงสุทธิ:</span>
                      <span className="font-mono text-sm">{netCashRemaining.toLocaleString()} ฿</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F2F8F5] rounded-xl border border-[#C7E2D6] text-xs text-[#1F5E4B]">
                    ✓ สถานะเงินสดคล่องตัว เบิกจ่ายไปแล้ว {totalIncomeReceived > 0 ? ((totalActualExpenses / totalIncomeReceived) * 100).toFixed(1) : 0}% ของงบงวดที่ 1
                  </div>
                </div>

                {/* Month 2: December 2026 */}
                <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-[#B55232] bg-[#FDF6F0] px-2.5 py-1 rounded-lg border border-[#F0D5C3]">
                        รอบถัดไป (งวดที่ 2)
                      </span>
                      <h3 className="font-black text-[#18201C] text-lg mt-2">
                        ธันวาคม 2569
                      </h3>
                      <p className="text-xs text-[#66746C]">
                        งวดที่ 2 (เตรียมเสนอขอจัดสรร • 20 วันทำการ)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#8C9890] font-medium">ประมาณการงบ</div>
                      <div className="text-lg font-black font-mono text-[#18201C]">
                        {((settings.studentCount || 86) * (settings.subsidyPerHead || 27) * (settings.daysPerInstallment || 20)).toLocaleString()} ฿
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAF9F6] rounded-2xl border border-[#E7E4DC] space-y-2.5 text-xs">
                    <div className="flex justify-between text-[#66746C]">
                      <span>สถานะการโอนเงินงวด:</span>
                      <span className="font-semibold text-[#B55232]">รอยืนยันการโอนจาก อปท./สพป.</span>
                    </div>
                    <div className="flex justify-between text-[#66746C]">
                      <span>แผนเมนูอาหารล่วงหน้า:</span>
                      <span className="font-semibold text-[#18201C]">สามารถจัดเตรียมไว้ในปฏิทินล่วงหน้าได้</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E7E4DC] font-bold text-[#66746C]">
                      <span>จำนวนวันเปิดเรียน:</span>
                      <span className="font-mono text-sm text-[#18201C]">20 วันทำการ</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E4DC] text-xs text-[#66746C]">
                    ℹ️ เมื่อได้รับเงินโอนงวดที่ 2 สามารถเพิ่มรายการเงินงวดได้ที่แท็บ &quot;สมุดบัญชี&quot; ระบบจะคำนวณสะสมให้อัตโนมัติ
                  </div>
                </div>
              </div>
            )}

            {/* SEMESTER VIEW */}
            {analyticsTimeframe === "SEMESTER" && (
              <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-[#18201C] text-base">
                      ภาพรวมงบประมาณทั้งภาคเรียน ({settings.semester || "ภาคเรียนที่ 2/2569"})
                    </h3>
                    <p className="text-xs text-[#66746C] mt-0.5">
                      จัดสรร 5 งวด รวม 100 วันเปิดเรียน ({settings.studentCount || 86} คน × {settings.subsidyPerHead || 27} ฿ × 100 วัน = {((settings.studentCount || 86) * (settings.subsidyPerHead || 27) * 100).toLocaleString()} ฿)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#1F5E4B] bg-[#F2F8F5] px-3 py-1.5 rounded-xl border border-[#C7E2D6]">
                      เบิกจ่ายแล้ว 1 จาก 5 งวด
                    </span>
                  </div>
                </div>

                {/* Semester Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#18201C]">
                      ความคืบหน้างบที่ได้รับจัดสรรเข้าบัญชี ({totalIncomeReceived.toLocaleString()} / {((settings.studentCount || 86) * (settings.subsidyPerHead || 27) * 100).toLocaleString()} ฿)
                    </span>
                    <span className="font-mono text-[#1F5E4B]">
                      {(((totalIncomeReceived || 46440) / ((settings.studentCount || 86) * (settings.subsidyPerHead || 27) * 100)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-4 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#E7E4DC] p-0.5">
                    <div
                      className="h-full rounded-full bg-[#1F5E4B] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(((totalIncomeReceived || 46440) / ((settings.studentCount || 86) * (settings.subsidyPerHead || 27) * 100)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 5 Installment Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                  <div className="bg-white p-4 rounded-2xl border-2 border-[#1F5E4B] text-center space-y-1 shadow-xs">
                    <span className="text-[10px] font-bold text-[#1F5E4B] bg-[#F2F8F5] px-2 py-0.5 rounded-md">
                      งวดที่ 1 (ปัจจุบัน)
                    </span>
                    <div className="font-black text-sm text-[#18201C] font-mono mt-1">46,440 ฿</div>
                    <div className="text-[10px] text-[#1F5E4B] font-semibold">✓ รับเงินแล้ว</div>
                    <div className="text-[9px] text-[#8C9890]">2 พ.ย. - 27 พ.ย. 69</div>
                  </div>
                  {[2, 3, 4, 5].map((roundNum) => (
                    <div
                      key={roundNum}
                      className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E7E4DC] text-center space-y-1 opacity-75"
                    >
                      <span className="text-[10px] font-bold text-[#8C9890]">
                        งวดที่ {roundNum}
                      </span>
                      <div className="font-black text-sm text-[#66746C] font-mono mt-1">46,440 ฿</div>
                      <div className="text-[10px] text-[#8C9890]">รอรับจัดสรร</div>
                      <div className="text-[9px] text-[#8C9890]">20 วันเปิดเรียน</div>
                    </div>
                  ))}
                </div>

                {/* Semester Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#ECE8DE] text-xs">
                  <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E4DC]">
                    <span className="text-[#8C9890] block text-[11px]">งบที่ยังรอรับจัดสรร (งวด 2–5):</span>
                    <strong className="text-sm font-mono text-[#18201C]">
                      {(4 * 46440).toLocaleString()} ฿
                    </strong>
                  </div>
                  <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E4DC]">
                    <span className="text-[#8C9890] block text-[11px]">ยอดเบิกจ่ายจริงสะสมทั้งเทอม:</span>
                    <strong className="text-sm font-mono text-[#18201C]">
                      {totalActualExpenses.toLocaleString()} ฿
                    </strong>
                  </div>
                  <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E7E4DC]">
                    <span className="text-[#8C9890] block text-[11px]">งบคงเหลือจริงสุทธิปัจจุบัน:</span>
                    <strong className="text-sm font-mono text-[#1F5E4B]">
                      {netCashRemaining.toLocaleString()} ฿
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FINANCIAL LEDGER (สมุดบัญชีรายรับ-จ่าย) */}
        {/* ========================================================================= */}
        {activeTab === "FINANCE_LEDGER" && (
          <div className="bg-white rounded-3xl p-6 border border-[#E7E4DC] shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE8DE]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F5E4B] block">
                  สมุดบัญชีโครงการอาหารกลางวัน
                </span>
                <h3 className="text-base font-extrabold text-[#18201C] mt-0.5">
                  สมุดบัญชีคุมรายรับ-รายจ่าย
                </h3>
                <p className="text-xs text-[#66746C] mt-0.5">
                  บันทึกรายการแบบโปร่งใส ตรวจสอบย้อนหลังได้ พร้อมส่งออกไฟล์ Excel นำไปใช้งานราชการ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter */}
                <div className="flex bg-[#F4F2EB] p-0.5 rounded-xl border border-[#E7E4DC] text-xs">
                  <button
                    onClick={() => setLedgerFilter("ALL")}
                    className={`px-3 py-1 rounded-lg font-bold transition-smooth ${
                      ledgerFilter === "ALL" ? "bg-white text-[#18201C] shadow-xs" : "text-[#66746C]"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setLedgerFilter("INCOME")}
                    className={`px-3 py-1 rounded-lg font-bold transition-smooth ${
                      ledgerFilter === "INCOME" ? "bg-white text-[#1F5E4B] shadow-xs" : "text-[#66746C]"
                    }`}
                  >
                    รายรับ
                  </button>
                  <button
                    onClick={() => setLedgerFilter("EXPENSE")}
                    className={`px-3 py-1 rounded-lg font-bold transition-smooth ${
                      ledgerFilter === "EXPENSE" ? "bg-white text-[#B55232] shadow-xs" : "text-[#66746C]"
                    }`}
                  >
                    รายจ่าย
                  </button>
                </div>

                <button
                  onClick={() => setShowAddIncomeModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-[#C7E2D6] bg-[#EBF4F0] text-[#1F5E4B] text-xs font-bold hover:bg-[#DDF0E7] transition-smooth flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>รับงบงวดใหม่</span>
                </button>

                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-[#F2D7CA] bg-[#FDF4F0] text-[#B55232] text-xs font-bold hover:bg-[#FBEDE6] transition-smooth flex items-center gap-1.5 shadow-2xs"
                >
                  <Flame className="w-4 h-4 text-[#D97757]" />
                  <span>รายการนอก (ค่าแก๊ส/แม่ครัว)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReportModal("LEDGER")}
                  className="px-3.5 py-2 rounded-xl border border-[#C7E2D6] bg-white text-[#1F5E4B] hover:bg-[#F2F8F5] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-2xs"
                  title="พิมพ์ทะเบียนคุมรายรับ-รายจ่าย (แบบ ทค.03)"
                >
                  <Printer className="w-4 h-4 text-[#1F5E4B]" />
                  <span>พิมพ์ทะเบียนคุมเงิน (แบบ ทค.03)</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft"
                >
                  <Download className="w-4 h-4 text-[#EAD598]" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#18201C]">
                <thead className="bg-[#FAF9F6] text-[#66746C] font-bold border-y border-[#E7E4DC] text-xs">
                  <tr>
                    <th className="py-3 px-3">เลขที่เอกสาร</th>
                    <th className="py-3 px-3">วันที่</th>
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3">หมวดหมู่</th>
                    <th className="py-3 px-3">รายละเอียด</th>
                    <th className="py-3 px-3 text-right">จำนวนเงิน (บาท)</th>
                    <th className="py-3 px-3 text-center w-12">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE4] font-medium">
                  {transactions.filter((t) => (ledgerFilter === "ALL" ? true : t.type === ledgerFilter))
                    .length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8C9890]">
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#1F5E4B]" />
                        <span className="block text-sm font-bold text-[#18201C]">ยังไม่มีรายการบันทึกในสมุดบัญชี</span>
                        <span className="block text-xs text-[#66746C] mt-1 mb-3.5">
                          คลิกปุ่ม <strong>&quot;+ รับงบงวดใหม่&quot;</strong> เพื่อบันทึกเงินอุดหนุนที่โอนเข้า หรือใช้ปุ่มด่วนด้านล่างนี้
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIncomeName(
                              `รับเงินจัดสรรงบอาหารกลางวัน ${currentRoundTitle} (${studentCount} คน × ${subsidyPerHead} บ. × ${daysPerInstallment} วัน)`
                            );
                            setIncomeAmount(installmentBudgetAllocation.toString());
                            setShowAddIncomeModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F5E4B] text-white text-xs font-bold shadow-soft hover:bg-[#143B30] transition-smooth"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#EAD598]" />
                          <span>
                            บันทึกรับงวดที่ 1 ทันที: {installmentBudgetAllocation.toLocaleString()} ฿ ({studentCount} คน × {subsidyPerHead} บ. × {daysPerInstallment} วัน)
                          </span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    transactions
                      .filter((t) => (ledgerFilter === "ALL" ? true : t.type === ledgerFilter))
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#FAF9F6]/80 transition-smooth">
                          <td className="py-3 px-3 font-mono tabular-nums font-bold text-[#18201C]">{tx.documentNo}</td>
                          <td className="py-3 px-3 font-mono tabular-nums text-[#66746C]">{tx.date}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                tx.type === "INCOME"
                                  ? "bg-[#EBF4F0] text-[#1F5E4B] border border-[#C7E2D6]"
                                  : "bg-[#FDF4F0] text-[#B55232] border border-[#F2D7CA]"
                              }`}
                            >
                              {tx.type === "INCOME" ? "รายรับ (+)" : "รายจ่าย (-)"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#18201C]">{tx.category}</td>
                          <td className="py-3 px-3 text-[#3E4942]">{tx.description}</td>
                          <td
                            className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                              tx.type === "INCOME" ? "text-[#1F5E4B]" : "text-[#18201C]"
                            }`}
                          >
                            {tx.type === "INCOME" ? "+" : "-"}
                            {tx.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            ฿
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTransaction(tx)}
                                className="p-1.5 text-[#66746C] hover:text-[#1F5E4B] hover:bg-[#EBF4F0] rounded-lg transition-colors"
                                title="แก้ไขรายการบัญชีนี้ (วันที่, จำนวนเงิน, รายละเอียด)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="p-1.5 text-[#8C9890] hover:text-[#B55232] hover:bg-[#FDF4F0] rounded-lg transition-colors"
                                title="ลบรายการนี้ออกจากสมุดบัญชี"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COMPREHENSIVE SCHOOL & TEAM SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === "SETTINGS" && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F5E4B] block">
                  การตั้งค่าระบบและบุคลากร
                </span>
                <h2 className="text-xl font-extrabold text-[#18201C] tracking-tight mt-0.5">
                  ตั้งค่าข้อมูลโรงเรียนและคณะกรรมการอาหารกลางวัน
                </h2>
                <p className="text-xs text-[#66746C] mt-0.5">
                  ข้อมูลที่ตั้งค่าตรงนี้จะถูกนำไปใช้ในหัวรายงาน เอกสารราชการ และแสดงชื่อครูเวรอัตโนมัติตามวัน
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-2 shadow-soft active:scale-95"
              >
                <Save className="w-4 h-4 text-[#EAD598]" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>

            {/* Success Toast */}
            {settingsSaveToast && (
              <div className="bg-[#1F5E4B] text-white p-4 rounded-2xl shadow-soft flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-[#EAD598]" />
                <span>บันทึกข้อมูลโรงเรียนและตารางครูเวรเรียบร้อยแล้ว! ข้อมูลมีผลทั่วทั้งระบบทันที</span>
              </div>
            )}

            {/* Mobile PWA Install Shortcut Card */}
            <div className="bg-gradient-to-r from-white to-[#F2F8F5] p-5 rounded-3xl border border-[#C7E2D6] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-[#C7E2D6] p-1 flex items-center justify-center shadow-xs shrink-0">
                  <img
                    src="/app-logo.png"
                    alt="School Lunch OS Logo"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#18201C]">ติดตั้งแอปไว้บนหน้าจอโฮมโทรศัพท์ (Mobile PWA)</h4>
                    <span className="text-[10px] font-semibold bg-[#EBF4F0] text-[#1F5E4B] px-2 py-0.5 rounded-full border border-[#C7E2D6]">
                      แนะนำสำหรับครูเวร
                    </span>
                  </div>
                  <p className="text-[11px] text-[#66746C] mt-0.5">
                    เปิดใช้งานสะดวกแบบเต็มหน้าจอ เสมือนแอปมือถือจริง ไม่ต้องโหลดผ่าน App Store
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(true)}
                className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shrink-0 transition-smooth shadow-soft flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#EAD598]" />
                <span>เปิดดูวิธีติดตั้ง (iOS & Android)</span>
              </button>
            </div>

            {/* School Profile Section */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-4">
              <h3 className="text-sm font-extrabold text-[#18201C] flex items-center gap-2 border-b border-[#ECE8DE] pb-3">
                <Building2 className="w-4 h-4 text-[#1F5E4B]" />
                <span>1. ข้อมูลสถานศึกษาและผู้บริหาร</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อโรงเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.schoolName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, schoolName: e.target.value })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อผู้อำนวยการโรงเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.directorName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, directorName: e.target.value })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    ชื่อครูผู้รับผิดชอบโครงการอาหารกลางวัน:
                  </label>
                  <input
                    type="text"
                    value={settingsForm.nutritionHeadName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, nutritionHeadName: e.target.value })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-[#18201C] block mb-1">
                    ชื่อผู้ประกอบอาหาร / แม่ครัว (ผู้ส่งมอบในใบตรวจรับพัสดุ ตร.01):
                  </label>
                  <input
                    type="text"
                    value={settingsForm.cookName ?? ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cookName: e.target.value })
                    }
                    placeholder="ระบุชื่อ-นามสกุลแม่ครัว (หรือเว้นว่างไว้เพื่อลงชื่อด้วยลายมือในเอกสาร)"
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                  <span className="text-[11px] text-[#66746C] mt-1 block">
                    * ชื่อนี้จะใช้เป็นผู้ลงนามส่งมอบในใบตรวจรับพัสดุราชการ (แบบ ตร.01) หากไม่ระบุ ระบบจะเว้นช่องว่างเป็นเส้นประให้ลงนามจริง
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ปีการศึกษา:</label>
                  <input
                    type="text"
                    value={settingsForm.academicYear}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, academicYear: e.target.value })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ภาคเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.semester}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, semester: e.target.value })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    จำนวนวันเปิดเรียนประมาณการ (วัน):
                  </label>
                  <input
                    type="number"
                    value={settingsForm.totalSemesterDays || 100}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        totalSemesterDays: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    จำนวนนักเรียนที่ได้รับจัดสรร (คน):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.studentCount ?? 86}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        studentCount: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    อัตราเงินอุดหนุนรายหัว (บาท/คน/วัน):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={settingsForm.subsidyPerHead ?? 27}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        subsidyPerHead: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    จำนวนวันทำการต่องวดจัดสรร (วัน):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settingsForm.daysPerInstallment ?? 20}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        daysPerInstallment: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    ชื่องวดจัดสรรปัจจุบัน:
                  </label>
                  <input
                    type="text"
                    value={settingsForm.currentRoundTitle || "งวดที่ 1 (2 พ.ย. – 27 พ.ย. 2569)"}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        currentRoundTitle: e.target.value,
                      })
                    }
                    placeholder="เช่น งวดที่ 1 (2 พ.ย. – 27 พ.ย. 2569)"
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    วันเริ่มต้นงวด:
                  </label>
                  <input
                    type="date"
                    value={settingsForm.currentRoundStartDate || "2026-11-02"}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        currentRoundStartDate: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">
                    วันสิ้นสุดงวด:
                  </label>
                  <input
                    type="date"
                    value={settingsForm.currentRoundEndDate || "2026-11-27"}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        currentRoundEndDate: e.target.value,
                      })
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                {/* Live Budget Simulation Card */}
                <div className="md:col-span-2 p-5 sm:p-6 bg-[#F2F8F5] rounded-3xl border border-[#C7E2D6] space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#1F5E4B]" />
                      <strong className="font-bold text-sm text-[#1F5E4B]">
                        สรุปการคำนวณงบประมาณอัตโนมัติ (Live Simulation)
                      </strong>
                    </div>
                    <span className="text-[11px] font-bold text-[#1F5E4B] bg-white px-3 py-1 rounded-full border border-[#C7E2D6] w-fit">
                      {settingsForm.currentRoundTitle || "งวดที่ 1"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-3.5 rounded-xl border border-[#E7E4DC] text-center">
                      <span className="text-[11px] text-[#66746C] block">ยอดจัดสรรรายวัน (1 วัน)</span>
                      <span className="text-lg font-black text-[#1F5E4B] tabular-nums">
                        {((settingsForm.studentCount || 86) * (settingsForm.subsidyPerHead || 27)).toLocaleString()}{" "}
                        <span className="text-xs font-normal">฿</span>
                      </span>
                      <span className="text-[10px] text-[#8C9890] block mt-0.5">
                        ({settingsForm.studentCount || 86} คน × {settingsForm.subsidyPerHead || 27} ฿)
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#E7E4DC] text-center">
                      <span className="text-[11px] text-[#66746C] block">ยอดจัดสรรรายสัปดาห์ (5 วัน)</span>
                      <span className="text-lg font-black text-[#2E6B8E] tabular-nums">
                        {((settingsForm.studentCount || 86) * (settingsForm.subsidyPerHead || 27) * 5).toLocaleString()}{" "}
                        <span className="text-xs font-normal">฿</span>
                      </span>
                      <span className="text-[10px] text-[#8C9890] block mt-0.5">
                        (5 วันทำการ จันทร์–ศุกร์)
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#C7E2D6] bg-[#EBF4F0]/60 text-center">
                      <span className="text-[11px] text-[#1F5E4B] block font-bold">
                        ยอดจัดสรรรวมต่องวด ({settingsForm.daysPerInstallment || 20} วัน)
                      </span>
                      <span className="text-lg font-black text-[#1F5E4B] tabular-nums">
                        {(
                          (settingsForm.studentCount || 86) *
                          (settingsForm.subsidyPerHead || 27) *
                          (settingsForm.daysPerInstallment || 20)
                        ).toLocaleString()}{" "}
                        <span className="text-xs font-normal">฿</span>
                      </span>
                      <span className="text-[10px] text-[#1F5E4B] block mt-0.5 font-medium">
                        (งบโอนเข้าบัญชีโรงเรียน)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 p-4 bg-[#F2F8F5] rounded-2xl border border-[#C7E2D6] text-[#1F5E4B] text-xs flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-[#1F5E4B] mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-bold text-sm block text-[#1F5E4B] mb-0.5">
                      ระบบคำนวณงบประมาณตามเงินงวดที่โอนเข้าจริง (ไม่จำเป็นต้องระบุยอดทั้งเทอมล่วงหน้า)
                    </strong>
                    <span className="text-[#3E4942] leading-relaxed block">
                      ในระบบราชการ เงินอุดหนุนอาหารกลางวันจะทยอยโอนเข้ามาเป็นงวดตามรอบจัดสรร 
                      เมื่อมีเงินงวดเข้าบัญชีโรงเรียน คุณครูสามารถกดบันทึกรับเงินได้ที่แท็บ <strong>&quot;สมุดบัญชี &gt; รับงบงวดใหม่&quot;</strong> 
                      ระบบจะรวมยอดเงินรับจริงสะสม และคำนวณยอดเงินคงเหลือสุทธิให้อัตโนมัติทันที
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Duty Teacher Roster Section */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E4DC] shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-[#ECE8DE] pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#18201C] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#1F5E4B]" />
                    <span>2. รายชื่อคณะครูเวรตรวจรับของสดประจำวัน (รองรับวันละหลายคน)</span>
                  </h3>
                  <p className="text-xs text-[#66746C] mt-0.5">
                    สามารถกด &quot;+ เพิ่มครูเวร&quot; เพื่อใส่ชื่อครูเวรในแต่ละวันได้หลายคนตามคำสั่งแต่งตั้งของโรงเรียน
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    { dayKey: "monday", label: "วันจันทร์", color: "bg-amber-400" },
                    { dayKey: "tuesday", label: "วันอังคาร", color: "bg-pink-400" },
                    { dayKey: "wednesday", label: "วันพุธ", color: "bg-emerald-500" },
                    { dayKey: "thursday", label: "วันพฤหัสบดี", color: "bg-orange-500" },
                    { dayKey: "friday", label: "วันศุกร์", color: "bg-blue-400" },
                  ] as const
                ).map(({ dayKey, label, color }) => (
                  <div
                    key={dayKey}
                    className={`bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl border border-[#E7E4DC] space-y-3.5 shadow-xs ${
                      dayKey === "friday" ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#18201C] flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        คณะครูเวรประจำ{label} ({(settingsForm.dutyRoster?.[dayKey] || []).length} คน)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddTeacherToDay(dayKey)}
                        className="text-[11px] font-bold text-[#1F5E4B] hover:text-[#143B30] bg-white border border-[#C7E2D6] px-2.5 py-1 rounded-lg hover:bg-[#F2F8F5] transition-smooth flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3 text-[#1F5E4B]" />
                        <span>เพิ่มครูเวร</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(settingsForm.dutyRoster?.[dayKey] || []).map((teacherName, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#8C9890] w-5 text-center">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            placeholder={`ชื่อ-สกุล ครูเวรคนที่ ${idx + 1}`}
                            value={teacherName}
                            onChange={(e) =>
                              handleUpdateTeacherName(dayKey, idx, e.target.value)
                            }
                            className="flex-1 bg-white border border-[#E7E4DC] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#18201C] focus:outline-none focus:ring-1 focus:ring-[#1F5E4B]"
                          />
                          {(settingsForm.dutyRoster?.[dayKey] || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacherFromDay(dayKey, idx)}
                              className="p-1.5 text-[#8C9890] hover:text-[#B55232] hover:bg-[#FDF4F0] rounded-lg transition-smooth"
                              title="ลบรายชื่อนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#ECE8DE] flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth shadow-soft active:scale-95"
                >
                  บันทึกการตั้งค่าทั้งหมด
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ALL INTERACTIVE MODALS */}
        {/* ========================================================================= */}
        {/* MODAL 1: ซื้อเครื่องปรุงเพิ่มหน้างาน */}
        {showAdHocModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-floating border border-[#E7E4DC]">
              <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D97757]" />
                ซื้อเครื่องปรุง / ของสดเพิ่มหน้างาน
              </h3>
              <p className="text-xs text-[#66746C] mt-1">
                บันทึกของสดหรือเครื่องปรุงที่ต้องซื้อเพิ่มเร่งด่วนเช้านี้ ระบบจะเพิ่มเข้าใบตรวจรับและลงบัญชีทันที
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อรายการ:</label>
                  <input
                    type="text"
                    placeholder="เช่น ซีอิ๊วขาวเห็ดหอม, น้ำตาลทราย, มะนาว"
                    value={adHocName}
                    onChange={(e) => setAdHocName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">จำนวนที่ซื้อ:</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={adHocQty}
                      onChange={(e) => setAdHocQty(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">
                      หน่วยนับ (พิมพ์เองได้):
                    </label>
                    <input
                      type="text"
                      list="adhoc-unit-options"
                      placeholder="เช่น ขวด, กก., ซอง"
                      value={adHocUnit}
                      onChange={(e) => setAdHocUnit(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                    />
                    <datalist id="adhoc-unit-options">
                      <option value="ขวด" />
                      <option value="กก." />
                      <option value="แพ็ก" />
                      <option value="ถุง" />
                      <option value="มัด" />
                      <option value="ฟอง" />
                      <option value="ซอง" />
                      <option value="กล่อง" />
                    </datalist>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["ขวด", "กก.", "แพ็ก", "ถุง", "ซอง"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setAdHocUnit(u)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-smooth ${
                            adHocUnit === u
                              ? "bg-[#1F5E4B] text-white border-[#1F5E4B]"
                              : "bg-[#F4F2EB] text-[#66746C] border-[#E7E4DC] hover:bg-[#EAE6DC]"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ราคาต่อหน่วย (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 45"
                    value={adHocPrice}
                    onChange={(e) => setAdHocPrice(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdHocModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddAdHocItem}
                  className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C26243] text-white text-xs font-bold shadow-soft transition-smooth"
                >
                  เพิ่มรายการเข้าใบตรวจรับ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: บันทึกรับเงินงวดงบประมาณ */}
        {showAddIncomeModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-floating border border-[#E7E4DC]">
              <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#1F5E4B]" />
                บันทึกรายรับเงินงวดงบประมาณ
              </h3>
              <p className="text-xs text-[#66746C] mt-1">
                บันทึกเงินอุดหนุนที่ได้รับการโอนเข้าบัญชีโรงเรียนในแต่ละรอบ (อปท. หรือ สพฐ.)
              </p>

              {/* Quick Auto-Fill Round 1 Banner */}
              <div className="mt-3.5 p-3 rounded-2xl bg-[#F2F8F5] border border-[#C7E2D6] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1F5E4B] truncate">
                    {currentRoundTitle}
                  </span>
                  <span className="font-extrabold text-[#1F5E4B] font-mono tabular-nums shrink-0 ml-2">
                    {installmentBudgetAllocation.toLocaleString()} ฿
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIncomeName(
                      `รับเงินจัดสรรงบอาหารกลางวัน ${currentRoundTitle} (${studentCount} คน × ${subsidyPerHead} บ. × ${daysPerInstallment} วัน)`
                    );
                    setIncomeAmount(installmentBudgetAllocation.toString());
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-white border border-[#C7E2D6] text-xs font-bold text-[#1F5E4B] hover:bg-[#EBF4F0] transition-smooth flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1F5E4B]" />
                  <span>คลิกกรอกค่างวดที่ 1 ({installmentBudgetAllocation.toLocaleString()} ฿) อัตโนมัติ</span>
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#18201C] block">วันที่รับเงินงบประมาณ:</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setIncomeDate(settings.currentRoundStartDate || "2026-11-02")}
                        className="text-[#1F5E4B] hover:underline font-semibold"
                      >
                        วันเริ่มงวด (2 พ.ย. 69)
                      </button>
                      <span className="text-[#8C9890]">|</span>
                      <button
                        type="button"
                        onClick={() => setIncomeDate(new Date().toISOString().split("T")[0])}
                        className="text-[#1F5E4B] hover:underline font-semibold"
                      >
                        วันนี้
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={toISODate(incomeDate)}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                  <span className="text-[11px] text-[#66746C] mt-0.5 block">
                    แสดงในรายงานเป็น: {formatThaiDateShort(incomeDate)}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อรายการงบประมาณ:</label>
                  <input
                    type="text"
                    value={incomeName}
                    onChange={(e) => setIncomeName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">จำนวนเงินที่ได้รับรอบนี้ (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 99000"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddIncomeModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddIncome}
                  className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shadow-soft transition-smooth"
                >
                  บันทึกรับเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: บันทึกรายจ่ายนอก */}
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-floating border border-[#E7E4DC]">
              <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#D97757]" />
                บันทึกรายจ่ายดำเนินการ (รายการนอก)
              </h3>
              <p className="text-xs text-[#66746C] mt-1">
                บันทึกค่าใช้จ่ายจำเป็นอื่นๆ ที่ไม่ใช่ค่าอาหารสด เช่น ค่าก๊าซหุงต้ม ค่าจ้างแม่ครัว
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#18201C] block">วันที่จ่ายเงินจริง:</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setExpenseDate(new Date().toISOString().split("T")[0])}
                        className="text-[#D97757] hover:underline font-semibold"
                      >
                        วันนี้
                      </button>
                      <span className="text-[#8C9890]">|</span>
                      <button
                        type="button"
                        onClick={() => setExpenseDate(settings.currentRoundStartDate || "2026-11-02")}
                        className="text-[#D97757] hover:underline font-semibold"
                      >
                        วันเริ่มงวด (2 พ.ย. 69)
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={toISODate(expenseDate)}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  />
                  <span className="text-[11px] text-[#66746C] mt-0.5 block">
                    แสดงในรายงานเป็น: {formatThaiDateShort(expenseDate)}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">หมวดหมู่ค่าใช้จ่าย:</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  >
                    <option value="ค่าก๊าซหุงต้มและเชื้อเพลิง">ค่าก๊าซหุงต้มและเชื้อเพลิง</option>
                    <option value="ค่าจ้างแม่ครัว">ค่าจ้างเหมาผู้ประกอบอาหาร (แม่ครัว)</option>
                    <option value="ค่าวัสดุทำความสะอาดและเครื่องใช้">ค่าวัสดุทำความสะอาด/อุปกรณ์ครัว</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">รายละเอียดรายการ:</label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">จำนวนเงิน (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 450"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition-smooth"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C26243] text-white text-xs font-bold shadow-soft transition-smooth"
                >
                  บันทึกจ่ายเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: แก้ไขรายการบัญชี (Edit Transaction) */}
        {showEditTxModal && editingTx && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-floating border border-[#E7E4DC] space-y-4">
              <div className="flex items-center justify-between border-b border-[#ECE8DE] pb-3">
                <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[#1F5E4B]" />
                  <span>แก้ไขรายการบัญชี ({editingTx.documentNo})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditTxModal(false)}
                  className="p-1 rounded-lg text-[#8C9890] hover:text-[#18201C] transition-smooth"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">วันที่ทำรายการ:</label>
                    <input
                      type="date"
                      value={editTxDate}
                      onChange={(e) => setEditTxDate(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    />
                    <span className="text-[10px] text-[#66746C] mt-0.5 block">
                      {formatThaiDateShort(editTxDate)}
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">เลขที่เอกสาร:</label>
                    <input
                      type="text"
                      value={editTxDocNo}
                      onChange={(e) => setEditTxDocNo(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">ประเภทรายการ:</label>
                    <select
                      value={editTxType}
                      onChange={(e) => setEditTxType(e.target.value as "INCOME" | "EXPENSE")}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    >
                      <option value="EXPENSE">รายจ่าย (-)</option>
                      <option value="INCOME">รายรับ (+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">หมวดหมู่:</label>
                    <input
                      type="text"
                      value={editTxCategory}
                      onChange={(e) => setEditTxCategory(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">รายละเอียดรายการ:</label>
                  <input
                    type="text"
                    value={editTxDesc}
                    onChange={(e) => setEditTxDesc(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">จำนวนเงิน (บาท):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTxAmount}
                    onChange={(e) => setEditTxAmount(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-black font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-[#ECE8DE]">
                <button
                  type="button"
                  onClick={() => setShowEditTxModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditTransaction}
                  className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shadow-soft transition-smooth flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: สร้างเมนูใหม่ */}
        {showNewMenuModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-floating border border-[#E7E4DC]">
              <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1F5E4B]" />
                เพิ่มเมนูอาหารกลางวันใหม่
              </h3>
              <p className="text-xs text-[#66746C] mt-1">
                สร้างสูตรอาหารและระบุส่วนประกอบวัตถุดิบสำหรับใช้จัดซื้อในโรงเรียน
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อเมนู:</label>
                  <input
                    type="text"
                    placeholder="เช่น ต้มจืดฟักน่องไก่, ผัดซีอิ๊วหมู"
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">หมวดหมู่อาหาร:</label>
                  <select
                    value={newMenuCategory}
                    onChange={(e) => setNewMenuCategory(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  >
                    <option>อาหารจานเดียว</option>
                    <option>กับข้าว</option>
                    <option>ของหวาน/ผลไม้</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewMenuModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewMenu}
                  className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shadow-soft transition-smooth flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-[#EAD598]" />
                  <span>บันทึกเมนูลง Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: เพิ่มวัตถุดิบในเมนู ({activeDayDefinition.label}) */}
        {showAddIngredientModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-floating border border-[#E7E4DC]">
              <h3 className="text-base font-extrabold text-[#18201C] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1F5E4B]" />
                เพิ่มวัตถุดิบในเมนู ({activeDayDefinition.label})
              </h3>
              <p className="text-xs text-[#66746C] mt-1">
                กำหนดรายการวัตถุดิบ ปริมาณที่ต้องสั่ง และราคาต่อหน่วยสำหรับเมนู{activeDayDefinition.label}
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ชื่อวัตถุดิบ:</label>
                  <input
                    type="text"
                    placeholder="เช่น น่องไก่สด, ไข่เค็ม, พริกแกงเผ็ด"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">จำนวนที่สั่ง:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newIngQty}
                      onChange={(e) => setNewIngQty(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#18201C] block mb-1">
                      หน่วย (พิมพ์เองได้):
                    </label>
                    <input
                      type="text"
                      list="unit-suggestions"
                      placeholder="พิมพ์เอง เช่น กก., กำ, ถุง"
                      value={newIngUnit}
                      onChange={(e) => setNewIngUnit(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                    />
                    <datalist id="unit-suggestions">
                      <option value="กก." />
                      <option value="ขวด" />
                      <option value="ฟอง" />
                      <option value="ถุง" />
                      <option value="แผง" />
                      <option value="มัด" />
                      <option value="กำ" />
                      <option value="ห่อ" />
                      <option value="กล่อง" />
                      <option value="ชิ้น" />
                      <option value="ลิตร" />
                    </datalist>

                    {/* Quick selection chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["กก.", "ขวด", "ฟอง", "ถุง", "แผง", "มัด", "กำ", "ห่อ"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewIngUnit(u)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-smooth ${
                            newIngUnit === u
                              ? "bg-[#1F5E4B] text-white border-[#1F5E4B]"
                              : "bg-[#F4F2EB] text-[#66746C] border-[#E7E4DC] hover:bg-[#EAE6DC]"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#18201C] block mb-1">ราคาต่อหน่วย (บาท):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="เช่น 85, 30, 4.2"
                    value={newIngPrice}
                    onChange={(e) => setNewIngPrice(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono tabular-nums text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddIngredientModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddNewDailyIngredient}
                  className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shadow-soft transition-smooth"
                >
                  เพิ่มรายการวัตถุดิบ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 6: นำเข้ารายการอาหารและวัตถุดิบจาก Excel */}
        {showExcelImportModal && (
          <div className="fixed inset-0 z-50 bg-[#18201C]/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-floating border border-[#E7E4DC] my-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#ECE8DE]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#EBF4F0] text-[#1F5E4B] border border-[#C7E2D6]">
                    <FileSpreadsheet className="w-5 h-5 text-[#1F5E4B]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#18201C]">
                      นำเข้ารายการอาหารและวัตถุดิบจาก Excel
                    </h3>
                    <p className="text-xs text-[#66746C] mt-0.5">
                      รองรับไฟล์ .xlsx, .xls และ .csv สำหรับจัดซื้ออาหารกลางวัน
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExcelImportModal(false)}
                  className="p-1.5 rounded-xl text-[#8C9890] hover:text-[#18201C] hover:bg-[#F4F2EB] transition-smooth"
                  aria-label="ปิดหน้าต่างนำเข้า Excel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Dropzone & Template Download Button */}
              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  ref={excelFileInputRef}
                  onChange={handleExcelFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div
                  onClick={() => excelFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#C7E2D6] hover:border-[#1F5E4B] bg-[#F2F8F5]/50 hover:bg-[#F2F8F5] rounded-2xl p-6 text-center cursor-pointer transition-smooth flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="p-3 rounded-full bg-white shadow-soft group-hover:scale-105 transition-transform text-[#1F5E4B] border border-[#C7E2D6]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#18201C] block">
                      {isProcessingExcel
                        ? "กำลังประมวลผลไฟล์..."
                        : excelUploadedFileName
                        ? `ไฟล์ที่เลือก: ${excelUploadedFileName}`
                        : "คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่"}
                    </span>
                    <span className="text-[11px] text-[#66746C] block mt-0.5">
                      รองรับไฟล์ .xlsx, .xls, .csv (หัวตาราง: ชื่อวัตถุดิบ, จำนวน, หน่วยนับ, ราคาต่อหน่วย)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <span className="text-[#66746C] text-[11px]">ยังไม่มีไฟล์ตัวอย่าง?</span>
                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate()}
                    className="inline-flex items-center gap-1.5 text-[#1F5E4B] hover:text-[#143B30] font-bold text-xs bg-[#EBF4F0] hover:bg-[#DDF0E7] px-3.5 py-1.5 rounded-xl border border-[#C7E2D6] transition-smooth shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1F5E4B]" />
                    <span>ดาวน์โหลดแบบฟอร์ม Excel ตัวอย่าง (.xlsx)</span>
                  </button>
                </div>

                {/* Error Banner */}
                {excelErrorMessage && (
                  <div className="bg-[#FDF4F0] border border-[#F2D7CA] text-[#B55232] p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D97757] shrink-0" />
                    <span>{excelErrorMessage}</span>
                  </div>
                )}

                {/* Settings: Target Day, Mode, and Menu Name */}
                <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-4 space-y-3 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-[#18201C] block mb-1">
                        นำเข้าข้อมูลไปยัง:
                      </label>
                      <select
                        value={excelTargetDay}
                        onChange={(e) => setExcelTargetDay(e.target.value as DayKey | "PRESET")}
                        className="w-full bg-white border border-[#E7E4DC] rounded-xl px-3.5 py-2 font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] shadow-2xs transition-smooth"
                      >
                        {DAY_DEFINITIONS.map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.label} {d.key === selectedDayKey ? "(วันที่เลือกอยู่ขณะนี้)" : ""}
                          </option>
                        ))}
                        <option value="PRESET">💾 บันทึกเป็นสูตรต้นแบบใหม่ (Preset Recipe)</option>
                      </select>
                    </div>

                    {excelTargetDay !== "PRESET" && (
                      <div>
                        <label className="font-bold text-[#18201C] block mb-1">
                          รูปแบบการใส่ข้อมูล:
                        </label>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-[#18201C]">
                            <input
                              type="radio"
                              name="excelMode"
                              checked={excelImportMode === "replace"}
                              onChange={() => setExcelImportMode("replace")}
                              className="accent-[#1F5E4B]"
                            />
                            <span>แทนที่รายการเดิม</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-[#18201C]">
                            <input
                              type="radio"
                              name="excelMode"
                              checked={excelImportMode === "append"}
                              onChange={() => setExcelImportMode("append")}
                              className="accent-[#1F5E4B]"
                            />
                            <span>เพิ่มต่อท้ายรายการเดิม</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-[#18201C] block mb-1 text-xs">
                      ชื่อเมนูอาหารกลางวัน:
                    </label>
                    <input
                      type="text"
                      value={excelMenuName}
                      onChange={(e) => setExcelMenuName(e.target.value)}
                      placeholder="เช่น ข้าวมันไก่ตอน, แกงกะทิไก่ฟักทอง, ข้าวผัดไข่"
                      className="w-full bg-white border border-[#E7E4DC] rounded-xl px-3.5 py-2 text-xs font-bold text-[#18201C] placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] shadow-2xs transition-smooth"
                    />
                  </div>
                </div>

                {/* Data Preview */}
                {excelImportResult && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between bg-[#1F5E4B] text-white rounded-2xl px-5 py-3.5 shadow-soft">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#A3C7B9] block">
                          รายการที่อ่านได้จาก Excel
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-[#EAD598]">
                            ✓ สมบูรณ์ {excelImportResult.validCount} รายการ
                          </span>
                          {excelImportResult.invalidCount > 0 && (
                            <span className="text-xs font-bold text-[#F4B49F]">
                              ⚠️ ไม่สมบูรณ์ {excelImportResult.invalidCount} รายการ
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#A3C7B9] block">
                          ยอดเงินรวมวัตถุดิบ
                        </span>
                        <span className="text-lg font-black font-mono tabular-nums text-white">
                          {excelImportResult.totalCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </span>
                      </div>
                    </div>

                    <div className="border border-[#E7E4DC] rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs text-[#18201C]">
                        <thead className="bg-[#FAF9F6] text-[#66746C] font-bold border-b border-[#E7E4DC] sticky top-0 text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">รายการวัตถุดิบ</th>
                            <th className="py-2.5 px-3 text-center">จำนวน</th>
                            <th className="py-2.5 px-3 text-center">หน่วย</th>
                            <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                            <th className="py-2.5 px-3 text-right">รวมเงิน (฿)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0ECE4]">
                          {excelImportResult.items.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={item.isValid ? "hover:bg-[#FAF9F6]/80 transition-smooth" : "bg-[#FDF4F0]"}
                            >
                              <td className="py-2 px-3 text-center font-mono tabular-nums text-[11px] text-[#8C9890]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-bold text-[#18201C]">
                                {item.name}
                                {item.validationError && (
                                  <span className="block text-[10px] font-normal text-[#B55232]">
                                    {item.validationError}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono tabular-nums">{item.qty}</td>
                              <td className="py-2 px-3 text-center text-[#66746C]">{item.unit}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {item.unitPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2 px-3 text-right font-bold font-mono tabular-nums text-[#18201C]">
                                {item.totalPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[#ECE8DE]">
                <button
                  type="button"
                  onClick={() => setShowExcelImportModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-xs font-bold text-[#66746C] hover:bg-[#FAF9F6] transition-smooth"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={!excelImportResult || excelImportResult.validCount === 0 || isProcessingExcel}
                  onClick={handleConfirmExcelImport}
                  className="px-5 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-smooth flex items-center gap-2 shadow-soft"
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันการนำเข้า ({excelImportResult?.validCount || 0} รายการ)</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL 7: แบบฟอร์มเอกสารรายงานราชการ (Official Report Suite) */}
        <OfficialReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          initialFormType={reportFormType}
          settings={settings}
          selectedDayKey={selectedDayKey}
          activeDayDefinition={activeDayDefinition}
          activeDayPlan={activeDayPlan}
          inspectionItems={inspectionItems}
          weeklyPlan={weeklyPlan}
          financialTransactions={transactions}
          receivingDocNo={receivingDocNo}
          confirmedAtTime={confirmedAtTime}
        />
        {/* MODAL 8: คู่มือแนะนำการติดตั้งแอปบนหน้าจอมือถือ (Mobile PWA Guide) */}
        <MobileInstallGuideModal
          isOpen={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
        />
      </main>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (iOS / VERCEL AESTHETIC - SHOWN ON < md) */}
      {/* ========================================================================= */}
      <nav
        aria-label="เมนูหลักสำหรับมือถือ"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E7E4DC] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 py-1.5 flex justify-around items-center safe-area-bottom"
      >
        <button
          type="button"
          onClick={() => setActiveTab("KITCHEN_HUD")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === "KITCHEN_HUD"
              ? "text-[#1F5E4B] font-extrabold"
              : "text-[#8C9890] hover:text-[#18201C] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "KITCHEN_HUD" ? "bg-[#F2F8F5] text-[#1F5E4B]" : ""}`}>
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">ตรวจรับ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MENU_PLAN")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === "MENU_PLAN"
              ? "text-[#1F5E4B] font-extrabold"
              : "text-[#8C9890] hover:text-[#18201C] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "MENU_PLAN" ? "bg-[#F2F8F5] text-[#1F5E4B]" : ""}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">เมนู</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ANALYTICS")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === "ANALYTICS"
              ? "text-[#1F5E4B] font-extrabold"
              : "text-[#8C9890] hover:text-[#18201C] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "ANALYTICS" ? "bg-[#F2F8F5] text-[#1F5E4B]" : ""}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">งบประมาณ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("FINANCE_LEDGER")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === "FINANCE_LEDGER"
              ? "text-[#1F5E4B] font-extrabold"
              : "text-[#8C9890] hover:text-[#18201C] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "FINANCE_LEDGER" ? "bg-[#F2F8F5] text-[#1F5E4B]" : ""}`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">สมุดบัญชี</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SETTINGS")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === "SETTINGS"
              ? "text-[#1F5E4B] font-extrabold"
              : "text-[#8C9890] hover:text-[#18201C] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === "SETTINGS" ? "bg-[#F2F8F5] text-[#1F5E4B]" : ""}`}>
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">ตั้งค่า</span>
        </button>
      </nav>
    </div>
  );
}

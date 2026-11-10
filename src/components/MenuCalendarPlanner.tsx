"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  Edit3,
  UtensilsCrossed,
  Sparkles,
  BookOpen,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import {
  DayPlan,
  PresetMenu,
  SchoolSettings,
  DayKey,
  MenuItem,
  formatThaiDateFull,
  formatThaiDateShort,
} from "../lib/storage";

interface MenuCalendarPlannerProps {
  datePlans: Record<string, DayPlan>;
  onUpdateDatePlan: (dateStr: string, plan: DayPlan) => void;
  presetMenus: PresetMenu[];
  settings: SchoolSettings;
  onSelectDateForDetail: (dateStr: string, dayKey?: DayKey) => void;
  onSaveNewPreset?: (preset: PresetMenu) => void;
}

// Thai Month Names
const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export default function MenuCalendarPlanner({
  datePlans,
  onUpdateDatePlan,
  presetMenus,
  settings,
  onSelectDateForDetail,
  onSaveNewPreset,
}: MenuCalendarPlannerProps) {
  // Calendar Navigation State
  // Default to November 2026 (Month index 10) matching Round 1 (Nov 2 - Nov 27, 2026)
  const defaultYear = 2026;
  const defaultMonth = 10; // 0-indexed (10 = November)
  const [currentYear, setCurrentYear] = useState<number>(defaultYear);
  const [currentMonth, setCurrentMonth] = useState<number>(defaultMonth);

  // Modal State for Date Menu Selection
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ทั้งหมด");

  // Custom Menu Form inside Modal
  const [customMenuName, setCustomMenuName] = useState("");
  const [customCategory, setCustomCategory] = useState("อาหารจานเดียว");
  const [saveAlsoAsPreset, setSaveAlsoAsPreset] = useState(false);

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Round 1 Boundary Check
  const roundStart = settings.currentRoundStartDate || "2026-11-02";
  const roundEnd = settings.currentRoundEndDate || "2026-11-27";
  const studentCount = settings.studentCount || 86;
  const subsidyPerHead = settings.subsidyPerHead || 27;
  const daysPerRound = settings.daysPerInstallment || 20;
  const roundAllocation = studentCount * subsidyPerHead * daysPerRound;

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      dayOfWeek: number;
      isWeekend: boolean;
      isInRound: boolean;
      roundDayIndex?: number;
    }[] = [];

    // Pre-padding empty days from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const d = String(prevDate.getDate()).padStart(2, "0");
      days.push({
        dateStr: `${y}-${m}-${d}`,
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
        dayOfWeek: prevDate.getDay(),
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
        isInRound: false,
      });
    }

    // Days in current month
    let roundCounter = 0;
    for (let day = 1; day <= totalDays; day++) {
      const curDate = new Date(currentYear, currentMonth, day);
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, "0");
      const d = String(curDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const dayOfWeek = curDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isInRound = !isWeekend && dateStr >= roundStart && dateStr <= roundEnd;
      if (isInRound) {
        roundCounter += 1;
      }

      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        dayOfWeek,
        isWeekend,
        isInRound,
        roundDayIndex: isInRound ? roundCounter : undefined,
      });
    }

    // Post-padding to complete the last week grid (total multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(nextDate.getDate()).padStart(2, "0");
      days.push({
        dateStr: `${y}-${m}-${d}`,
        dayNum: nextDate.getDate(),
        isCurrentMonth: false,
        dayOfWeek: nextDate.getDay(),
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
        isInRound: false,
      });
    }

    return days;
  }, [currentYear, currentMonth, roundStart, roundEnd]);

  // Round Progress Metrics
  const roundMetrics = useMemo(() => {
    let plannedCount = 0;
    let totalPlannedCost = 0;
    let confirmedCount = 0;

    for (const [dateStr, plan] of Object.entries(datePlans)) {
      if (dateStr >= roundStart && dateStr <= roundEnd && plan?.menuName) {
        plannedCount += 1;
        const dayCost = (plan.ingredients || []).reduce(
          (sum, ing) => sum + Number((ing.qty * ing.unitPrice).toFixed(2)),
          0
        );
        totalPlannedCost += dayCost;
        if (plan.isReceivingConfirmed) {
          confirmedCount += 1;
        }
      }
    }

    return {
      plannedCount,
      totalPlannedCost,
      confirmedCount,
      percentPlanned: Math.min(100, Math.round((plannedCount / daysPerRound) * 100)),
    };
  }, [datePlans, roundStart, roundEnd, daysPerRound]);

  // Group days into weeks for mobile agenda view (< md screens)
  const calendarWeeks = useMemo(() => {
    const weeks: Array<{
      weekIndex: number;
      schoolDays: typeof calendarDays;
      label: string;
      dateRangeLabel: string;
      totalCost: number;
      plannedDaysCount: number;
    }> = [];

    for (let i = 0; i < calendarDays.length; i += 7) {
      const weekChunk = calendarDays.slice(i, i + 7);
      // School days in current month (Monday - Friday)
      const schoolDays = weekChunk.filter((d) => !d.isWeekend && d.isCurrentMonth);
      if (schoolDays.length === 0) continue;

      const firstDay = schoolDays[0];
      const lastDay = schoolDays[schoolDays.length - 1];
      const monthName = THAI_MONTH_NAMES[currentMonth] || "";
      const dateRangeLabel = `${firstDay.dayNum} – ${lastDay.dayNum} ${monthName}`;
      const label = `สัปดาห์ที่ ${weeks.length + 1}`;

      let totalCost = 0;
      let plannedDaysCount = 0;
      schoolDays.forEach((d) => {
        const p = datePlans[d.dateStr];
        if (p?.menuName) {
          plannedDaysCount += 1;
          const cost = (p.ingredients || []).reduce(
            (sum, ing) => sum + Number((ing.qty * ing.unitPrice).toFixed(2)),
            0
          );
          totalCost += cost;
        }
      });

      weeks.push({
        weekIndex: weeks.length,
        schoolDays,
        label,
        dateRangeLabel,
        totalCost,
        plannedDaysCount,
      });
    }

    return weeks;
  }, [calendarDays, datePlans, currentMonth]);

  const [activeMobileWeekIdx, setActiveMobileWeekIdx] = useState<number>(0);

  // Filtered Presets for Modal
  const filteredPresets = useMemo(() => {
    return presetMenus.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.ingredients || []).some((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat =
        selectedCategoryFilter === "ทั้งหมด" || m.category === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [presetMenus, searchQuery, selectedCategoryFilter]);

  // Handle Menu Assignment from Preset
  const handleAssignPreset = (preset: PresetMenu) => {
    if (!selectedDateForModal) return;

    const clonedIngs = (preset.ingredients || []).map((ing) => ({
      ...ing,
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    const existing = datePlans[selectedDateForModal] || {
      menuName: "",
      category: "อาหารจานเดียว",
      ingredients: [],
    };

    const updatedPlan: DayPlan = {
      ...existing,
      menuName: preset.name,
      category: preset.category || "อาหารจานเดียว",
      ingredients: clonedIngs,
      inspectionDate: selectedDateForModal,
      isFrozen: false,
    };

    onUpdateDatePlan(selectedDateForModal, updatedPlan);
    showToast(`✓ กำหนดเมนู "${preset.name}" (${clonedIngs.length} วัตถุดิบ) ลงในวันที่เรียบร้อยแล้ว`);
    setSelectedDateForModal(null);
  };

  // Handle Custom Menu Assignment
  const handleAssignCustom = () => {
    if (!selectedDateForModal || !customMenuName.trim()) return;

    const trimmed = customMenuName.trim();
    const existing = datePlans[selectedDateForModal] || {
      menuName: "",
      category: "อาหารจานเดียว",
      ingredients: [],
    };

    // Use existing ingredients if already customized for this day, otherwise supply starter template
    const ingredientsToUse: MenuItem[] =
      existing.ingredients && existing.ingredients.length > 0
        ? existing.ingredients
        : [
            { id: `ing-${Date.now()}-1`, name: "เนื้อสัตว์หลัก (ไก่/หมู)", qty: 7.0, unit: "กก.", unitPrice: 100 },
            { id: `ing-${Date.now()}-2`, name: "ผักสดตามฤดูกาล", qty: 5.0, unit: "กก.", unitPrice: 30 },
            { id: `ing-${Date.now()}-3`, name: "ข้าวสารหอมมะลิ", qty: 8.5, unit: "กก.", unitPrice: 38 },
            { id: `ing-${Date.now()}-4`, name: "เครื่องปรุงรส", qty: 1.0, unit: "ขวด", unitPrice: 45 },
          ];

    const updatedPlan: DayPlan = {
      ...existing,
      menuName: trimmed,
      category: customCategory,
      ingredients: ingredientsToUse,
      inspectionDate: selectedDateForModal,
      isFrozen: false,
    };

    onUpdateDatePlan(selectedDateForModal, updatedPlan);

    // If requested, also save as a preset recipe for future reuse
    if (saveAlsoAsPreset && onSaveNewPreset) {
      const newPreset: PresetMenu = {
        id: `preset-${Date.now()}`,
        name: trimmed,
        category: customCategory,
        ingredients: ingredientsToUse.map((i) => ({ ...i })),
      };
      onSaveNewPreset(newPreset);
    }

    showToast(`✓ บันทึกเมนู "${trimmed}" สำหรับวันที่เรียบร้อยแล้ว`);
    setCustomMenuName("");
    setSelectedDateForModal(null);
  };

  // Handle Clear Menu for Date
  const handleClearDateMenu = () => {
    if (!selectedDateForModal) return;
    if (confirm("ต้องการล้างเมนูอาหารของวันนี้ใช่หรือไม่?")) {
      const updatedPlan: DayPlan = {
        menuName: "",
        category: "อาหารจานเดียว",
        ingredients: [],
        inspectionDate: selectedDateForModal,
        isFrozen: false,
        isReceivingConfirmed: false,
      };
      onUpdateDatePlan(selectedDateForModal, updatedPlan);
      showToast("ล้างรายการอาหารของวันนี้เรียบร้อย");
      setSelectedDateForModal(null);
    }
  };

  // Food Emoji Decorator
  const getFoodEmoji = (name: string, category: string) => {
    const n = name.toLowerCase();
    if (n.includes("ก๋วยเตี๋ยว") || n.includes("เส้น") || n.includes("บะหมี่") || n.includes("กวยจั๊บ") || n.includes("ก๋วยจั๊บ")) return "🍜";
    if (n.includes("ข้าวมันไก่") || n.includes("ไก่")) return "🍗";
    if (n.includes("ข้าวผัด")) return "🍳";
    if (n.includes("แกง") || n.includes("ต้ม") || n.includes("ซุป")) return "🍲";
    if (n.includes("ผัด")) return "🍝";
    if (category === "ของหวาน/ผลไม้" || n.includes("หวาน") || n.includes("ผลไม้")) return "🍉";
    return "🍛";
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#1F5E4B] text-white p-3.5 rounded-2xl shadow-soft flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#EAD598]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Executive Summary & Month Navigator Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E4DC] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DE] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-2xl border border-[#E7E4DC]">
              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear((y) => y - 1);
                  } else {
                    setCurrentMonth((m) => m - 1);
                  }
                }}
                className="w-8 h-8 rounded-xl hover:bg-white text-gray-700 font-bold flex items-center justify-center transition-smooth"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear((y) => y + 1);
                  } else {
                    setCurrentMonth((m) => m + 1);
                  }
                }}
                className="w-8 h-8 rounded-xl hover:bg-white text-gray-700 font-bold flex items-center justify-center transition-smooth"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-[#18201C] flex items-center gap-2">
                <span>
                  {THAI_MONTH_NAMES[currentMonth]} {currentYear + 543}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FAF9F6] text-[#4B5850] border border-[#E7E4DC]">
                  ภาคเรียนที่ {settings.semester} / {settings.academicYear}
                </span>
              </h2>
              <p className="text-xs text-[#1F5E4B] font-semibold flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#EAD598]" />
                <span>
                  {settings.currentRoundTitle || "งวดที่ 1"} ({daysPerRound} วันทำการ • {studentCount} คน × {subsidyPerHead} ฿)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentYear(defaultYear);
                setCurrentMonth(defaultMonth);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-xs font-bold text-[#4B5850] hover:bg-white hover:border-[#1F5E4B] transition-smooth"
            >
              กลับหน้างวดที่ 1 (พ.ย. 69)
            </button>

            <div className="bg-[#FAF9F6] px-3.5 py-1.5 rounded-2xl border border-[#E7E4DC] text-right">
              <span className="text-[10px] text-[#8C9890] block font-semibold">จัดเมนูแล้ว</span>
              <span className="text-xs font-extrabold text-[#1F5E4B] font-mono">
                {roundMetrics.plannedCount} / {daysPerRound} วัน ({roundMetrics.percentPlanned}%)
              </span>
            </div>

            <div className="bg-[#FAF9F6] px-3.5 py-1.5 rounded-2xl border border-[#E7E4DC] text-right">
              <span className="text-[10px] text-[#8C9890] block font-semibold">งบจัดสรรรวมต่องวด</span>
              <span className="text-xs font-extrabold text-[#18201C] font-mono">
                {roundAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
              </span>
            </div>
          </div>
        </div>

        {/* Operational Guidelines Callout */}
        <div className="p-3 bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl flex items-start gap-2 text-xs text-[#1F5E4B]">
          <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-[#1F5E4B]" />
          <div>
            <strong className="block font-bold">หลักการวางแผนอาหารยืดหยุ่นรายวัน (Real-World Flexible Planner):</strong>
            <span className="text-[#386858]">
              เมนูอาหารแต่ละสัปดาห์ไม่จำเป็นต้องซ้ำกัน • เมื่อคลิกเลือกวัน คุณครูสามารถดึงสูตรจากคลังมาเป็นตัวตั้งต้น และปรับเปลี่ยนวัตถุดิบตามของสดที่มีในตลาดจริงได้ 100% โดยไม่ส่งผลกระทบต่อสูตรต้นแบบ
            </span>
          </div>
        </div>

        {/* 2. Interactive Calendar Grid (7 Columns - Desktop & Tablet) */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {/* Weekday Columns */}
          <div className="text-center py-2 text-xs font-extrabold text-red-500">อาทิตย์</div>
          <div className="text-center py-2 text-xs font-extrabold text-amber-700">จันทร์</div>
          <div className="text-center py-2 text-xs font-extrabold text-pink-700">อังคาร</div>
          <div className="text-center py-2 text-xs font-extrabold text-emerald-800">พุธ</div>
          <div className="text-center py-2 text-xs font-extrabold text-orange-700">พฤหัสบดี</div>
          <div className="text-center py-2 text-xs font-extrabold text-blue-800">ศุกร์</div>
          <div className="text-center py-2 text-xs font-extrabold text-purple-700">เสาร์</div>

          {calendarDays.map((day, idx) => {
            const plan = datePlans[day.dateStr];
            const hasMenu = Boolean(plan?.menuName);
            const ingredientCount = (plan?.ingredients || []).length;
            const dayCost = (plan?.ingredients || []).reduce(
              (sum, ing) => sum + Number((ing.qty * ing.unitPrice).toFixed(2)),
              0
            );

            // Weekend Cell
            if (day.isWeekend) {
              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  className={`min-h-[105px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-smooth ${
                    day.isCurrentMonth
                      ? "bg-[#FAF9F6]/80 border-[#EFECE6] text-[#A2A9A4]"
                      : "bg-[#F5F4EE]/50 border-transparent text-[#CBD2CD] opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold">{day.dayNum}</span>
                    <span className="text-[10px] text-[#A2A9A4]">วันหยุด</span>
                  </div>
                  <div className="text-[11px] text-center text-[#B0B7B2] font-medium py-2">
                    ปิดทำการ
                  </div>
                  <div className="text-[9px] text-[#B0B7B2] text-center">ไม่มีจัดเลี้ยงอาหาร</div>
                </div>
              );
            }

            // Outside Round 1 School Days (Fully Interactive & Clickable for planning ahead!)
            if (!day.isInRound) {
              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => setSelectedDateForModal(day.dateStr)}
                  className={`min-h-[105px] p-2.5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between shadow-2xs ${
                    hasMenu
                      ? "bg-white border-[#E7E4DC] hover:border-[#1F5E4B] hover:shadow-card"
                      : "bg-[#FCFBF8] border-dashed border-[#1F5E4B]/30 hover:border-[#1F5E4B] hover:bg-[#F2F8F5]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#4B5850] group-hover:text-[#1F5E4B]">{day.dayNum}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">นอกงวดหลัก</span>
                  </div>
                  {hasMenu ? (
                    <div className="mt-1">
                      <div className="text-xs font-bold text-[#18201C] group-hover:text-[#1F5E4B] line-clamp-2 leading-snug">
                        <span className="mr-1">{getFoodEmoji(plan.menuName, plan.category)}</span>
                        <span>{plan.menuName}</span>
                      </div>
                      <span className="text-[10px] text-[#66746C] block mt-0.5 truncate">
                        {plan.category || "อาหารจานเดียว"}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-xs font-bold text-[#1F5E4B] flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                        <span>เลือกเมนู</span>
                      </span>
                      <span className="text-[9px] text-[#8C9890] block mt-0.5">คลิกเพื่อกำหนด</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-[#F0ECE4] flex items-center justify-between text-[10px] text-[#66746C] font-mono">
                    <span>{hasMenu ? `${ingredientCount} รายการ` : "-"}</span>
                    <span className={`font-bold ${hasMenu ? "text-[#1F5E4B]" : "text-[#8C9890]"}`}>
                      {hasMenu ? `${dayCost.toLocaleString()} ฿` : "0 ฿"}
                    </span>
                  </div>
                </div>
              );
            }

            // In Round 1 Active School Day (Clickable!)
            return (
              <div
                key={`${day.dateStr}-${idx}`}
                onClick={() => setSelectedDateForModal(day.dateStr)}
                className={`min-h-[120px] p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between shadow-2xs ${
                  hasMenu
                    ? "bg-white border-[#E7E4DC] hover:border-[#1F5E4B] hover:shadow-card"
                    : "bg-[#FCFBF8] border-dashed border-[#1F5E4B]/40 hover:border-[#1F5E4B] hover:bg-[#F2F8F5]/60 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-extrabold text-[#18201C] group-hover:text-[#1F5E4B]">
                        {day.dayNum}
                      </span>
                      {day.roundDayIndex && (
                        <span className="text-[9px] px-1 rounded bg-[#EBF4F0] text-[#1F5E4B] font-bold">
                          ว.{day.roundDayIndex}
                        </span>
                      )}
                    </div>

                    {hasMenu ? (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          plan.isReceivingConfirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : plan.isFrozen
                            ? "bg-blue-100 text-blue-800"
                            : "bg-[#EBF4F0] text-[#1F5E4B]"
                        }`}
                      >
                        {plan.isReceivingConfirmed
                          ? "✓ ตรวจรับแล้ว"
                          : plan.isFrozen
                          ? "🔒 ตรึงแล้ว"
                          : "วางแผนแล้ว"}
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-[#D97757] bg-[#FDF4F0] px-1.5 py-0.5 rounded-md">
                        รอจัดเมนู
                      </span>
                    )}
                  </div>

                  {/* Menu Title or Placeholder */}
                  {hasMenu ? (
                    <div className="mt-1">
                      <div className="text-xs font-bold text-[#18201C] group-hover:text-[#1F5E4B] line-clamp-2 leading-snug">
                        <span className="mr-1">{getFoodEmoji(plan.menuName, plan.category)}</span>
                        <span>{plan.menuName}</span>
                      </div>
                      <span className="text-[10px] text-[#66746C] block mt-0.5 truncate">
                        {plan.category || "อาหารจานเดียว"}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-2.5">
                      <span className="text-xs font-bold text-[#1F5E4B] flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                        <span>เลือกเมนู</span>
                      </span>
                      <span className="text-[9px] text-[#8C9890] block mt-0.5">คลิกเพื่อดึงสูตร</span>
                    </div>
                  )}
                </div>

                {/* Footer Cost and Details */}
                <div className="pt-1.5 border-t border-[#F0ECE4] flex items-center justify-between text-[10px] text-[#66746C] font-mono">
                  <span>{hasMenu ? `${ingredientCount} รายการ` : "-"}</span>
                  <span className={`font-bold ${hasMenu ? "text-[#1F5E4B]" : "text-[#8C9890]"}`}>
                    {hasMenu ? `${dayCost.toLocaleString()} ฿` : "0 ฿"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* MOBILE WEEK-DAY AGENDA VIEW (SHOWN ONLY ON < md SCREENS) */}
        {/* ========================================================================= */}
        <div className="md:hidden space-y-3">
          {/* Week Selector Strip */}
          {calendarWeeks.length > 0 && (
            <div className="bg-white border border-[#E7E4DC] rounded-2xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMobileWeekIdx((prev) => Math.max(0, prev - 1))}
                  disabled={activeMobileWeekIdx === 0}
                  className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-[#18201C] transition-smooth active:scale-95"
                  aria-label="สัปดาห์ก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4 text-[#4B5850]" />
                </button>
                <div className="text-center">
                  <div className="text-xs font-extrabold text-[#18201C] flex items-center justify-center gap-1.5">
                    <span>{calendarWeeks[activeMobileWeekIdx]?.label}</span>
                    <span className="text-[11px] font-normal text-[#66746C]">({calendarWeeks[activeMobileWeekIdx]?.dateRangeLabel})</span>
                  </div>
                  <div className="text-[10px] text-[#8C9890] mt-0.5 font-mono">
                    จัดเมนูแล้ว {calendarWeeks[activeMobileWeekIdx]?.plannedDaysCount || 0} / {calendarWeeks[activeMobileWeekIdx]?.schoolDays.length || 0} วัน • งบสัปดาห์ {calendarWeeks[activeMobileWeekIdx]?.totalCost.toLocaleString() || 0} ฿
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMobileWeekIdx((prev) => Math.min(calendarWeeks.length - 1, prev + 1))}
                  disabled={activeMobileWeekIdx >= calendarWeeks.length - 1}
                  className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-[#18201C] transition-smooth active:scale-95"
                  aria-label="สัปดาห์ถัดไป"
                >
                  <ChevronRight className="w-4 h-4 text-[#4B5850]" />
                </button>
              </div>

              {/* Quick Week Indicator Tabs */}
              <div className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-[#F0ECE4]">
                {calendarWeeks.map((w, idx) => (
                  <button
                    key={w.weekIndex}
                    type="button"
                    onClick={() => setActiveMobileWeekIdx(idx)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                      activeMobileWeekIdx === idx
                        ? "bg-[#1F5E4B] text-white shadow-2xs"
                        : "bg-[#FAF9F6] text-[#66746C] hover:bg-[#F0ECE4]"
                    }`}
                  >
                    สัปดาห์ {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List of School Day Cards in the Active Week */}
          <div className="space-y-3">
            {calendarWeeks[activeMobileWeekIdx]?.schoolDays.map((day) => {
              const plan = datePlans[day.dateStr];
              const hasMenu = Boolean(plan?.menuName);
              const ingredients = plan?.ingredients || [];
              const ingredientCount = ingredients.length;
              const dayCost = ingredients.reduce(
                (sum, ing) => sum + Number((ing.qty * ing.unitPrice).toFixed(2)),
                0
              );
              const perStudentCost = (dayCost / (settings.studentCount || 86)).toFixed(1);

              const dayBorderColor =
                day.dayOfWeek === 1
                  ? "border-l-amber-500"
                  : day.dayOfWeek === 2
                  ? "border-l-pink-500"
                  : day.dayOfWeek === 3
                  ? "border-l-emerald-600"
                  : day.dayOfWeek === 4
                  ? "border-l-orange-500"
                  : "border-l-blue-600";

              const dayBadgeColor =
                day.dayOfWeek === 1
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : day.dayOfWeek === 2
                  ? "bg-pink-50 text-pink-800 border-pink-200"
                  : day.dayOfWeek === 3
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : day.dayOfWeek === 4
                  ? "bg-orange-50 text-orange-800 border-orange-200"
                  : "bg-blue-50 text-blue-800 border-blue-200";

              const thaiDayName =
                day.dayOfWeek === 1
                  ? "วันจันทร์"
                  : day.dayOfWeek === 2
                  ? "วันอังคาร"
                  : day.dayOfWeek === 3
                  ? "วันพุธ"
                  : day.dayOfWeek === 4
                  ? "วันพฤหัสบดี"
                  : "วันศุกร์";

              return (
                <div
                  key={day.dateStr}
                  className={`bg-white rounded-2xl border border-[#E7E4DC] border-l-4 ${dayBorderColor} p-3.5 shadow-2xs space-y-2.5 transition-smooth`}
                >
                  {/* Card Header: Day & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${dayBadgeColor}`}>
                        {thaiDayName} {day.dayNum} {THAI_MONTH_NAMES[currentMonth].slice(0, 4)}.
                      </span>
                      {day.roundDayIndex && (
                        <span className="text-[10px] font-mono text-[#8C9890]">
                          (งวดวันที่ {day.roundDayIndex})
                        </span>
                      )}
                    </div>

                    {hasMenu ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          plan.isReceivingConfirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[#EBF4F0] text-[#1F5E4B]"
                        }`}
                      >
                        {plan.isReceivingConfirmed ? "✓ ตรวจรับแล้ว" : "✓ วางแผนแล้ว"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#D97757] bg-[#FDF4F0] px-2 py-0.5 rounded-full border border-[#F2D7CA]">
                        รอจัดเมนู
                      </span>
                    )}
                  </div>

                  {/* Menu Details or Empty Action */}
                  {hasMenu ? (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                          {getFoodEmoji(plan.menuName, plan.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-extrabold text-[#18201C] leading-snug">
                            {plan.menuName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                            <span className="text-[#66746C]">{plan.category || "อาหารจานเดียว"}</span>
                            <span className="text-[#8C9890]">•</span>
                            <span className="text-[#1F5E4B] font-semibold">{ingredientCount} รายการวัตถุดิบ</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial info bar */}
                      <div className="flex items-center justify-between bg-[#FAF9F6] px-3 py-1.5 rounded-xl border border-[#E7E4DC] text-xs">
                        <span className="text-[11px] text-[#66746C]">ต้นทุนวัตถุดิบรวม:</span>
                        <div className="text-right font-mono">
                          <span className="font-extrabold text-[#1F5E4B] tabular-nums">
                            {dayCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </span>
                          <span className="text-[10px] text-[#8C9890] ml-1 font-normal">
                            ({perStudentCost} ฿/คน)
                          </span>
                        </div>
                      </div>

                      {/* Mobile Card Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F0ECE4]">
                        <button
                          type="button"
                          onClick={() => setSelectedDateForModal(day.dateStr)}
                          className="px-3 py-2 rounded-xl bg-white border border-[#E7E4DC] hover:border-[#1F5E4B] text-xs font-bold text-[#18201C] transition-smooth shadow-2xs flex items-center gap-1 active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#1F5E4B]" />
                          <span>เปลี่ยนเมนู</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectDateForDetail(day.dateStr)}
                          className="px-3 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth shadow-2xs flex items-center gap-1 active:scale-95"
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                          <span>จัดการวัตถุดิบ</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3.5 px-3 rounded-xl border border-dashed border-[#C7E2D6] bg-[#F2F8F5]/40 text-center space-y-2">
                      <p className="text-xs text-[#66746C]">ยังไม่ได้กำหนดเมนูสำหรับวันนี้</p>
                      <button
                        type="button"
                        onClick={() => setSelectedDateForModal(day.dateStr)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F5E4B] text-white text-xs font-bold shadow-2xs hover:bg-[#143B30] transition-smooth active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>กำหนดเมนูวันนี้</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. MODAL: Menu Selector & Recipe Customizer for Specific Date */}
      {selectedDateForModal && (
        <div className="fixed inset-0 z-50 bg-[#18201C]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-floating border border-[#E7E4DC] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#ECE8DE]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#F2F8F5] text-[#1F5E4B] border border-[#C7E2D6] flex items-center justify-center text-xl shrink-0">
                  🍲
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#18201C]">
                    กำหนดเมนูอาหาร:{" "}
                    <span className="text-[#1F5E4B]">{formatThaiDateFull(selectedDateForModal)}</span>
                  </h3>
                  <p className="text-xs text-[#66746C] mt-0.5">
                    ดึงสูตรอาหารจากคลังเป็นตัวตั้งต้น และสามารถปรับลด/เพิ่มวัตถุดิบหน้างานได้อิสระ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateForModal(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center font-bold text-gray-500 hover:text-black transition-smooth text-sm"
              >
                ✕
              </button>
            </div>

            {/* Current Assigned Status Banner if present */}
            {datePlans[selectedDateForModal]?.menuName && (
              <div className="my-3 p-3.5 bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#8C9890] block font-semibold">เมนูที่กำหนดอยู่ขณะนี้:</span>
                  <span className="font-extrabold text-[#18201C] text-sm flex items-center gap-1.5 mt-0.5">
                    <span>{getFoodEmoji(datePlans[selectedDateForModal].menuName, datePlans[selectedDateForModal].category)}</span>
                    <span>{datePlans[selectedDateForModal].menuName}</span>
                    <span className="text-xs font-normal text-gray-500">
                      ({(datePlans[selectedDateForModal].ingredients || []).length} วัตถุดิบ)
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const curDate = selectedDateForModal;
                      setSelectedDateForModal(null);
                      onSelectDateForDetail(curDate);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#C7E2D6] text-[#1F5E4B] hover:bg-[#EBF4F0] font-bold text-xs flex items-center gap-1 transition-smooth shadow-2xs"
                    title="เปิดแก้ไขวัตถุดิบและราคาของวันนี้"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>จัดการวัตถุดิบวันนี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearDateMenu}
                    className="p-1.5 rounded-xl border border-[#F2D7CA] bg-[#FDF4F0] text-[#B55232] hover:bg-[#FBEDE6] transition-smooth"
                    title="ล้างเมนูของวันนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab Switcher: Choose from Preset Bank vs Create Custom */}
            <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-2xl border border-[#E7E4DC] my-2">
              <button
                type="button"
                onClick={() => setModalTab("PRESET")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  modalTab === "PRESET"
                    ? "bg-[#1F5E4B] text-white shadow-xs"
                    : "text-[#66746C] hover:text-[#18201C]"
                }`}
              >
                ดึงจากคลังสูตรอาหารที่บันทึกไว้ ({presetMenus.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab("CUSTOM")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  modalTab === "CUSTOM"
                    ? "bg-[#1F5E4B] text-white shadow-xs"
                    : "text-[#66746C] hover:text-[#18201C]"
                }`}
              >
                + กำหนดเมนูใหม่สดๆ สำหรับวันนี้
              </button>
            </div>

            {/* TAB 1: PRESET RECIPE BANK */}
            {modalTab === "PRESET" && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-3 pt-1">
                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อเมนู หรือวัตถุดิบ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#1F5E4B] transition-smooth"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-xs shrink-0">
                    {["ทั้งหมด", "อาหารจานเดียว", "กับข้าว", "ของหวาน/ผลไม้"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-smooth whitespace-nowrap ${
                          selectedCategoryFilter === cat
                            ? "bg-[#1F5E4B] text-white"
                            : "bg-[#FAF9F6] border border-[#E7E4DC] text-[#4B5850] hover:bg-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipe Card List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {filteredPresets.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs space-y-2">
                      <UtensilsCrossed className="w-8 h-8 mx-auto text-gray-300" />
                      <p>ไม่พบสูตรอาหารที่ตรงกับคำค้นหา</p>
                    </div>
                  ) : (
                    filteredPresets.map((preset) => {
                      const cost = (preset.ingredients || []).reduce(
                        (sum, ing) => sum + Number((ing.qty * ing.unitPrice).toFixed(2)),
                        0
                      );
                      const costPerHead = studentCount > 0 ? (cost / studentCount).toFixed(2) : "0.00";
                      const ingNames = (preset.ingredients || []).map((i) => i.name).slice(0, 4).join(", ");

                      return (
                        <div
                          key={preset.id}
                          className="p-3.5 rounded-2xl border border-[#E7E4DC] hover:border-[#1F5E4B] hover:bg-[#F2F8F5]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] flex items-center justify-center text-xl shrink-0 mt-0.5">
                              {getFoodEmoji(preset.name, preset.category)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#18201C]">{preset.name}</h4>
                                <span className="text-[10px] font-semibold bg-[#FAF9F6] text-[#4B5850] px-2 py-0.5 rounded border border-[#E7E4DC]">
                                  {preset.category || "อาหารจานเดียว"}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#66746C] mt-0.5">
                                {preset.ingredients?.length || 0} รายการ ({ingNames || "ยังไม่มีวัตถุดิบ"}
                                {(preset.ingredients || []).length > 4 ? "..." : ""})
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                                <span className="font-extrabold text-[#1F5E4B]">
                                  ~{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">({costPerHead} ฿/คน)</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAssignPreset(preset)}
                            className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold shrink-0 shadow-soft transition-smooth flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4 text-[#EAD598]" />
                            <span>เลือกเมนูนี้</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM MENU FORM */}
            {modalTab === "CUSTOM" && (
              <div className="flex-1 overflow-y-auto space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-[#18201C] block mb-1">
                    ชื่อเมนูอาหารกลางวันสำหรับวันนี้:
                  </label>
                  <input
                    type="text"
                    value={customMenuName}
                    onChange={(e) => setCustomMenuName(e.target.value)}
                    placeholder="เช่น ข้าวผัดกุ้งสด, แกงส้มปลากะพงยอดมะพร้าว"
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201C] block mb-1">หมวดหมู่อาหาร:</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#18201C] focus:outline-none focus:border-[#1F5E4B] transition-smooth"
                  >
                    <option value="อาหารจานเดียว">อาหารจานเดียว</option>
                    <option value="กับข้าว">กับข้าว</option>
                    <option value="ของหวาน/ผลไม้">ของหวาน/ผลไม้</option>
                  </select>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-2xl border border-[#E7E4DC] space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1F5E4B]" />
                    <span className="font-bold text-[#18201C]">ระบบจะจัดชุดวัตถุดิบตั้งต้นให้อัตโนมัติ:</span>
                  </div>
                  <p className="text-[11px] text-[#66746C] leading-relaxed">
                    ระบบจะสร้างรายการวัตถุดิบพื้นฐาน (เนื้อสัตว์, ผักสด, ข้าวสาร, เครื่องปรุง) ลงในวันนี้ให้ทันที และคุณครูสามารถเข้าไปปรับปริมาณหรือเปลี่ยนชื่อวัตถุดิบตามที่ตลาดมีจริงในภายหลังได้
                  </p>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer font-bold text-[#18201C]">
                    <input
                      type="checkbox"
                      checked={saveAlsoAsPreset}
                      onChange={(e) => setSaveAlsoAsPreset(e.target.checked)}
                      className="accent-[#1F5E4B] w-4 h-4 rounded"
                    />
                    <span>บันทึกเมนูนี้เข้าคลังสูตรอาหารต้นแบบด้วย (สำหรับนำกลับมาใช้วันอื่น)</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAssignCustom}
                    disabled={!customMenuName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] disabled:bg-gray-300 text-white text-xs font-bold shadow-soft transition-smooth flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-[#EAD598]" />
                    <span>บันทึกเมนูลงวันที่ {formatThaiDateShort(selectedDateForModal)}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-[#ECE8DE] flex items-center justify-between text-xs">
              <span className="text-[#8C9890] text-[11px]">
                * เมนูและวัตถุดิบที่เลือกจะถูกบันทึกแยกอิสระเฉพาะวันนี้
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateForModal(null)}
                className="px-4 py-2 rounded-xl border border-[#E7E4DC] text-gray-600 font-semibold hover:bg-gray-50 transition-smooth"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

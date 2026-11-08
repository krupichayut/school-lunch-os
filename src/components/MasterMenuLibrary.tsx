"use client";

import React, { useState, useMemo } from "react";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Calendar,
  Edit3,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  DollarSign,
  ChevronRight,
  ArrowRight,
  X,
  Save,
  BookOpen,
} from "lucide-react";
import {
  PresetMenu,
  MenuItem,
  DayPlan,
  SchoolSettings,
  getRoundSchoolDays,
} from "@/lib/storage";

export interface MasterMenuLibraryProps {
  presetMenus: PresetMenu[];
  datePlans: Record<string, DayPlan>;
  settings: SchoolSettings;
  onUpdatePresetMenu: (menu: PresetMenu) => void;
  onAddNewPresetMenu: (menu: PresetMenu) => void;
  onDeletePresetMenu: (menuId: string) => void;
  onAssignMenuToDate: (menu: PresetMenu, dateStr: string) => void;
  onOpenExcelImport?: () => void;
  onGoToCalendar?: () => void;
  onSelectDateForDetail?: (dateStr: string) => void;
}

const CATEGORY_FILTERS = [
  "ทั้งหมด",
  "อาหารจานเดียว",
  "กับข้าว",
  "ก๋วยเตี๋ยว",
  "ข้าวแกง",
  "ต้มจืด",
  "ขนม/ผลไม้",
] as const;

function getMenuEmoji(name: string, category?: string): string {
  const n = (name || "").toLowerCase();
  const c = (category || "").toLowerCase();
  if (n.includes("ก๋วยเตี๋ยว") || n.includes("เส้น") || n.includes("บะหมี่") || n.includes("ก๋วยจั๊บ")) return "🍜";
  if (n.includes("ข้าวมันไก่") || n.includes("ไก่")) return "🍗";
  if (n.includes("หมู") || n.includes("คั่วกลิ้ง")) return "🥩";
  if (n.includes("ปลา") || n.includes("กุ้ง") || n.includes("ทะเล")) return "🦐";
  if (n.includes("ต้มจืด") || n.includes("ซุป") || n.includes("แกงจืด")) return "🍲";
  if (n.includes("แกง") || n.includes("พะแนง") || n.includes("เขียวหวาน")) return "🍛";
  if (n.includes("ผัดซีอิ๊ว") || n.includes("ผัดไทย") || n.includes("ผัด")) return "🥘";
  if (n.includes("ข้าวผัด")) return "🍚";
  if (c.includes("ก๋วยเตี๋ยว")) return "🍜";
  if (c.includes("จานเดียว")) return "🍱";
  if (c.includes("กับข้าว")) return "🍲";
  return "🍱";
}

function formatShortThaiDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ];
    return `${dayNames[date.getDay()]} ${d} ${monthNames[m - 1]}`;
  } catch {
    return dateStr;
  }
}

export default function MasterMenuLibrary({
  presetMenus,
  datePlans,
  settings,
  onUpdatePresetMenu,
  onAddNewPresetMenu,
  onDeletePresetMenu,
  onAssignMenuToDate,
  onOpenExcelImport,
  onGoToCalendar,
  onSelectDateForDetail,
}: MasterMenuLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");
  const [editingMenu, setEditingMenu] = useState<PresetMenu | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [assigningMenu, setAssigningMenu] = useState<PresetMenu | null>(null);
  const [customAssignDate, setCustomAssignDate] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // School days in current round based on school settings
  const roundDays = useMemo(
    () => getRoundSchoolDays(settings.currentRoundStartDate, settings.currentRoundEndDate),
    [settings.currentRoundStartDate, settings.currentRoundEndDate]
  );

  // Filtered menus
  const filteredMenus = useMemo(() => {
    return presetMenus.filter((menu) => {
      const matchesSearch =
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (menu.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.ingredients.some((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "ทั้งหมด" ||
        menu.category === selectedCategory ||
        (selectedCategory === "ก๋วยเตี๋ยว" && menu.name.includes("ก๋วยเตี๋ยว")) ||
        (selectedCategory === "ต้มจืด" && menu.name.includes("ต้มจืด")) ||
        (selectedCategory === "ข้าวแกง" && (menu.name.includes("แกง") || menu.category === "กับข้าว"));

      return matchesSearch && matchesCat;
    });
  }, [presetMenus, searchQuery, selectedCategory]);

  // Statistics
  const totalMenusCount = presetMenus.length;
  const averageCost = useMemo(() => {
    if (totalMenusCount === 0) return 0;
    const total = presetMenus.reduce((sum, menu) => {
      const menuCost = menu.ingredients.reduce(
        (s, item) => s + (item.qty || 0) * (item.unitPrice || 0),
        0
      );
      return sum + menuCost;
    }, 0);
    return Math.round(total / totalMenusCount);
  }, [presetMenus, totalMenusCount]);

  // Map of which dates each menu is assigned to
  const menuAssignedDatesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [dateStr, plan] of Object.entries(datePlans)) {
      if (!plan || !plan.menuName) continue;
      const matched = presetMenus.find(
        (m) => m.name.trim().toLowerCase() === plan.menuName.trim().toLowerCase()
      );
      if (matched) {
        if (!map[matched.id]) map[matched.id] = [];
        map[matched.id].push(dateStr);
      }
    }
    return map;
  }, [datePlans, presetMenus]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveMenu = (menuToSave: PresetMenu) => {
    if (isCreatingNew) {
      onAddNewPresetMenu(menuToSave);
      showToast(`✓ เพิ่มเมนู "${menuToSave.name}" ลงในคลังเรียบร้อยแล้ว`);
    } else {
      onUpdatePresetMenu(menuToSave);
      showToast(`✓ บันทึกการแก้ไขสูตร "${menuToSave.name}" เรียบร้อยแล้ว`);
    }
    setEditingMenu(null);
    setIsCreatingNew(false);
  };

  const handleDelete = (menu: PresetMenu) => {
    if (confirm(`คุณต้องการลบเมนู "${menu.name}" ออกจากคลังสูตรอาหารใช่หรือไม่?`)) {
      onDeletePresetMenu(menu.id);
      showToast(`✓ ลบเมนู "${menu.name}" เรียบร้อยแล้ว`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-[#1F5E4B] text-white p-4 rounded-2xl shadow-soft flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#EAD598]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Executive Summary & Action Hub */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E7E4DC] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ECE8DE] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F2F8F5] text-[#1F5E4B] flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#18201C] tracking-tight">
                คลังรายการเมนูอาหารและสูตรวัตถุดิบ (Master Menu Library)
              </h2>
            </div>
            <p className="text-xs text-[#66746C] max-w-2xl leading-relaxed">
              จัดการรายการเมนูอาหารทั้งหมดที่โรงเรียนมี กำหนดสูตรวัตถุดิบและราคาต้นแบบ
              และเลือกว่าจะนำเมนูไหนไปจัดลงวันที่ใดในปฏิทิน 20 วันอย่างยืดหยุ่น
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(true);
                setEditingMenu({
                  id: `preset-${Date.now()}`,
                  name: "",
                  category: "อาหารจานเดียว",
                  ingredients: [
                    { id: `ing-${Date.now()}-1`, name: "", qty: 1, unit: "กก.", unitPrice: 0 },
                  ],
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-[#EAD598]" />
              <span>+ เพิ่มเมนูอาหารใหม่</span>
            </button>

            {onOpenExcelImport && (
              <button
                type="button"
                onClick={onOpenExcelImport}
                className="px-3.5 py-2 rounded-xl bg-[#F2F8F5] hover:bg-[#EBF4F0] border border-[#C7E2D6] text-[#1F5E4B] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1F5E4B]" />
                <span>📥 นำเข้าจาก Excel</span>
              </button>
            )}

            {onGoToCalendar && (
              <button
                type="button"
                onClick={onGoToCalendar}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF9F6] border border-[#E7E4DC] text-[#18201C] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1F5E4B]" />
                <span>📅 ไปหน้าปฏิทิน</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3.5">
            <span className="text-[11px] text-[#8C9890] block font-semibold">จำนวนเมนูในคลังสูตร</span>
            <span className="text-base sm:text-lg font-extrabold text-[#18201C] font-mono tabular-nums">
              {totalMenusCount} <span className="text-xs font-normal text-[#66746C]">รายการ</span>
            </span>
          </div>

          <div className="bg-[#FAF9F6] border border-[#E7E4DC] rounded-2xl p-3.5">
            <span className="text-[11px] text-[#8C9890] block font-semibold">
              ประมาณการต้นทุนเฉลี่ย / มื้อ ({settings.studentCount} คน)
            </span>
            <span className="text-base sm:text-lg font-extrabold text-[#1F5E4B] font-mono tabular-nums">
              {averageCost.toLocaleString()} <span className="text-xs font-normal text-[#66746C]">฿</span>
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#1F5E4B] block font-semibold">
                การจัดสรรลงปฏิทินงวดนี้ (20 วัน)
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#1F5E4B] font-mono tabular-nums">
                {Object.keys(datePlans).filter((d) => datePlans[d]?.menuName).length} / 20{" "}
                <span className="text-xs font-normal text-[#1F5E4B]/80">วันทำการ</span>
              </span>
            </div>
            {onGoToCalendar && (
              <button
                type="button"
                onClick={onGoToCalendar}
                className="text-[11px] font-bold text-[#1F5E4B] hover:underline flex items-center gap-0.5"
              >
                <span>เปิดปฏิทิน</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E7E4DC] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C9890] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเมนู, วัตถุดิบ, หรือหมวดหมู่..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl text-xs text-[#18201C] placeholder-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B] transition-smooth"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-smooth whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#1F5E4B] text-white shadow-xs"
                  : "bg-[#FAF9F6] hover:bg-[#F2F0E8] text-[#66746C] border border-[#E7E4DC]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Menu Grid */}
      {filteredMenus.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E7E4DC] text-center space-y-3 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E7E4DC] flex items-center justify-center mx-auto text-[#8C9890]">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-[#18201C]">ไม่พบเมนูอาหารที่ตรงกับคำค้นหา</h3>
          <p className="text-xs text-[#66746C] max-w-sm mx-auto">
            ลองเปลี่ยนคำค้นหา หรือกดปุ่ม <strong>&ldquo;+ เพิ่มเมนูอาหารใหม่&rdquo;</strong> เพื่อสร้างเมนูเพิ่ม
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMenus.map((menu) => {
            const menuCost = menu.ingredients.reduce(
              (sum, i) => sum + (i.qty || 0) * (i.unitPrice || 0),
              0
            );
            const assignedDateList = menuAssignedDatesMap[menu.id] || [];

            return (
              <div
                key={menu.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E7E4DC] hover:border-[#1F5E4B] transition-smooth shadow-xs hover:shadow-card space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Emoji, Title, Category, Cost */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl sm:text-3xl p-2 rounded-2xl bg-[#FAF9F6] border border-[#E7E4DC] shrink-0">
                        {getMenuEmoji(menu.name, menu.category)}
                      </span>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-bold text-sm sm:text-base text-[#18201C] tracking-tight leading-snug">
                            {menu.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#66746C]">
                          <span className="bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#E7E4DC] font-medium">
                            {menu.category || "อาหารจานเดียว"}
                          </span>
                          <span>•</span>
                          <span>{menu.ingredients.length} รายการวัตถุดิบ</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-[#8C9890] block font-semibold">ต้นทุนวัตถุดิบ</span>
                      <span className="text-sm sm:text-base font-extrabold font-mono text-[#1F5E4B] tabular-nums">
                        {menuCost.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-[#66746C]">฿</span>
                      </span>
                    </div>
                  </div>

                  {/* Assigned Dates in Calendar Banner */}
                  <div className="mt-3 bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-[#66746C] flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#1F5E4B]" />
                      <span>จัดลงปฏิทินงวดนี้:</span>
                    </span>

                    {assignedDateList.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignedDateList.map((dStr) => (
                          <button
                            key={dStr}
                            type="button"
                            onClick={() => onSelectDateForDetail?.(dStr)}
                            className="bg-white hover:bg-[#F2F8F5] border border-[#C7E2D6] text-[#1F5E4B] px-2 py-0.5 rounded-lg text-[11px] font-bold transition-smooth flex items-center gap-1 shadow-2xs"
                            title="คลิกเพื่อดู/ปรับแต่งวัตถุดิบของวันนี้"
                          >
                            <span>{formatShortThaiDate(dStr)}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#8C9890] italic">
                        ยังไม่ได้จัดลงวันในปฏิทิน
                      </span>
                    )}
                  </div>

                  {/* Quick Ingredient Preview Pills */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {menu.ingredients.slice(0, 4).map((ing, i) => (
                      <span
                        key={ing.id || i}
                        className="text-[10px] text-[#4B5850] bg-[#FAF9F6] border border-[#E7E4DC] px-2 py-0.5 rounded-md"
                      >
                        {ing.name} ({ing.qty} {ing.unit})
                      </span>
                    ))}
                    {menu.ingredients.length > 4 && (
                      <span className="text-[10px] text-[#8C9890] px-1 py-0.5">
                        +{menu.ingredients.length - 4} รายการ...
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-3 border-t border-[#F4F2EB] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssigningMenu(menu)}
                      className="px-3 py-1.5 rounded-xl border border-[#C7E2D6] bg-[#F2F8F5] hover:bg-[#EBF4F0] text-[#1F5E4B] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="นำเมนูนี้ไปจัดลงวันที่ในปฏิทิน"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>📅 ดึงลงปฏิทิน...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setEditingMenu(JSON.parse(JSON.stringify(menu)));
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[#E7E4DC] bg-white hover:bg-[#FAF9F6] text-[#18201C] text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#66746C]" />
                      <span>✏️ แก้ไขสูตร</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(menu)}
                    className="p-1.5 rounded-xl text-[#8C9890] hover:text-[#B55232] hover:bg-[#FDF4F0] transition-colors"
                    title="ลบเมนูนี้ออกจากคลัง"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: Assign Menu to Calendar Date */}
      {assigningMenu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E7E4DC] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-[#ECE8DE] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#18201C] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1F5E4B]" />
                  <span>เลือกวันที่ในปฏิทินสำหรับ &ldquo;{assigningMenu.name}&rdquo;</span>
                </h3>
                <p className="text-xs text-[#66746C] mt-0.5">
                  คลิกวันที่ในงวดที่ 1 (2–27 พ.ย. 2569) เพื่อนำสูตรอาหารนี้ไปกำหนดลงในวันนั้น
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningMenu(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
              {roundDays.map((dateStr, idx) => {
                const currentPlan = datePlans[dateStr];
                const isAlreadyThisMenu =
                  currentPlan?.menuName?.trim().toLowerCase() ===
                  assigningMenu.name.trim().toLowerCase();

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      onAssignMenuToDate(assigningMenu, dateStr);
                      showToast(
                        `✓ กำหนดเมนู "${assigningMenu.name}" ลงใน ${formatShortThaiDate(dateStr)} เรียบร้อยแล้ว`
                      );
                      setAssigningMenu(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-smooth flex flex-col justify-between ${
                      isAlreadyThisMenu
                        ? "bg-[#1F5E4B] text-white border-[#1F5E4B] shadow-xs"
                        : currentPlan?.menuName
                        ? "bg-[#FAF9F6] border-[#E7E4DC] text-[#18201C] hover:border-[#1F5E4B]"
                        : "bg-white border-[#C7E2D6] text-[#1F5E4B] hover:bg-[#F2F8F5]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold">
                        {formatShortThaiDate(dateStr)}
                      </span>
                      <span className="text-[9px] font-bold opacity-70">ว.{idx + 1}</span>
                    </div>

                    <div className="mt-1 text-[10px] truncate">
                      {isAlreadyThisMenu ? (
                        <span>✓ เมนูนี้อยู่แล้ว</span>
                      ) : currentPlan?.menuName ? (
                        <span className="text-[#66746C] truncate block">
                          แทนที่: {currentPlan.menuName}
                        </span>
                      ) : (
                        <span className="text-[#1F5E4B] font-semibold">+ วางเมนู</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Date Assignment Outside Round 1 */}
            <div className="pt-3 border-t border-[#ECE8DE] space-y-2">
              <span className="text-xs font-bold text-[#18201C] block">
                หรือเลือกกำหนดลงวันที่อื่นๆ นอกงวดหลัก:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customAssignDate}
                  onChange={(e) => setCustomAssignDate(e.target.value)}
                  className="flex-1 bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#1F5E4B] focus:border-[#1F5E4B] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#18201C] outline-none transition-smooth"
                />
                <button
                  type="button"
                  disabled={!customAssignDate}
                  onClick={() => {
                    if (!customAssignDate || !assigningMenu) return;
                    onAssignMenuToDate(assigningMenu, customAssignDate);
                    showToast(
                      `✓ กำหนดเมนู "${assigningMenu.name}" ลงใน ${formatShortThaiDate(customAssignDate)} เรียบร้อยแล้ว`
                    );
                    setAssigningMenu(null);
                    setCustomAssignDate("");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] disabled:bg-gray-300 text-white text-xs font-bold transition-smooth whitespace-nowrap shadow-xs"
                >
                  กำหนดลงวันนี้
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#ECE8DE] flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningMenu(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-smooth"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Create / Edit Recipe & Ingredients */}
      {editingMenu && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 border border-[#E7E4DC] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-[#ECE8DE] pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-[#18201C] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#1F5E4B]" />
                  <span>
                    {isCreatingNew ? "สร้างเมนูอาหารใหม่" : `แก้ไขสูตรวัตถุดิบ: ${editingMenu.name}`}
                  </span>
                </h3>
                <p className="text-xs text-[#66746C] mt-0.5">
                  ระบุชื่อเมนู หมวดหมู่ และรายการวัตถุดิบพร้อมราคาต่อหน่วยสำหรับ {settings.studentCount} คน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {/* Menu Name & Category Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[#18201C]">ชื่อเมนูอาหาร *</label>
                  <input
                    type="text"
                    value={editingMenu.name}
                    onChange={(e) =>
                      setEditingMenu({ ...editingMenu, name: e.target.value })
                    }
                    placeholder="เช่น ข้าวมันไก่ตอน + น้ำซุปฟัก"
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl text-xs font-bold text-[#18201C] focus:outline-none focus:ring-2 focus:ring-[#1F5E4B]/20 focus:border-[#1F5E4B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#18201C]">หมวดหมู่อาหาร</label>
                  <select
                    value={editingMenu.category || "อาหารจานเดียว"}
                    onChange={(e) =>
                      setEditingMenu({ ...editingMenu, category: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl text-xs font-bold text-[#18201C] focus:outline-none focus:border-[#1F5E4B]"
                  >
                    <option value="อาหารจานเดียว">อาหารจานเดียว</option>
                    <option value="กับข้าว">กับข้าว</option>
                    <option value="ก๋วยเตี๋ยว">ก๋วยเตี๋ยว</option>
                    <option value="ข้าวแกง">ข้าวแกง</option>
                    <option value="ต้มจืด">ต้มจืด</option>
                    <option value="ขนม/ผลไม้">ขนม/ผลไม้</option>
                  </select>
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#18201C] flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#1F5E4B]" />
                    <span>รายการวัตถุดิบต้นแบบ ({editingMenu.ingredients.length} รายการ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newIng: MenuItem = {
                        id: `ing-${Date.now()}-${editingMenu.ingredients.length + 1}`,
                        name: "",
                        qty: 1,
                        unit: "กก.",
                        unitPrice: 0,
                      };
                      setEditingMenu({
                        ...editingMenu,
                        ingredients: [...editingMenu.ingredients, newIng],
                      });
                    }}
                    className="text-xs font-bold text-[#1F5E4B] hover:text-[#143B30] bg-[#F2F8F5] border border-[#C7E2D6] px-2.5 py-1 rounded-lg hover:bg-[#EBF4F0] transition-smooth flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ เพิ่มวัตถุดิบ</span>
                  </button>
                </div>

                <div className="border border-[#E7E4DC] rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs text-[#18201C]">
                    <thead className="bg-[#FAF9F6] text-[#66746C] font-bold border-b border-[#E7E4DC] text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">ชื่อวัตถุดิบ</th>
                        <th className="py-2.5 px-2 text-center w-20">จำนวน</th>
                        <th className="py-2.5 px-2 text-center w-16">หน่วย</th>
                        <th className="py-2.5 px-2 text-center w-24">ราคา/หน่วย (฿)</th>
                        <th className="py-2.5 px-3 text-right w-24">รวม (฿)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE4]">
                      {editingMenu.ingredients.map((ing, idx) => (
                        <tr key={ing.id || idx} className="hover:bg-[#FAF9F6]/50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={ing.name}
                              onChange={(e) => {
                                const updated = [...editingMenu.ingredients];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setEditingMenu({ ...editingMenu, ingredients: updated });
                              }}
                              placeholder="เช่น เนื้อไก่สด"
                              className="w-full bg-transparent border-b border-transparent hover:border-[#C7E2D6] focus:border-[#1F5E4B] focus:outline-none py-1 text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={ing.qty}
                              onChange={(e) => {
                                const updated = [...editingMenu.ingredients];
                                updated[idx] = {
                                  ...updated[idx],
                                  qty: parseFloat(e.target.value) || 0,
                                };
                                setEditingMenu({ ...editingMenu, ingredients: updated });
                              }}
                              className="w-16 px-1.5 py-1 text-center font-mono font-bold bg-[#FAF9F6] border border-[#E7E4DC] rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="text"
                              value={ing.unit}
                              onChange={(e) => {
                                const updated = [...editingMenu.ingredients];
                                updated[idx] = { ...updated[idx], unit: e.target.value };
                                setEditingMenu({ ...editingMenu, ingredients: updated });
                              }}
                              className="w-14 px-1 py-1 text-center bg-[#FAF9F6] border border-[#E7E4DC] rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="any"
                              value={ing.unitPrice}
                              onChange={(e) => {
                                const updated = [...editingMenu.ingredients];
                                updated[idx] = {
                                  ...updated[idx],
                                  unitPrice: parseFloat(e.target.value) || 0,
                                };
                                setEditingMenu({ ...editingMenu, ingredients: updated });
                              }}
                              className="w-20 px-1.5 py-1 text-center font-mono font-bold bg-[#FAF9F6] border border-[#E7E4DC] rounded-lg text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#1F5E4B]">
                            {((ing.qty || 0) * (ing.unitPrice || 0)).toLocaleString()} ฿
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editingMenu.ingredients.filter((_, i) => i !== idx);
                                setEditingMenu({ ...editingMenu, ingredients: updated });
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                              title="ลบแถวนี้"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between bg-[#FAF9F6] p-3 rounded-2xl border border-[#E7E4DC]">
                  <span className="text-xs font-semibold text-[#66746C]">รวมต้นทุนวัตถุดิบทั้งสิ้น:</span>
                  <span className="text-base font-extrabold font-mono text-[#1F5E4B]">
                    {editingMenu.ingredients
                      .reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)
                      .toLocaleString()}{" "}
                    ฿
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#ECE8DE] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-smooth"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingMenu.name.trim()) {
                    alert("กรุณากรอกชื่อเมนูอาหาร");
                    return;
                  }
                  handleSaveMenu(editingMenu);
                }}
                className="px-5 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft"
              >
                <Save className="w-3.5 h-3.5 text-[#EAD598]" />
                <span>บันทึกเมนูลงในคลัง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

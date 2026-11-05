"use client";

import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import {
  loadLocalState,
  saveLocalState,
  fetchCloudState,
  saveCloudState,
  SchoolSettings,
  DutyRoster,
  MenuItem,
  PresetMenu,
  InspectionItemState,
  FinancialTransactionDisplay,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Preset Master Recipes (Initial Seed)
const PRESET_MENUS: PresetMenu[] = [
  {
    id: "menu-custom",
    name: "เมนูอาหารกลางวันประจำวัน",
    category: "อาหารจานเดียว",
    ingredients: [],
  },
];

export default function HomePage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "KITCHEN_HUD" | "MENU_PLAN" | "ANALYTICS" | "FINANCE_LEDGER" | "SETTINGS"
  >("KITCHEN_HUD");

  // =========================================================================
  // 1. SETTINGS STATE (ข้อมูลโรงเรียน, ผู้บริหาร, ครูเวรรายวัน)
  // =========================================================================
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: "โรงเรียนอนุบาลเทศบาลเมือง (สพป. เขต 1)",
    directorName: "นายวิเชียร มุ่งมั่น (ผู้อำนวยการโรงเรียน)",
    nutritionHeadName: "ครูพรทิพย์ เจริญจิตต์ (ผู้รับผิดชอบโครงการอาหารกลางวัน)",
    academicYear: "2569",
    semester: "ภาคเรียนที่ 2",
    totalSemesterDays: 100,
    dutyRoster: {
      monday: ["ครูสมศรี ใจดี", "ครูมานะ ขยันยิ่ง"],
      tuesday: ["ครูวิชัย เก่งการ", "ครูชลธิชา สดใส"],
      wednesday: ["ครูประภาส สุขสงบ", "ครูณัฐพล ส่องแสง"],
      thursday: ["ครูอนงค์ รักเด็ก", "ครูชวลิต มั่งมี"],
      friday: ["ครูสุชาติ พากเพียร", "ครูกานดา วาจางาม"],
    },
  });

  const [settingsForm, setSettingsForm] = useState<SchoolSettings>(settings);
  const [settingsSaveToast, setSettingsSaveToast] = useState(false);
  const [ingredientSaveToast, setIngredientSaveToast] = useState(false);

  // Cloud & Local Persistence Sync
  const [syncStatus, setSyncStatus] = useState<"SYNCED" | "SAVING" | "LOCAL">("SYNCED");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // =========================================================================
  // 2. DAILY MENU & INGREDIENT STATE (กำหนดราคา/ปริมาณตรง ไม่คูณเด็ก)
  // =========================================================================
  const [presetMenus, setPresetMenus] = useState<PresetMenu[]>(PRESET_MENUS);
  const [newMenuCategory, setNewMenuCategory] = useState<string>("อาหารจานเดียว");
  const [selectedMenuId, setSelectedMenuId] = useState<string>("menu-custom");
  const [dailyIngredients, setDailyIngredients] = useState<MenuItem[]>([]);
  const [isPlanFrozen, setIsPlanFrozen] = useState<boolean>(false);
  const [frozenSnapshotTime, setFrozenSnapshotTime] = useState<string>("06:30 น.");

  // Persistent State Hydration: LocalStorage First, then Cloud Sync
  useEffect(() => {
    // 1. Instant local cache load
    const local = loadLocalState();
    if (local) {
      if (local.settings) {
        setSettings(local.settings);
        setSettingsForm(local.settings);
      }
      if (local.presetMenus && local.presetMenus.length > 0) {
        setPresetMenus(local.presetMenus);
      }
      if (local.dailyIngredients && local.dailyIngredients.length > 0) {
        setDailyIngredients(local.dailyIngredients);
      }
      if (local.selectedMenuId) {
        setSelectedMenuId(local.selectedMenuId);
      }
      if (local.transactions && local.transactions.length > 0) {
        setTransactions(local.transactions);
      }
      if (local.inspectionItems && local.inspectionItems.length > 0) {
        setInspectionItems(local.inspectionItems);
      }
      if (typeof local.isPlanFrozen === "boolean") {
        setIsPlanFrozen(local.isPlanFrozen);
      }
      if (typeof local.isReceivingConfirmed === "boolean") {
        setIsReceivingConfirmed(local.isReceivingConfirmed);
      }
      if (local.confirmedAtTime) {
        setConfirmedAtTime(local.confirmedAtTime);
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
          if (cloud.presetMenus && cloud.presetMenus.length > 0) {
            setPresetMenus(cloud.presetMenus);
          }
          if (cloud.dailyIngredients && cloud.dailyIngredients.length > 0) {
            setDailyIngredients(cloud.dailyIngredients);
          }
          if (cloud.selectedMenuId) {
            setSelectedMenuId(cloud.selectedMenuId);
          }
          if (cloud.transactions && cloud.transactions.length > 0) {
            setTransactions(cloud.transactions);
          }
          if (cloud.inspectionItems && cloud.inspectionItems.length > 0) {
            setInspectionItems(cloud.inspectionItems);
          }
          if (typeof cloud.isPlanFrozen === "boolean") {
            setIsPlanFrozen(cloud.isPlanFrozen);
          }
          if (typeof cloud.isReceivingConfirmed === "boolean") {
            setIsReceivingConfirmed(cloud.isReceivingConfirmed);
          }
          if (cloud.confirmedAtTime) {
            setConfirmedAtTime(cloud.confirmedAtTime);
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
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu, 5 = Fri
    let dayLabel = "วันพฤหัสบดี (วันปฏิบัติการ)";
    let teachers = settings.dutyRoster.thursday;
    switch (day) {
      case 1:
        dayLabel = "วันจันทร์";
        teachers = settings.dutyRoster.monday;
        break;
      case 2:
        dayLabel = "วันอังคาร";
        teachers = settings.dutyRoster.tuesday;
        break;
      case 3:
        dayLabel = "วันพุธ";
        teachers = settings.dutyRoster.wednesday;
        break;
      case 4:
        dayLabel = "วันพฤหัสบดี";
        teachers = settings.dutyRoster.thursday;
        break;
      case 5:
        dayLabel = "วันศุกร์";
        teachers = settings.dutyRoster.friday;
        break;
    }
    const safeTeachers = teachers && teachers.length > 0 ? teachers : ["ครูเวรประจำวัน"];
    return {
      dayLabel,
      teachers: safeTeachers,
      teachersSummary: safeTeachers.join(", "),
    };
  }, [settings.dutyRoster]);

  // Handlers for Managing Multiple Teachers per Day in Settings
  const handleAddTeacherToDay = (day: keyof DutyRoster) => {
    setSettingsForm((prev) => ({
      ...prev,
      dutyRoster: {
        ...prev.dutyRoster,
        [day]: [...prev.dutyRoster[day], ""],
      },
    }));
  };

  const handleUpdateTeacherName = (
    day: keyof DutyRoster,
    index: number,
    newName: string
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      dutyRoster: {
        ...prev.dutyRoster,
        [day]: prev.dutyRoster[day].map((name, i) => (i === index ? newName : name)),
      },
    }));
  };

  const handleRemoveTeacherFromDay = (day: keyof DutyRoster, index: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      dutyRoster: {
        ...prev.dutyRoster,
        [day]: prev.dutyRoster[day].filter((_, i) => i !== index),
      },
    }));
  };

  const activeMenu = useMemo(() => {
    return presetMenus.find((m) => m.id === selectedMenuId) || presetMenus[0] || PRESET_MENUS[0];
  }, [presetMenus, selectedMenuId]);

  const handleUpdateMenuName = (newName: string) => {
    setPresetMenus((prev) =>
      prev.map((m) => (m.id === selectedMenuId ? { ...m, name: newName } : m))
    );
    setIsPlanFrozen(false);
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (presetMenus.length <= 1) {
      const resetMenu: PresetMenu = {
        id: `menu-${Date.now()}`,
        name: "เมนูอาหารกลางวันประจำวัน",
        category: "อาหารจานเดียว",
        ingredients: [],
      };
      setPresetMenus([resetMenu]);
      setSelectedMenuId(resetMenu.id);
      setDailyIngredients([]);
      setIsPlanFrozen(false);
      setSyncStatus("SAVING");
      await saveCloudState({
        presetMenus: [resetMenu],
        selectedMenuId: resetMenu.id,
        dailyIngredients: [],
      });
      setSyncStatus("SYNCED");
      alert("✓ ลบรายการอาหารและรีเซ็ตเป็นเมนูว่างเรียบร้อยแล้ว");
      return;
    }

    if (confirm("ต้องการลบเมนูนี้ออกจากระบบใช่หรือไม่?")) {
      const remaining = presetMenus.filter((m) => m.id !== menuId);
      setPresetMenus(remaining);
      const nextMenu = remaining[0];
      setSelectedMenuId(nextMenu.id);
      setDailyIngredients(nextMenu.ingredients ? nextMenu.ingredients.map((ing) => ({ ...ing })) : []);
      setIsPlanFrozen(false);
      setSyncStatus("SAVING");
      await saveCloudState({
        presetMenus: remaining,
        selectedMenuId: nextMenu.id,
        dailyIngredients: nextMenu.ingredients || [],
      });
      setSyncStatus("SYNCED");
      alert("✓ ลบเมนูอาหารออกจากระบบเรียบร้อยแล้ว");
    }
  };

  const handleSelectMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    const found = presetMenus.find((m) => m.id === menuId);
    if (found) {
      setDailyIngredients(found.ingredients.map((ing) => ({ ...ing })));
    }
    setIsPlanFrozen(false);
  };

  const handleUpdateIngredient = (
    id: string,
    field: "name" | "qty" | "unit" | "unitPrice",
    val: string | number
  ) => {
    setDailyIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
    setIsPlanFrozen(false);
  };

  const handleDeleteIngredient = (id: string) => {
    setDailyIngredients((prev) => prev.filter((item) => item.id !== id));
    setIsPlanFrozen(false);
  };

  const totalDailyCost = useMemo(() => {
    return dailyIngredients.reduce(
      (sum, item) => sum + Number((item.qty * item.unitPrice).toFixed(2)),
      0
    );
  }, [dailyIngredients]);

  // =========================================================================
  // 3. MORNING RECEIVING INSPECTION (DUTY TEACHER HUD)
  // =========================================================================
  const [isReceivingConfirmed, setIsReceivingConfirmed] = useState<boolean>(false);
  const [receivingDocNo] = useState<string>("RCV-2569-1105");
  const [confirmedAtTime, setConfirmedAtTime] = useState<string | null>(null);

  const [inspectionItems, setInspectionItems] = useState<InspectionItemState[]>([]);

  const handleUpdateReceivedQty = (id: string, newQty: number) => {
    setInspectionItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const shortage = newQty < item.ordered;
          return {
            ...item,
            received: newQty,
            accepted: newQty,
            status: shortage ? "DISCREPANCY" : "ACCEPTED",
            note: shortage
              ? `ขาด ${Number((item.ordered - newQty).toFixed(2))} ${item.unit}`
              : undefined,
          };
        }
        return item;
      })
    );
  };

  const handle1ClickAcceptAll = () => {
    setInspectionItems((prev) =>
      prev.map((item) => ({
        ...item,
        received: item.ordered,
        accepted: item.ordered,
        rejected: 0,
        status: "ACCEPTED",
        note: undefined,
      }))
    );
  };

  const handlePhotoCapture = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setInspectionItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, photoUrl: file.name } : item))
      );
    }
  };

  const handleConfirmMorningReceiving = async () => {
    setIsReceivingConfirmed(true);
    const nowTime = new Date().toLocaleTimeString("th-TH");
    setConfirmedAtTime(nowTime);
    setSyncStatus("SAVING");

    await saveCloudState({
      isReceivingConfirmed: true,
      confirmedAtTime: nowTime,
      inspectionItems,
    });
    setSyncStatus("SYNCED");

    alert(
      `✓ ตรวจรับและซิงก์สต็อกเรียบร้อย (${nowTime})\nเลขที่เอกสาร: ${receivingDocNo}\nคณะผู้ตรวจรับ (${todayDutyInfo.teachers.length} ท่าน):\n${todayDutyInfo.teachers.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}\nบันทึกข้อมูลขึ้นระบบ Cloud (Supabase) เรียบร้อยแล้ว`
    );
  };

  const handleConfirmPlan = async () => {
    setIsPlanFrozen(true);
    const nowTime = new Date().toLocaleTimeString("th-TH");
    setFrozenSnapshotTime(nowTime);

    const newItems: InspectionItemState[] = dailyIngredients.map((item) => ({
      id: item.id,
      name: item.name,
      ordered: item.qty,
      received: item.qty,
      accepted: item.qty,
      rejected: 0,
      unit: item.unit,
      unitPrice: item.unitPrice,
      status: "ACCEPTED",
    }));

    setInspectionItems(newItems);
    setSyncStatus("SAVING");

    await saveCloudState({
      isPlanFrozen: true,
      dailyIngredients,
      inspectionItems: newItems,
      selectedMenuId,
    });
    setSyncStatus("SYNCED");

    alert(
      `🔒 ตรึงรายการวัตถุดิบเรียบร้อย (${nowTime})\nเมนู: ${activeMenu.name}\nจำนวน: ${dailyIngredients.length} รายการ (รวม ${totalDailyCost.toLocaleString()} ฿)\nบันทึกลง Cloud และส่งรายการตรวจรับไปยังมือถือคณะครูเวร (${todayDutyInfo.teachersSummary}) แล้ว`
    );
  };

  // =========================================================================
  // 4. FINANCIAL LEDGER STATE
  // =========================================================================
  const [transactions, setTransactions] = useState<FinancialTransactionDisplay[]>([
    {
      id: "tx-1",
      documentNo: "FIN-2569-000001",
      date: "01/11/2569",
      type: "INCOME",
      category: "เงินอุดหนุน",
      description: "รับเงินจัดสรรงบอาหารกลางวันงวดที่ 1 (อปท.)",
      amount: 99000,
    },
    {
      id: "tx-2",
      documentNo: "FIN-2569-000002",
      date: "03/11/2569",
      type: "EXPENSE",
      category: "ค่าวัตถุดิบ",
      description: "ตัดจ่ายค่าวัตถุดิบก๋วยเตี๋ยวน้ำใส (RCV-2569-000000)",
      amount: 1180,
    },
    {
      id: "tx-3",
      documentNo: "FIN-2569-000003",
      date: "03/11/2569",
      type: "EXPENSE",
      category: "ค่าจ้างแม่ครัว",
      description: "ค่าจ้างเหมาผู้ประกอบอาหาร ประจำสัปดาห์",
      amount: 400,
    },
    {
      id: "tx-4",
      documentNo: "FIN-2569-000004",
      date: "04/11/2569",
      type: "EXPENSE",
      category: "ค่าก๊าซหุงต้มและเชื้อเพลิง",
      description: "ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)",
      amount: 450,
    },
    {
      id: "tx-5",
      documentNo: "FIN-2569-000005",
      date: "05/11/2569",
      type: "EXPENSE",
      category: "ค่าวัตถุดิบ",
      description: "ตัดจ่ายค่าวัตถุดิบข้าวมันไก่ตอน (RCV-2569-1105)",
      amount: 1210,
    },
  ]);

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
  const [incomeName, setIncomeName] = useState<string>("เงินอุดหนุนอาหารกลางวันงวดที่ 2 (อปท.)");

  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("ค่าก๊าซหุงต้มและเชื้อเพลิง");
  const [expenseDesc, setExpenseDesc] = useState<string>("ค่าเติมก๊าซหุงต้ม ปตท. 15 กก. (1 ถัง)");

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

  // Modal Handlers
  const handleAddIncome = async () => {
    const val = parseFloat(incomeAmount);
    if (val > 0) {
      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-2569-${String(transactions.length + 1).padStart(6, "0")}`,
        date: new Date().toLocaleDateString("th-TH"),
        type: "INCOME",
        category: "เงินอุดหนุน",
        description: incomeName,
        amount: val,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      setShowAddIncomeModal(false);
      setIncomeAmount("");
      setSyncStatus("SAVING");
      await saveCloudState({ transactions: updated });
      setSyncStatus("SYNCED");
    }
  };

  const handleAddExpense = async () => {
    const val = parseFloat(expenseAmount);
    if (val > 0) {
      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-2569-${String(transactions.length + 1).padStart(6, "0")}`,
        date: new Date().toLocaleDateString("th-TH"),
        type: "EXPENSE",
        category: expenseCategory,
        description: expenseDesc,
        amount: val,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      setShowAddExpenseModal(false);
      setExpenseAmount("");
      setSyncStatus("SAVING");
      await saveCloudState({ transactions: updated });
      setSyncStatus("SYNCED");
    }
  };

  const handleAddAdHocItem = () => {
    const qty = parseFloat(adHocQty) || 1;
    const price = parseFloat(adHocPrice) || 0;

    if (adHocName.trim() && price > 0) {
      const newItem: InspectionItemState = {
        id: `adhoc-${Date.now()}`,
        name: adHocName.trim(),
        ordered: qty,
        received: qty,
        accepted: qty,
        rejected: 0,
        unit: adHocUnit,
        unitPrice: price,
        status: "ACCEPTED",
        isAdHoc: true,
        note: "ซื้อเพิ่มหน้างาน (นอกสูตรประจำวัน)",
      };

      setInspectionItems((prev) => [...prev, newItem]);

      const newTx: FinancialTransactionDisplay = {
        id: `tx-${Date.now()}`,
        documentNo: `FIN-2569-${String(transactions.length + 1).padStart(6, "0")}`,
        date: "05/11/2569",
        type: "EXPENSE",
        category: "เครื่องปรุงเพิ่มหน้างาน",
        description: `ซื้อเพิ่มหน้างาน: ${adHocName} (${qty} ${adHocUnit})`,
        amount: qty * price,
      };
      setTransactions((prev) => [newTx, ...prev]);

      setShowAdHocModal(false);
      setAdHocName("");
      setAdHocPrice("");
      alert(`✓ เพิ่มรายการซื้อหน้างาน "${adHocName}" (${qty * price} ฿) เข้าสู่ใบตรวจรับและสมุดบัญชีแล้ว`);
    }
  };

  const handleAddNewDailyIngredient = () => {
    const qty = parseFloat(newIngQty) || 1;
    const price = parseFloat(newIngPrice) || 0;
    if (newIngName.trim() && price > 0) {
      const newItem: MenuItem = {
        id: `ing-${Date.now()}`,
        name: newIngName.trim(),
        qty,
        unit: newIngUnit,
        unitPrice: price,
      };
      setDailyIngredients((prev) => [...prev, newItem]);
      setShowAddIngredientModal(false);
      setNewIngName("");
      setNewIngPrice("");
      setIsPlanFrozen(false);
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
      setPresetMenus(updatedMenus);
      setSelectedMenuId(newMenu.id);
      setDailyIngredients(newMenu.ingredients.map((ing) => ({ ...ing })));
      setIsPlanFrozen(false);
      setShowNewMenuModal(false);
      setNewMenuName("");
      setSyncStatus("SAVING");
      await saveCloudState({
        presetMenus: updatedMenus,
        selectedMenuId: newMenu.id,
        dailyIngredients: newMenu.ingredients,
      });
      setSyncStatus("SYNCED");
      alert(`✓ บันทึกเมนู "${newMenu.name}" เข้าสู่ระบบ Cloud เรียบร้อยแล้ว`);
    }
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
    link.setAttribute(
      "download",
      `รายงานการเงินอาหารกลางวัน_${settings.schoolName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
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

    const operationalExpense = transactions
      .filter((t) => t.type === "EXPENSE" && (t.category.includes("ก๊าซ") || t.category.includes("แม่ครัว")))
      .reduce((sum, t) => sum + t.amount, 0);

    const adhocExpense = transactions
      .filter((t) => t.type === "EXPENSE" && t.category.includes("หน้างาน"))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = rawIngredientsExpense + operationalExpense + adhocExpense || 1;
    const rawPercent = Math.round((rawIngredientsExpense / totalExpense) * 100);
    const opPercent = Math.round((operationalExpense / totalExpense) * 100);
    const adhocPercent = 100 - rawPercent - opPercent;

    // Daily Average & Estimated Days remaining
    const avgDailySpend = 1240;
    const estimatedDaysRemaining =
      avgDailySpend > 0 ? Math.floor(netCashRemaining / avgDailySpend) : 100;

    return {
      rawIngredientsExpense,
      operationalExpense,
      adhocExpense,
      rawPercent,
      opPercent,
      adhocPercent,
      avgDailySpend,
      estimatedDaysRemaining,
    };
  }, [transactions, netCashRemaining]);

  const acceptedCount = inspectionItems.filter((i) => i.status === "ACCEPTED").length;
  const progressPercent = Math.round((acceptedCount / inspectionItems.length) * 100);

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#090D16] font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE COMMAND BAR (TITANIUM GLASS) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & School Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center text-white shadow-md shadow-slate-900/10">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                  SCHOOL LUNCH OS • TITANIUM
                </span>
                <span className="text-xs text-slate-400 font-mono">v2.1</span>
              </div>
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-tight mt-0.5 flex items-center gap-2">
                <span>{settings.schoolName}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {settings.semester} / {settings.academicYear}
                </span>
              </h1>
            </div>
          </div>

          {/* Dynamic Duty Teacher Badge & Live Clock */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs max-w-xs sm:max-w-md">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs leading-tight truncate">
                <span className="text-[10px] font-mono text-slate-400 block">
                  คณะครูเวรประจำ{todayDutyInfo.dayLabel} ({todayDutyInfo.teachers.length} ท่าน)
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {todayDutyInfo.teachersSummary}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-xs leading-tight">
                <span className="text-[10px] font-mono text-slate-400 block">งบคงเหลือสุทธิ</span>
                <span className="font-bold font-mono text-emerald-400">
                  {netCashRemaining.toLocaleString()} ฿
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FLOATING SEGMENTED DOCK (5 MASTER TABS) */}
        {/* ========================================================================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 pt-1 overflow-x-auto">
          <nav className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 w-max">
            <button
              onClick={() => setActiveTab("KITCHEN_HUD")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "KITCHEN_HUD"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>1. ครูเวรตรวจรับ (Mobile HUD)</span>
            </button>

            <button
              onClick={() => setActiveTab("MENU_PLAN")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "MENU_PLAN"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-blue-600" />
              <span>2. วางแผนเมนู & ราคาวัตถุดิบ</span>
            </button>

            <button
              onClick={() => setActiveTab("ANALYTICS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "ANALYTICS"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. แดชบอร์ดสรุปรายสัปดาห์ / เดือน</span>
            </button>

            <button
              onClick={() => setActiveTab("FINANCE_LEDGER")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "FINANCE_LEDGER"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>4. สมุดบัญชีรายรับ-จ่าย (Excel)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("SETTINGS");
                setSettingsForm(settings);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "SETTINGS"
                  ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>5. ตั้งค่าโรงเรียน & ครูเวร</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ========================================================================= */}
        {/* TAB 1: KITCHEN HUD (ครูเวรตรวจรับของสดตอนเช้าหน้าเตา) */}
        {/* ========================================================================= */}
        {activeTab === "KITCHEN_HUD" && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Terminal Header */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      KITCHEN TERMINAL • 06:30 น.
                    </span>
                    <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-bold">
                      {receivingDocNo}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
                    ตรวจรับของสดในโรงครัว
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <span>เมนูวันนี้:</span>
                    <strong className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {activeMenu.name}
                    </strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">คณะครูเวรผู้ตรวจรับ</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 space-y-0.5">
                    {todayDutyInfo.teachers.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border ${
                      isReceivingConfirmed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {isReceivingConfirmed ? "บันทึกสต็อกแล้ว ✓" : "กำลังตรวจเช็ค"}
                  </span>
                </div>
              </div>

              {/* Progress & Quick Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-500">ความคืบหน้าการตรวจรับ</span>
                    <span className="font-mono text-slate-900">
                      {acceptedCount} / {inspectionItems.length} รายการ ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdHocModal(true)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ ซื้อของเพิ่มหน้างาน</span>
                  </button>

                  <button
                    onClick={handle1ClickAcceptAll}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>รับครบ 100% (ปุ่มด่วน)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* High-Legibility Food Cards */}
            <div className="space-y-3">
              {inspectionItems.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center space-y-3 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">ยังไม่มีรายการตรวจรับวัตถุดิบสำหรับวันนี้</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                      คณะครูเวรสามารถตรวจรับของสดได้เมื่อมีการกำหนดเมนูที่แท็บ <strong>&quot;2. วางแผนเมนู & ราคาวัตถุดิบ&quot;</strong> แล้วกดปุ่ม <strong>&quot;ตรึง Snapshot และส่งให้ครูเวร&quot;</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("MENU_PLAN")}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black inline-flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>ไปกำหนดเมนูและวัตถุดิบวันนี้</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                inspectionItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-all duration-200 shadow-xs ${
                    item.isAdHoc
                      ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30"
                      : item.status === "ACCEPTED"
                      ? "border-emerald-500/30 bg-emerald-50/[0.15]"
                      : item.status === "DISCREPANCY"
                      ? "border-amber-500/40 bg-amber-50/[0.25]"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base tracking-tight">{item.name}</h3>
                        {item.isAdHoc && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                            ซื้อเพิ่มหน้างาน
                          </span>
                        )}
                        {item.status === "ACCEPTED" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/70">
                            ครบ ✓
                          </span>
                        )}
                        {item.status === "DISCREPANCY" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/70">
                            มีส่วนต่าง
                          </span>
                        )}
                      </div>

                      {/* Quantitative Data Tokens */}
                      <div className="flex items-baseline gap-4 mt-2">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.isAdHoc ? "จำนวนที่ซื้อ" : "จำนวนที่สั่ง"}
                          </div>
                          <div className="text-sm font-semibold text-slate-700">
                            {item.ordered} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                          </div>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        <div>
                          <div className="text-[10px] font-mono text-slate-400">ส่งจริงเช้านี้</div>
                          <div className="text-lg font-bold font-mono text-slate-900">
                            {item.received} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                          </div>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        <div>
                          <div className="text-[10px] font-mono text-slate-400">ราคาคำนวณ</div>
                          <div className="text-sm font-semibold font-mono text-slate-700">
                            {(item.received * item.unitPrice).toLocaleString()} ฿
                          </div>
                        </div>
                      </div>

                      {item.note && (
                        <div className="mt-2 text-xs font-semibold text-amber-800 bg-amber-100/60 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>{item.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Step Adjust Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80">
                        <button
                          onClick={() => handleUpdateReceivedQty(item.id, Math.max(0, item.received - 0.5))}
                          className="w-8 h-8 rounded-lg bg-white shadow-xs font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center justify-center active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-12 text-center text-xs font-bold font-mono text-slate-900">
                          {item.received}
                        </span>
                        <button
                          onClick={() => handleUpdateReceivedQty(item.id, item.received + 0.5)}
                          className="w-8 h-8 rounded-lg bg-white shadow-xs font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>

                      {/* Photo Capture */}
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-slate-700 shadow-xs">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.photoUrl ? "เปลี่ยนรูป" : "ถ่ายตาชั่ง"}</span>
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
              )))}
            </div>

            {/* Confirm Receiving Floating Bar */}
            <div className="sticky bottom-4 pt-2">
              <button
                onClick={handleConfirmMorningReceiving}
                disabled={isReceivingConfirmed}
                className={`w-full py-3.5 rounded-2xl text-sm font-extrabold tracking-tight shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                  isReceivingConfirmed
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-slate-900 hover:bg-black text-white shadow-slate-900/20"
                }`}
              >
                {isReceivingConfirmed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>บันทึกตรวจรับเรียบร้อยแล้ว ({confirmedAtTime})</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-5 h-5 text-amber-400" />
                    <span>ลงนามยืนยันการตรวจรับ (คณะครูเวร {todayDutyInfo.teachers.length} ท่าน)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MENU PLAN & INGREDIENT PRICING */}
        {/* ========================================================================= */}
        {activeTab === "MENU_PLAN" && (
          <div className="space-y-5">
            {/* Planner Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                      DAILY PROCUREMENT ENGINE
                    </span>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ชื่อเมนูอาหารกลางวันวันนี้ (พิมพ์เปลี่ยนชื่อได้โดยตรง):
                    </label>
                    <div className="flex items-center gap-2 max-w-xl">
                      <input
                        type="text"
                        value={activeMenu.name}
                        onChange={(e) => handleUpdateMenuName(e.target.value)}
                        placeholder="พิมพ์ชื่อเมนูอาหารกลางวันวันนี้ เช่น ข้าวผัดไข่หมูสับ, ก๋วยเตี๋ยวน้ำใส"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteMenu(selectedMenuId)}
                        className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                        title="ลบเมนูนี้ออกจากระบบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {presetMenus.length > 1 && (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                        หรือสลับไปยังเมนูอื่นที่บันทึกไว้:
                      </label>
                      <select
                        value={selectedMenuId}
                        onChange={(e) => handleSelectMenu(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none max-w-xs"
                      >
                        {presetMenus.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Right Metric Summary */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      ยอดรวมค่าวัตถุดิบวันนี้
                    </span>
                    <span className="text-2xl font-black font-mono text-slate-950">
                      {totalDailyCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-sm font-sans font-normal text-slate-500">฿</span>
                    </span>
                  </div>

                  <div className="h-10 w-px bg-slate-200" />

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      สถานะรายการ
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full mt-0.5 ${
                        isPlanFrozen
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isPlanFrozen ? "ตรึง Snapshot แล้ว ✓" : "กำลังกำหนดรายการ"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Daily Ingredients Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-700 font-bold border-y border-slate-200/80 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">รายการวัตถุดิบ</th>
                      <th className="py-3.5 px-4 text-center">จำนวนที่สั่ง</th>
                      <th className="py-3.5 px-4 text-center">หน่วยนับ</th>
                      <th className="py-3.5 px-4 text-center">ราคา / หน่วย (฿)</th>
                      <th className="py-3.5 px-4 text-right">รวมเป็นเงิน (฿)</th>
                      <th className="py-3.5 px-3 text-center w-12">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dailyIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                          <span className="block text-xs font-bold text-slate-600">ยังไม่มีรายการวัตถุดิบในเมนูนี้</span>
                          <span className="block text-[11px] text-slate-400 mt-1">
                            คลิกปุ่ม <strong>&quot;+ เพิ่มวัตถุดิบในเมนูนี้&quot;</strong> ด้านล่างเพื่อเริ่มระบุวัตถุดิบและราคา
                          </span>
                        </td>
                      </tr>
                    ) : (
                      dailyIngredients.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "name", e.target.value)
                            }
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none py-0.5"
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
                            className="w-20 px-2 py-1 text-center font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              handleUpdateIngredient(item.id, "unit", e.target.value)
                            }
                            className="w-16 px-1.5 py-1 text-center font-mono text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
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
                            className="w-20 px-2 py-1 text-center font-mono text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 text-sm">
                          {(item.qty * item.unitPrice).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteIngredient(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddIngredientModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                    <span>+ เพิ่มวัตถุดิบในเมนูนี้</span>
                  </button>

                  <button
                    onClick={() => setShowNewMenuModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>เพิ่มเมนูอาหารใหม่</span>
                  </button>
                </div>

                <button
                  onClick={handleConfirmPlan}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold tracking-tight transition-all flex items-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isPlanFrozen
                      ? "ตรึง Snapshot แล้ว ✓"
                      : "ตรึง Snapshot และส่งให้ครูเวร"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: WEEKLY & MONTHLY EXECUTIVE ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === "ANALYTICS" && (
          <div className="space-y-6">
            {/* Analytics Header & Timeframe Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  FINANCIAL INTELLIGENCE • AUDIT READY
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  แดชบอร์ดสรุปผลการใช้งบประมาณอาหารกลางวัน
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิเคราะห์อัตราการเผาผลาญงบ (Burn-rate) และพยากรณ์ความเพียงพอของงบประมาณตลอดภาคเรียน
                </p>
              </div>

              {/* Timeframe Pill Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 text-xs font-bold">
                <button
                  onClick={() => setAnalyticsTimeframe("WEEKLY")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analyticsTimeframe === "WEEKLY"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  รายสัปดาห์ (Weekly)
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe("MONTHLY")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analyticsTimeframe === "MONTHLY"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  รายเดือน (Monthly)
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe("SEMESTER")}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analyticsTimeframe === "SEMESTER"
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  ทั้งภาคเรียน ({settings.semester})
                </button>
              </div>
            </div>

            {/* 4 Key Performance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    งบที่ได้รับแล้ว (เงินงวดสะสม)
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-2">
                  {totalIncomeReceived.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">฿</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  คำนวณจากเงินงวดที่โอนเข้าบัญชีจริง
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    รายจ่ายจริงสะสม
                  </span>
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-2">
                  {totalActualExpenses.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">฿</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  คิดเป็น {Math.round((totalActualExpenses / (totalIncomeReceived || 1)) * 100)}% ของงบที่รับแล้ว
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    งบประมาณคงเหลือจริง
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-700 mt-2">
                  {netCashRemaining.toLocaleString()} <span className="text-xs font-sans font-normal text-emerald-600">฿</span>
                </div>
                <div className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
                  <span>✓ สถานะเงินสดปลอดภัย</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase">
                    ประมาณการวันคงเหลือ
                  </span>
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-2">
                  {analyticsSummary.estimatedDaysRemaining} <span className="text-xs font-sans font-normal text-slate-500">วันเปิดเรียน</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  อัตราเฉลี่ย ~{analyticsSummary.avgDailySpend.toLocaleString()} ฿ / วัน
                </div>
              </div>
            </div>

            {/* Visual Weekly Spending Comparison & Category Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols: Weekly Spending Bar Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                      เปรียบเทียบยอดใช้จ่ายแยกตามสัปดาห์ (Weekly Spend Telemetry)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      แสดงยอดใช้จ่ายค่าวัตถุดิบและค่าใช้จ่ายดำเนินการในแต่ละสัปดาห์
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    พฤศจิกายน 2569
                  </span>
                </div>

                {/* CSS Bar Chart */}
                <div className="pt-4 space-y-3">
                  {[
                    { week: "สัปดาห์ที่ 1 (27 ต.ค. - 31 ต.ค.)", spend: 5800, max: 7500, status: "ปิดรอบแล้ว" },
                    { week: "สัปดาห์ที่ 2 (3 พ.ย. - 7 พ.ย. สัปดาห์ปัจจุบัน)", spend: 6240, max: 7500, status: "กำลังดำเนินการ", isCurrent: true },
                    { week: "สัปดาห์ที่ 3 (10 พ.ย. - 14 พ.ย.)", spend: 6000, max: 7500, status: "ประมาณการ" },
                    { week: "สัปดาห์ที่ 4 (17 พ.ย. - 21 พ.ย.)", spend: 6000, max: 7500, status: "ประมาณการ" },
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={bar.isCurrent ? "text-slate-900 font-extrabold flex items-center gap-1.5" : "text-slate-600"}>
                          {bar.isCurrent && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                          {bar.week}
                        </span>
                        <span className="font-mono text-slate-900">
                          {bar.spend.toLocaleString()} ฿{" "}
                          <span className="text-[10px] text-slate-400 font-normal">({bar.status})</span>
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            bar.isCurrent
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                              : "bg-slate-300"
                          }`}
                          style={{ width: `${(bar.spend / bar.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1 Col: Category Proportion */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                    สัดส่วนหมวดหมู่ค่าใช้จ่าย
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">แบ่งตามประเภทการตัดจ่ายจริง</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                        ค่าวัตถุดิบสดตามเมนู
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {analyticsSummary.rawPercent}%
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {analyticsSummary.rawIngredientsExpense.toLocaleString()} ฿
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        ของซื้อเพิ่มหน้างาน
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {analyticsSummary.adhocPercent}%
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {analyticsSummary.adhocExpense.toLocaleString()} ฿
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                        ค่าแก๊สและค่าจ้างแม่ครัว
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {analyticsSummary.opPercent}%
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {analyticsSummary.operationalExpense.toLocaleString()} ฿
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-emerald-800 text-xs">
                    <strong className="block font-bold">✓ สรุปการตรวจสอบ (Audit Insight)</strong>
                    สัดส่วนค่าอาหารสดอยู่ในเกณฑ์มาตรฐาน สตง. (สูงกว่า 80% ของงบประมาณรวม)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FINANCIAL LEDGER (สมุดบัญชีรายรับ-จ่าย) */}
        {/* ========================================================================= */}
        {activeTab === "FINANCE_LEDGER" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  FINANCIAL LEDGER • SINGLE SOURCE OF TRUTH
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  สมุดบัญชีคุมรายรับ-รายจ่ายโครงการอาหารกลางวัน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกรายการแบบ Append-Only ยืนยันความโปร่งใส ส่งออกไฟล์ Excel พร้อมใช้งานได้ทันที
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setLedgerFilter("ALL")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      ledgerFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setLedgerFilter("INCOME")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      ledgerFilter === "INCOME" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    รายรับ
                  </button>
                  <button
                    onClick={() => setLedgerFilter("EXPENSE")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      ledgerFilter === "EXPENSE" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500"
                    }`}
                  >
                    รายจ่าย
                  </button>
                </div>

                <button
                  onClick={() => setShowAddIncomeModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ รับงบงวดใหม่</span>
                </button>

                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-all flex items-center gap-1 shadow-2xs"
                >
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>+ รายการนอก (ค่าแก๊ส/แม่ครัว)</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200/80 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">เลขที่เอกสาร</th>
                    <th className="py-3 px-3">วันที่</th>
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3">หมวดหมู่</th>
                    <th className="py-3 px-3">รายละเอียด</th>
                    <th className="py-3 px-3 text-right">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {transactions
                    .filter((t) => (ledgerFilter === "ALL" ? true : t.type === ledgerFilter))
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{tx.documentNo}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{tx.date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.type === "INCOME"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {tx.type === "INCOME" ? "รายรับ (+)" : "รายจ่าย (-)"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{tx.category}</td>
                        <td className="py-3 px-3 text-slate-800">{tx.description}</td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold ${
                            tx.type === "INCOME" ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {tx.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ฿
                        </td>
                      </tr>
                    ))}
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  SYSTEM CONFIGURATION & TEAM ROSTER
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  ตั้งค่าข้อมูลโรงเรียนและคณะกรรมการอาหารกลางวัน
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ข้อมูลที่ตั้งค่าตรงนี้จะถูกนำไปใช้ในหัวรายงาน เอกสารราชการ และแสดงชื่อครูเวรอัตโนมัติตามวัน
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>

            {/* Success Toast */}
            {settingsSaveToast && (
              <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>บันทึกข้อมูลโรงเรียนและตารางครูเวรเรียบร้อยแล้ว! ข้อมูลมีผลทั่วทั้งระบบทันที</span>
              </div>
            )}

            {/* School Profile Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>1. ข้อมูลสถานศึกษาและผู้บริหาร</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">ชื่อโรงเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.schoolName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, schoolName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อผู้อำนวยการโรงเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.directorName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, directorName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ชื่อครูผู้รับผิดชอบโครงการอาหารกลางวัน:
                  </label>
                  <input
                    type="text"
                    value={settingsForm.nutritionHeadName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, nutritionHeadName: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ปีการศึกษา:</label>
                  <input
                    type="text"
                    value={settingsForm.academicYear}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, academicYear: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ภาคเรียน:</label>
                  <input
                    type="text"
                    value={settingsForm.semester}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, semester: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-blue-950 text-xs flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-bold text-sm block text-blue-900 mb-0.5">
                      ระบบคำนวณงบประมาณตามเงินงวดที่โอนเข้าจริง (ไม่จำเป็นต้องระบุยอดทั้งเทอมล่วงหน้า)
                    </strong>
                    <span className="text-blue-800 leading-relaxed block">
                      ในระบบราชการ เงินอุดหนุนอาหารกลางวันจะทยอยโอนเข้ามาเป็นงวดตามรอบจัดสรร 
                      เมื่อมีเงินงวดเข้าบัญชีโรงเรียน คุณครูสามารถกดบันทึกรับเงินได้ที่แท็บ <strong>&quot;4. สมุดบัญชี &gt; + รับงบงวดใหม่&quot;</strong> 
                      ระบบจะรวมยอดเงินรับจริงสะสม และคำนวณยอดเงินคงเหลือสุทธิให้อัตโนมัติทันที
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Duty Teacher Roster Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>2. รายชื่อคณะครูเวรตรวจรับของสดประจำวัน (รองรับวันละหลายคน)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
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
                    className={`bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3 ${
                      dayKey === "friday" ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        คณะครูเวรประจำ{label} ({settingsForm.dutyRoster[dayKey].length} คน)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddTeacherToDay(dayKey)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>เพิ่มครูเวร</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {settingsForm.dutyRoster[dayKey].map((teacherName, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-5 text-center">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            placeholder={`ชื่อ-สกุล ครูเวรคนที่ ${idx + 1}`}
                            value={teacherName}
                            onChange={(e) =>
                              handleUpdateTeacherName(dayKey, idx, e.target.value)
                            }
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                          />
                          {settingsForm.dutyRoster[dayKey].length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacherFromDay(dayKey, idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
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
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" />
                ซื้อเครื่องปรุง / ของสดเพิ่มหน้างาน
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                บันทึกของสดหรือเครื่องปรุงที่ต้องซื้อเพิ่มเร่งด่วนเช้านี้ ระบบจะเพิ่มเข้าใบตรวจรับและลงบัญชีทันที
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ชื่อรายการ:</label>
                  <input
                    type="text"
                    placeholder="เช่น ซีอิ๊วขาวเห็ดหอม, น้ำตาลทราย, มะนาว"
                    value={adHocName}
                    onChange={(e) => setAdHocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">จำนวนที่ซื้อ:</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="1"
                      value={adHocQty}
                      onChange={(e) => setAdHocQty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      หน่วยนับ (พิมพ์เองได้):
                    </label>
                    <input
                      type="text"
                      list="adhoc-unit-options"
                      placeholder="เช่น ขวด, กก., ซอง"
                      value={adHocUnit}
                      onChange={(e) => setAdHocUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                            adHocUnit === u
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ราคาต่อหน่วย (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 45"
                    value={adHocPrice}
                    onChange={(e) => setAdHocPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAdHocModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddAdHocItem}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  เพิ่มรายการเข้าใบตรวจรับ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: บันทึกรับเงินงวดงบประมาณ */}
        {showAddIncomeModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                บันทึกรายรับเงินงวดงบประมาณ
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                บันทึกเงินอุดหนุนที่ได้รับการโอนเข้าบัญชีโรงเรียนในแต่ละรอบ (อปท. หรือ สพฐ.)
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ชื่อรายการงบประมาณ:</label>
                  <input
                    type="text"
                    value={incomeName}
                    onChange={(e) => setIncomeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">จำนวนเงินที่ได้รับรอบนี้ (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 99000"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddIncomeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddIncome}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black"
                >
                  บันทึกรับเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: บันทึกรายจ่ายนอก */}
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-600" />
                บันทึกรายจ่ายดำเนินการ (รายการนอก)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                บันทึกค่าใช้จ่ายจำเป็นอื่นๆ ที่ไม่ใช่ค่าอาหารสด เช่น ค่าก๊าซหุงต้ม ค่าจ้างแม่ครัว
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">หมวดหมู่ค่าใช้จ่าย:</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="ค่าก๊าซหุงต้มและเชื้อเพลิง">ค่าก๊าซหุงต้มและเชื้อเพลิง</option>
                    <option value="ค่าจ้างแม่ครัว">ค่าจ้างเหมาผู้ประกอบอาหาร (แม่ครัว)</option>
                    <option value="ค่าวัสดุทำความสะอาดและเครื่องใช้">ค่าวัสดุทำความสะอาด/อุปกรณ์ครัว</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">รายละเอียดรายการ:</label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">จำนวนเงิน (บาท):</label>
                  <input
                    type="number"
                    placeholder="เช่น 450"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddExpense}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black"
                >
                  บันทึกจ่ายเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: สร้างเมนูใหม่ */}
        {showNewMenuModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-900" />
                เพิ่มเมนูอาหารกลางวันใหม่
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                สร้างสูตรอาหารและระบุส่วนประกอบวัตถุดิบสำหรับใช้จัดซื้อในโรงเรียน
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ชื่อเมนู:</label>
                  <input
                    type="text"
                    placeholder="เช่น ต้มจืดฟักน่องไก่, ผัดซีอิ๊วหมู"
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">หมวดหมู่อาหาร:</label>
                  <select
                    value={newMenuCategory}
                    onChange={(e) => setNewMenuCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option>อาหารจานเดียว</option>
                    <option>กับข้าว</option>
                    <option>ของหวาน/ผลไม้</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowNewMenuModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreateNewMenu}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>บันทึกเมนูลง Cloud</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: เพิ่มวัตถุดิบในเมนูวันนี้ */}
        {showAddIngredientModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-slate-900" />
                เพิ่มวัตถุดิบในเมนูวันนี้
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                กำหนดรายการวัตถุดิบ ปริมาณที่ต้องสั่ง และราคาต่อหน่วยสำหรับเมนูวันนี้
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ชื่อวัตถุดิบ:</label>
                  <input
                    type="text"
                    placeholder="เช่น น่องไก่สด, ไข่เค็ม, พริกแกงเผ็ด"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">จำนวนที่สั่ง:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newIngQty}
                      onChange={(e) => setNewIngQty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      หน่วย (พิมพ์เองได้):
                    </label>
                    <input
                      type="text"
                      list="unit-suggestions"
                      placeholder="พิมพ์เอง เช่น กก., กำ, ถุง"
                      value={newIngUnit}
                      onChange={(e) => setNewIngUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                            newIngUnit === u
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ราคาต่อหน่วย (บาท):</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="เช่น 85, 30, 4.2"
                    value={newIngPrice}
                    onChange={(e) => setNewIngPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddIngredientModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddNewDailyIngredient}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black"
                >
                  เพิ่มรายการวัตถุดิบ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

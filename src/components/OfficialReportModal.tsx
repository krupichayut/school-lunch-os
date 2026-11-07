"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  X,
  FileText,
  Calendar,
  CheckCircle2,
  Table as TableIcon,
  Receipt,
} from "lucide-react";
import {
  SchoolSettings,
  DayKey,
  DayDefinition,
  DayPlan,
  WeeklyPlan,
  InspectionItemState,
  FinancialTransactionDisplay,
  DAY_DEFINITIONS,
  DEFAULT_WEEKDAY_DATES,
  formatThaiDateFull,
  formatThaiDateShort,
  parseDateToTimestamp,
} from "@/lib/storage";
import { toBahtText, toThaiNumerals } from "@/lib/baht-text";

export type OfficialFormType = "RECEIVING" | "WEEKLY_PLAN" | "LEDGER";

interface OfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFormType?: OfficialFormType;
  settings: SchoolSettings;
  selectedDayKey: DayKey;
  activeDayDefinition: DayDefinition;
  activeDayPlan: DayPlan;
  inspectionItems: InspectionItemState[];
  weeklyPlan: WeeklyPlan;
  financialTransactions: FinancialTransactionDisplay[];
  receivingDocNo: string;
  confirmedAtTime?: string | null;
}

export default function OfficialReportModal({
  isOpen,
  onClose,
  initialFormType = "RECEIVING",
  settings,
  selectedDayKey,
  activeDayDefinition,
  activeDayPlan,
  inspectionItems,
  weeklyPlan,
  financialTransactions,
  receivingDocNo,
  confirmedAtTime,
}: OfficialReportModalProps) {
  const [activeForm, setActiveForm] = useState<OfficialFormType>(initialFormType);

  useEffect(() => {
    if (isOpen && initialFormType) {
      setActiveForm(initialFormType);
    }
  }, [isOpen, initialFormType]);

  if (!isOpen) return null;

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Calculations for Form 1 (แบบ ตร.01: ใบตรวจรับพัสดุ)
  const receivingTotalAmount = inspectionItems.reduce((sum, item) => {
    const qty = item.accepted || item.received || item.ordered || 0;
    return sum + Number((qty * item.unitPrice).toFixed(2));
  }, 0);

  const dutyTeachers =
    settings.dutyRoster?.[selectedDayKey] && settings.dutyRoster[selectedDayKey].length > 0
      ? settings.dutyRoster[selectedDayKey]
      : ["ครูเวรประจำวัน"];

  // Calculations for Form 2 (แบบ อห.02: สรุปแผนอาหารสัปดาห์)
  const totalWeeklyPlannedCost = DAY_DEFINITIONS.reduce((acc, def) => {
    const day = weeklyPlan[def.key];
    const cost = (day?.ingredients || []).reduce(
      (sum, item) => sum + Number((item.qty * item.unitPrice).toFixed(2)),
      0
    );
    return acc + cost;
  }, 0);

  const estimatedDiners = settings.studentCount || 86;
  const subsidyPerDiner = settings.subsidyPerHead || 27.0;
  const daysPerRound = settings.daysPerInstallment || 20;
  const weeklyAllocation = estimatedDiners * subsidyPerDiner * 5;
  const weeklyRemainingBalance = weeklyAllocation - totalWeeklyPlannedCost;

  // Calculations for Form 3 (แบบ ทค.03: ทะเบียนคุมรายรับ-รายจ่าย)
  const totalIncome = financialTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = financialTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashRemaining = totalIncome - totalExpense;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-report-printable-area,
          #official-report-printable-area * {
            visibility: visible;
          }
          #official-report-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 18mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Dialog Shell */}
      <div className="bg-[#FAF9F6] w-full max-w-5xl rounded-3xl shadow-2xl border border-[#E7E4DC] flex flex-col my-auto overflow-hidden print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print p-4 sm:p-5 bg-white border-b border-[#E7E4DC] flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF4F0] text-[#1F5E4B] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#18201C] text-sm sm:text-base leading-tight">
                แบบฟอร์มเอกสารรายงานราชการ (A4)
              </h3>
              <p className="text-xs text-[#66746C]">
                {settings.schoolName} • ภาคเรียนที่ {settings.semester} / {settings.academicYear}
              </p>
            </div>
          </div>

          {/* Form Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#F4F2EB] p-1 rounded-xl border border-[#E7E4DC] text-xs font-bold overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveForm("RECEIVING")}
              className={`px-3 py-1.5 rounded-lg transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
                activeForm === "RECEIVING"
                  ? "bg-white text-[#1F5E4B] shadow-xs"
                  : "text-[#66746C] hover:text-[#18201C]"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>แบบ ตร.01 (ใบตรวจรับ)</span>
            </button>
            <button
              onClick={() => setActiveForm("WEEKLY_PLAN")}
              className={`px-3 py-1.5 rounded-lg transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
                activeForm === "WEEKLY_PLAN"
                  ? "bg-white text-[#1F5E4B] shadow-xs"
                  : "text-[#66746C] hover:text-[#18201C]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>แบบ อห.02 (แผนสัปดาห์)</span>
            </button>
            <button
              onClick={() => setActiveForm("LEDGER")}
              className={`px-3 py-1.5 rounded-lg transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
                activeForm === "LEDGER"
                  ? "bg-white text-[#1F5E4B] shadow-xs"
                  : "text-[#66746C] hover:text-[#18201C]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>แบบ ทค.03 (ทะเบียนคุมเงิน)</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white text-xs font-bold transition-smooth flex items-center gap-1.5 shadow-soft"
            >
              <Printer className="w-4 h-4 text-[#EAD598]" />
              <span>สั่งพิมพ์ (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#E7E4DC] hover:bg-[#FAF9F6] text-[#66746C] hover:text-[#18201C] transition-smooth"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Container Body */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[82vh] print:max-h-none print:overflow-visible print:p-0">
          <div
            id="official-report-printable-area"
            className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-6 sm:p-10 text-[#18201C] rounded-2xl sm:rounded-3xl shadow-xs border border-[#ECE8DE] print:border-none print:shadow-none print:rounded-none print:p-0 leading-relaxed font-sans"
            style={{ fontFamily: "'Sarabun', sans-serif" }}
          >
            {/* ========================================================================= */}
            {/* FORM 1: แบบ ตร.01 ใบตรวจรับพัสดุ (วัตถุดิบอาหารกลางวันประจำวัน)            */}
            {/* ========================================================================= */}
            {activeForm === "RECEIVING" && (
              <div>
                {/* Official Clean School Header (NO Garuda) */}
                <div className="border-b-2 border-black pb-3 mb-3 text-center">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    ใบตรวจรับพัสดุ (วัตถุดิบประกอบอาหารกลางวันนักเรียน)
                  </h2>
                  <p className="text-[15px] font-semibold mt-0.5 text-gray-800">
                    {settings.schoolName}
                  </p>
                  <p className="text-[13px] text-gray-600">
                    โครงการอาหารกลางวันนักเรียน ภาคเรียนที่ {settings.semester} ปีการศึกษา {settings.academicYear}
                  </p>
                </div>

                {/* Metadata Box */}
                <div className="bg-[#FBFBFA] border border-gray-300 rounded-lg p-2.5 mb-3 text-[13.5px]">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <span className="font-bold text-gray-700">วันที่ตรวจรับ:</span>{" "}
                      <span>
                        {activeDayPlan.inspectionDate
                          ? formatThaiDateFull(activeDayPlan.inspectionDate)
                          : `${activeDayDefinition.label} (สัปดาห์ปัจจุบัน)`}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">เลขที่เอกสารตรวจรับ:</span>{" "}
                      <span className="font-mono font-semibold">{receivingDocNo}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">เวลาตรวจรับหน้าเตา:</span>{" "}
                      <span>{confirmedAtTime ? `${confirmedAtTime} น.` : "06:30 น."} (ณ โรงครัว)</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">จำนวนนักเรียนที่รับบริการ:</span>{" "}
                      <span>{estimatedDiners} คน (อัตรา {subsidyPerDiner.toFixed(2)} บาท/คน/วัน)</span>
                    </div>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                    <span className="font-bold text-gray-700">รายการเมนูประจำวัน:</span>{" "}
                    <span className="font-bold text-[#1F5E4B]">
                      {activeDayPlan.menuName || `เมนู${activeDayDefinition.label}`}
                    </span>
                    <span className="text-xs text-gray-500 ml-1.5">
                      (หมวด: {activeDayPlan.category || "อาหารจานเดียว"})
                    </span>
                  </div>
                </div>

                {/* Intro Text */}
                <div className="text-[13.5px] text-justify mb-2">
                  <p className="indent-6">
                    คณะกรรมการตรวจรับพัสดุ ได้ร่วมกันทำการตรวจรับวัตถุดิบอาหารสด เครื่องปรุง และผลไม้ เพื่อประกอบอาหารกลางวันสำหรับนักเรียน ผลการตรวจสอบปริมาณ คุณภาพ และราคา มีรายละเอียดดังนี้
                  </p>
                </div>

                {/* Inspection Table */}
                <table className="w-full border-collapse border border-black text-[13px] mb-3">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center border-b border-black">
                      <th className="border border-black p-1.5 w-10">ลำดับ</th>
                      <th className="border border-black p-1.5 text-left">รายการพัสดุ / วัตถุดิบ</th>
                      <th className="border border-black p-1.5 w-16">จำนวนสั่ง</th>
                      <th className="border border-black p-1.5 w-14">หน่วย</th>
                      <th className="border border-black p-1.5 w-20 text-right">ราคา/หน่วย</th>
                      <th className="border border-black p-1.5 w-24 text-right">จำนวนเงิน</th>
                      <th className="border border-black p-1.5 w-28">ผลการตรวจรับ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-black p-4 text-center text-gray-500">
                          ยังไม่มีรายการวัตถุดิบในใบตรวจรับของ{activeDayDefinition.label}
                        </td>
                      </tr>
                    ) : (
                      inspectionItems.map((item, idx) => {
                        const qty = item.accepted || item.received || item.ordered || 0;
                        const lineTotal = Number((qty * item.unitPrice).toFixed(2));
                        return (
                          <tr key={item.id} className={item.isAdHoc ? "bg-amber-50/50" : ""}>
                            <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                            <td className="border border-black p-1.5">
                              <span className="font-medium">{item.name}</span>
                              {item.isAdHoc && (
                                <span className="text-[11px] text-amber-800 ml-1.5 font-bold">
                                  (ซื้อเพิ่มหน้างาน)
                                </span>
                              )}
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono">
                              {item.ordered.toLocaleString()}
                            </td>
                            <td className="border border-black p-1.5 text-center">{item.unit}</td>
                            <td className="border border-black p-1.5 text-right font-mono">
                              {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono font-bold">
                              {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-black p-1.5 text-center text-emerald-800 font-bold text-xs">
                              {item.status === "ACCEPTED" ? "✓ ครบถ้วน (สด สะอาด)" : "✓ ตรวจรับแล้ว"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-black">
                      <td colSpan={5} className="border border-black p-1.5 text-right pr-3">
                        รวมเป็นเงินทั้งสิ้น (ตัวเลข):
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono text-[#1F5E4B]">
                        {receivingTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-black p-1.5 text-center text-xs">บาท</td>
                    </tr>
                    <tr className="bg-white font-bold text-center border-t border-black">
                      <td colSpan={7} className="border border-black p-2 text-[13.5px]">
                        ( จำนวนเงินตัวอักษร:{" "}
                        <span className="underline decoration-dotted underline-offset-4">
                          {toBahtText(receivingTotalAmount)}
                        </span>{" "}
                        )
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Attestation Clause */}
                <div className="text-[13.5px] text-justify leading-relaxed">
                  <p className="indent-6">
                    คณะกรรมการตรวจรับพัสดุ ได้ร่วมกันตรวจสอบพัสดุ/วัตถุดิบตามรายการข้างต้นแล้ว ปรากฏว่ามีปริมาณและคุณภาพถูกต้อง ครบถ้วนตามรายการที่ระบุไว้ วัตถุดิบมีความสด สะอาด ปลอดภัย ตรงตามเกณฑ์โภชนาการ และได้ส่งมอบให้ผู้รับจ้างประกอบอาหารนำไปปรุงให้แก่นักเรียนเรียบร้อยแล้ว จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน
                  </p>
                </div>

                {/* Signatures 3 Columns */}
                <div className="mt-5 grid grid-cols-2 gap-4 text-[13.5px]">
                  <div></div>
                  <div className="space-y-3.5 text-center">
                    <div>
                      <p>ลงชื่อ ..................................................... ประธานกรรมการ</p>
                      <p className="mt-0.5 font-bold">({dutyTeachers[0] || "ครูเวรประจำวัน"})</p>
                      <p className="text-xs text-gray-600">ครูเวรประจำวัน / ผู้ตรวจรับพัสดุ</p>
                    </div>

                    <div>
                      <p>ลงชื่อ ..................................................... กรรมการ</p>
                      <p className="mt-0.5 font-bold">({dutyTeachers[1] || "ครูเวรประจำวัน"})</p>
                      <p className="text-xs text-gray-600">ครูเวรประจำวัน / ผู้ตรวจรับพัสดุ</p>
                    </div>

                    <div>
                      <p>ลงชื่อ ..................................................... ผู้ส่งมอบ/ผู้ประกอบอาหาร</p>
                      <p className="mt-0.5 font-bold">( นางวันเพ็ญ รสมือทอง )</p>
                      <p className="text-xs text-gray-600">ผู้รับจ้างเหมาประกอบอาหาร</p>
                    </div>
                  </div>
                </div>

                {/* Director Approval */}
                <div className="mt-4 pt-2.5 border-t border-black text-[13.5px]">
                  <div className="w-8/12">
                    <p className="font-bold">ความเห็นของผู้อำนวยการสถานศึกษา:</p>
                    <p className="mt-0.5 flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border border-black text-center leading-3 font-bold">
                        ✓
                      </span>
                      <span>ทราบ และเห็นชอบผลการตรวจรับพัสดุ ให้ดำเนินการเบิกจ่ายตามระเบียบต่อไป</span>
                    </p>
                    <div className="text-center mt-3.5">
                      <p>ลงชื่อ .....................................................</p>
                      <p className="mt-0.5 font-bold">({settings.directorName})</p>
                      <p className="text-xs text-gray-700">ผู้อำนวยการ{settings.schoolName}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Telemetry */}
                <div className="mt-4 pt-1.5 border-t border-gray-300 flex justify-between text-[11px] text-gray-500">
                  <span>แบบ ตร.01 ใบตรวจรับพัสดุประจำวัน | โครงการอาหารกลางวันนักเรียน {settings.schoolName}</span>
                  <span>หน้า 1 จาก 1</span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* FORM 2: แบบ อห.02 สรุปแผนอาหาร 5 วันประจำสัปดาห์                          */}
            {/* ========================================================================= */}
            {activeForm === "WEEKLY_PLAN" && (
              <div>
                {/* Header (NO Garuda) */}
                <div className="border-b-2 border-black pb-3 mb-4 text-center">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    แบบรายงานแผนการจัดอาหารกลางวันและประมาณการค่าใช้จ่ายประจำสัปดาห์
                  </h2>
                  <p className="text-[15px] font-semibold mt-0.5 text-gray-800">
                    {settings.schoolName}
                  </p>
                  <p className="text-[13.5px] text-gray-700">
                    ภาคเรียนที่ {settings.semester} ปีการศึกษา {settings.academicYear}
                  </p>
                  <p className="text-[12.5px] text-gray-600 mt-0.5">
                    จำนวนนักเรียนที่ได้รับจัดสรร: {estimatedDiners} คน (อัตรา {subsidyPerDiner.toFixed(2)} บาท/คน/วัน)
                    {settings.currentRoundTitle ? ` | รอบจัดสรร: ${settings.currentRoundTitle} (${daysPerRound} วันทำการ)` : ""}
                  </p>
                </div>

                {/* Allocation Summary Box */}
                <div className="border border-black p-3 rounded-lg mb-3 bg-[#FAFAFA] text-[13.5px]">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="block text-gray-600 text-xs">งบประมาณจัดสรรประจำสัปดาห์:</span>
                      <span className="font-bold text-base">
                        {weeklyAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        ({estimatedDiners} คน × {subsidyPerDiner} บาท × 5 วัน)
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-600 text-xs">ประมาณการค่าวัตถุดิบสด 5 วัน:</span>
                      <span className="font-bold text-base text-emerald-800">
                        {totalWeeklyPlannedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        (เฉลี่ย {(totalWeeklyPlannedCost / 5).toLocaleString()} บาท/วัน)
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-600 text-xs">คงเหลือเพื่อการดำเนินงาน/แม่ครัว/แก๊ส:</span>
                      <span className="font-bold text-base text-blue-800">
                        {weeklyRemainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        (คิดเป็นร้อยละ {((weeklyRemainingBalance / (weeklyAllocation || 1)) * 100).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5-Day Weekly Table */}
                <table className="w-full border-collapse border border-black text-[13px] mb-3">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center border-b border-black">
                      <th className="border border-black p-1.5 w-24">วันทำการ</th>
                      <th className="border border-black p-1.5 text-left">ชื่อเมนูอาหารกลางวันและผลไม้</th>
                      <th className="border border-black p-1.5 w-24">หมวดหมู่</th>
                      <th className="border border-black p-1.5 w-20">จำนวนวัตถุดิบ</th>
                      <th className="border border-black p-1.5 w-24 text-right">ประมาณการ (บาท)</th>
                      <th className="border border-black p-1.5 w-32">คณะครูเวรประจำวัน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_DEFINITIONS.map(({ key, label }) => {
                      const dayPlan = weeklyPlan[key];
                      const ingredients = dayPlan?.ingredients || [];
                      const dayCost = ingredients.reduce(
                        (sum, item) => sum + Number((item.qty * item.unitPrice).toFixed(2)),
                        0
                      );
                      const roster = settings.dutyRoster?.[key] || [];

                      return (
                        <tr key={key}>
                          <td className="border border-black p-2 text-center">
                            <span className="font-bold block">{label}</span>
                            <span className="text-[11px] text-gray-600 block mt-0.5 font-mono">
                              {formatThaiDateShort(dayPlan?.inspectionDate || DEFAULT_WEEKDAY_DATES[key])}
                            </span>
                          </td>
                          <td className="border border-black p-2">
                            <span className="font-semibold text-gray-900">
                              {dayPlan?.menuName || "ยังไม่ระบุเมนู"}
                            </span>
                          </td>
                          <td className="border border-black p-2 text-center text-xs">
                            {dayPlan?.category || "อาหารจานเดียว"}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">
                            {ingredients.length} รายการ
                          </td>
                          <td className="border border-black p-2 text-right font-mono font-bold">
                            {dayCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border border-black p-2 text-center text-xs">
                            {roster.length > 0 ? roster.join(", ") : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-black">
                      <td colSpan={4} className="border border-black p-2 text-right pr-3">
                        รวมประมาณการค่าวัตถุดิบทั้งสิ้น 5 วัน:
                      </td>
                      <td className="border border-black p-2 text-right font-mono text-emerald-800 text-sm">
                        {totalWeeklyPlannedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-black p-2 text-center text-xs">บาท</td>
                    </tr>
                    <tr className="bg-white font-bold text-center border-t border-black">
                      <td colSpan={6} className="border border-black p-2 text-[13px]">
                        ( จำนวนเงินตัวอักษร:{" "}
                        <span className="underline decoration-dotted">
                          {toBahtText(totalWeeklyPlannedCost)}
                        </span>{" "}
                        )
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-[14px]">
                  <div className="text-center">
                    <p>ลงชื่อ .....................................................</p>
                    <p className="mt-1 font-bold">({settings.nutritionHeadName})</p>
                    <p className="text-xs text-gray-700">ครูผู้รับผิดชอบโครงการอาหารกลางวัน</p>
                    <p className="text-xs text-gray-700 mt-0.5">ผู้จัดทำแผนและประมาณการ</p>
                  </div>

                  <div className="text-center">
                    <p>ลงชื่อ .....................................................</p>
                    <p className="mt-1 font-bold">({settings.directorName})</p>
                    <p className="text-xs text-gray-700">ผู้อำนวยการ{settings.schoolName}</p>
                    <p className="text-xs text-gray-700 mt-0.5">อนุมัติให้ดำเนินการตามแผน</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-10 pt-2 border-t border-gray-300 flex justify-between text-[11px] text-gray-500">
                  <span>แบบ อห.02 แผนอาหารกลางวันรายสัปดาห์ | โครงการอาหารกลางวัน {settings.schoolName}</span>
                  <span>หน้า 1 จาก 1</span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* FORM 3: แบบ ทค.03 ทะเบียนคุมรายรับ-รายจ่าย (สมุดคุมเงิน)                    */}
            {/* ========================================================================= */}
            {activeForm === "LEDGER" && (
              <div>
                {/* Header (NO Garuda) */}
                <div className="border-b-2 border-black pb-3 mb-4 text-center">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">
                    ทะเบียนคุมรายรับ - รายจ่ายเงินโครงการอาหารกลางวัน
                  </h2>
                  <p className="text-[15px] font-semibold mt-0.5 text-gray-800">
                    {settings.schoolName}
                  </p>
                  <p className="text-[13.5px] text-gray-700">
                    ประจำภาคเรียนที่ {settings.semester} ปีการศึกษา {settings.academicYear}
                  </p>
                </div>

                {/* Table Ledger */}
                <table className="w-full border-collapse border border-black text-[12.5px] mb-3">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-center border-b border-black">
                      <th className="border border-black p-1.5 w-20">วัน เดือน ปี</th>
                      <th className="border border-black p-1.5 w-28">เลขที่เอกสาร</th>
                      <th className="border border-black p-1.5 text-left">รายการ / รายละเอียด</th>
                      <th className="border border-black p-1.5 w-24 text-right">รายรับ (บาท)</th>
                      <th className="border border-black p-1.5 w-24 text-right">รายจ่าย (บาท)</th>
                      <th className="border border-black p-1.5 w-24 text-right">คงเหลือ (บาท)</th>
                      <th className="border border-black p-1.5 w-20">หมวดหมู่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let runningBalance = 0;
                      const sortedTxs = [...financialTransactions].sort(
                        (a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)
                      );
                      return sortedTxs.map((tx) => {
                        if (tx.type === "INCOME") {
                          runningBalance += tx.amount;
                        } else {
                          runningBalance -= tx.amount;
                        }
                        return (
                          <tr key={tx.id}>
                            <td className="border border-black p-1.5 text-center font-mono text-xs">
                              {tx.date}
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono text-xs">
                              {tx.documentNo}
                            </td>
                            <td className="border border-black p-1.5 font-medium">{tx.description}</td>
                            <td className="border border-black p-1.5 text-right font-mono text-emerald-800">
                              {tx.type === "INCOME"
                                ? tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                : "-"}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-red-800">
                              {tx.type === "EXPENSE"
                                ? tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                : "-"}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono font-bold">
                              {runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="border border-black p-1.5 text-center text-xs">
                              {tx.category}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-black">
                      <td colSpan={3} className="border border-black p-2 text-right pr-3">
                        ยอดรวมสะสมทั้งสิ้น:
                      </td>
                      <td className="border border-black p-2 text-right font-mono text-emerald-800">
                        {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-black p-2 text-right font-mono text-red-800">
                        {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-black p-2 text-right font-mono font-extrabold text-blue-900">
                        {netCashRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border border-black p-2 text-center text-xs">บาท</td>
                    </tr>
                    <tr className="bg-white font-bold text-center border-t border-black">
                      <td colSpan={7} className="border border-black p-2 text-[13.5px]">
                        ( ยอดเงินคงเหลือสุทธิ:{" "}
                        <span className="underline decoration-dotted">
                          {toBahtText(netCashRemaining)}
                        </span>{" "}
                        )
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-[14px]">
                  <div className="text-center">
                    <p>ลงชื่อ ..................................................... ผู้บันทึกบัญชี</p>
                    <p className="mt-1 font-bold">({settings.nutritionHeadName})</p>
                    <p className="text-xs text-gray-700">เจ้าหน้าที่การเงิน / ผู้รับผิดชอบโครงการ</p>
                  </div>

                  <div className="text-center">
                    <p>ลงชื่อ ..................................................... ผู้รับรอง</p>
                    <p className="mt-1 font-bold">({settings.directorName})</p>
                    <p className="text-xs text-gray-700">ผู้อำนวยการ{settings.schoolName}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-10 pt-2 border-t border-gray-300 flex justify-between text-[11px] text-gray-500">
                  <span>แบบ ทค.03 ทะเบียนคุมเงินอาหารกลางวัน | โครงการอาหารกลางวัน {settings.schoolName}</span>
                  <span>หน้า 1 จาก 1</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

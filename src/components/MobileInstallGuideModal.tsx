"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Share,
  Plus,
  MoreVertical,
  Download,
  CheckCircle2,
  X,
  Zap,
  HardDrive,
  Cloud,
  Layers,
} from "lucide-react";

interface MobileInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileInstallGuideModal({
  isOpen,
  onClose,
}: MobileInstallGuideModalProps) {
  const [activeOS, setActiveOS] = useState<"ios" | "android">("ios");

  // Auto-detect Operating System on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveOS("ios");
      } else if (/android/.test(ua)) {
        setActiveOS("android");
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#18201C]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E7E4DC] shadow-floating overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-[#ECE8DE] flex items-start justify-between gap-3 bg-gradient-to-b from-[#F2F8F5]/80 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#C7E2D6] p-1 flex items-center justify-center shadow-md shadow-[#1F5E4B]/10 shrink-0">
              <img
                src="/app-logo.png"
                alt="School Lunch OS Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1F5E4B] bg-[#EBF4F0] px-2.5 py-0.5 rounded-full border border-[#C7E2D6]">
                  Mobile PWA Guide
                </span>
                <span className="text-[10px] text-[#8C9890] font-mono">ไม่ต้องโหลดจาก App Store</span>
              </div>
              <h3 className="text-base font-extrabold text-[#18201C] mt-0.5">
                วิธีติดตั้งแอปไว้บนหน้าจอมือถือ (Home Screen)
              </h3>
              <p className="text-[11px] text-[#66746C]">
                เปิดใช้งานสะดวกรวดเร็วแบบเต็มหน้าจอ เสมือนแอปพลิเคชันจริงในมือถือ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center font-bold text-gray-400 hover:text-black transition-smooth text-sm shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Operating System Segmented Tabs */}
        <div className="px-5 pt-3.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-2xl border border-[#E7E4DC]">
            <button
              type="button"
              onClick={() => setActiveOS("ios")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeOS === "ios"
                  ? "bg-[#1F5E4B] text-white shadow-xs"
                  : "text-[#66746C] hover:text-[#18201C]"
              }`}
            >
              <span>🍏 สำหรับ iPhone / iPad (Safari)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOS("android")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeOS === "android"
                  ? "bg-[#1F5E4B] text-white shadow-xs"
                  : "text-[#66746C] hover:text-[#18201C]"
              }`}
            >
              <span>🤖 สำหรับ Android (Chrome)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-3.5">
          {/* TAB 1: iOS SAFARI */}
          {activeOS === "ios" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl flex items-center gap-2 text-xs text-[#1F5E4B] font-semibold">
                <span className="text-base">💡</span>
                <span>บนอุปกรณ์ iPhone และ iPad ต้องเปิดผ่านเบราว์เซอร์ <strong>Safari</strong> เท่านั้น</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                {/* Step 1 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C]">เปิด Safari เข้าสู่หน้าเว็บ</h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      เปิดลิงก์ระบบอาหารกลางวันนี้บนเบราว์เซอร์ Safari
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C] flex items-center gap-1">
                      <span>แตะปุ่มแชร์</span>
                      <span className="inline-flex items-center px-1 py-0.2 rounded bg-gray-200 text-gray-700 text-[9px] font-mono">
                        <Share className="w-2.5 h-2.5 mr-0.5" /> Share
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      กดไอคอนสี่เหลี่ยมลูกศรชี้ขึ้นที่แถบเมนูด้านล่างสุดของจอ
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C] flex items-center gap-1">
                      <span>เลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot;</span>
                      <Plus className="w-3 h-3 text-[#1F5E4B]" />
                    </h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      เลื่อนลงมาเล็กน้อยแล้วแตะ <em>&quot;Add to Home Screen&quot;</em>
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C]">แตะ &quot;เพิ่ม&quot; (Add)</h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      ระบบจะแสดงชื่อแอป <strong>&quot;อาหารกลางวัน&quot;</strong> ให้กดเพิ่มที่มุมบนขวา
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Callout */}
              <div className="p-3 bg-gradient-to-r from-[#FAF9F6] to-[#F2F8F5] rounded-2xl border border-[#C7E2D6] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#C7E2D6] shadow-2xs flex items-center justify-center text-sm">
                    📱
                  </div>
                  <div>
                    <span className="font-bold text-[#18201C] block">ติดตั้งเรียบร้อย! ไอคอนจะอยู่บนหน้าจอโฮม</span>
                    <span className="text-[10px] text-[#66746C]">กดเปิดใช้งานได้เต็มจอ ไม่มีแถบเบราว์เซอร์กวนใจ</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#1F5E4B] text-white text-[10px] font-bold rounded-md shrink-0">
                  ✓ พร้อมใช้
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID CHROME */}
          {activeOS === "android" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3 bg-[#F2F8F5] border border-[#C7E2D6] rounded-2xl flex items-center gap-2 text-xs text-[#1F5E4B] font-semibold">
                <span className="text-base">💡</span>
                <span>บนอุปกรณ์ Android แนะนำให้เปิดผ่าน <strong>Google Chrome</strong> หรือ Samsung Internet</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                {/* Step 1 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C]">เปิด Google Chrome</h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      เปิดลิงก์ระบบอาหารกลางวันนี้บนเบราว์เซอร์ Chrome
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C] flex items-center gap-1">
                      <span>แตะปุ่มเมนู 3 จุด</span>
                      <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                    </h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      กดปุ่มจุด 3 จุดที่มุมบนขวาของหน้าจอเบราว์เซอร์
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C] flex items-center gap-1">
                      <span>เลือก &quot;เพิ่มลงในหน้าจอหลัก&quot;</span>
                      <Smartphone className="w-3 h-3 text-[#1F5E4B]" />
                    </h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      หรือแตะคำว่า <em>&quot;ติดตั้งแอปพลิเคชัน&quot; (Install app)</em>
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3 rounded-2xl border border-[#E7E4DC] bg-[#FAF9F6] flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#1F5E4B] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#18201C]">แตะ &quot;ติดตั้ง&quot; หรือ &quot;เพิ่ม&quot;</h4>
                    <p className="text-[11px] text-[#66746C] mt-0.5 leading-snug">
                      กดยืนยัน ไอคอนแอปจะไปติดตั้งบนหน้าจอมือถือทันที
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Callout */}
              <div className="p-3 bg-gradient-to-r from-[#FAF9F6] to-[#F2F8F5] rounded-2xl border border-[#C7E2D6] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#C7E2D6] shadow-2xs flex items-center justify-center text-sm">
                    🤖
                  </div>
                  <div>
                    <span className="font-bold text-[#18201C] block">ติดตั้งสำเร็จใน 3 วินาที!</span>
                    <span className="text-[10px] text-[#66746C]">ประหยัดพื้นที่เครื่อง ข้อมูลซิงก์คลาวด์สดใหม่เสมอ</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#1F5E4B] text-white text-[10px] font-bold rounded-md shrink-0">
                  ✓ พร้อมใช้
                </span>
              </div>
            </div>
          )}

          {/* Key Advantages Triple Pill */}
          <div className="pt-2 border-t border-[#ECE8DE] grid grid-cols-3 gap-2 text-center text-[10.5px]">
            <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC]">
              <span className="font-bold text-[#18201C] block flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-[#1F5E4B]" /> เปิดไวทันใจ
              </span>
              <span className="text-gray-500 text-[10px]">แตะจากหน้าจอโฮม</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC]">
              <span className="font-bold text-[#18201C] block flex items-center justify-center gap-1">
                <HardDrive className="w-3 h-3 text-[#1F5E4B]" /> ไม่กินความจุ
              </span>
              <span className="text-gray-500 text-[10px]">ขนาดเบามาก</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC]">
              <span className="font-bold text-[#18201C] block flex items-center justify-center gap-1">
                <Cloud className="w-3 h-3 text-[#1F5E4B]" /> ซิงก์คลาวด์สด
              </span>
              <span className="text-gray-500 text-[10px]">เชื่อมต่อโรงเรียน</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-5 border-t border-[#ECE8DE] bg-[#FAF9F6] flex items-center justify-between text-xs shrink-0">
          <span className="text-[#8C9890] text-[11px]">
            School Lunch OS • Progressive Web App
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1F5E4B] hover:bg-[#143B30] text-white font-bold transition-smooth shadow-soft"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

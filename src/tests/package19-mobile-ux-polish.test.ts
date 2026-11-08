import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

describe("Package 19: Mobile UX Polish & Bottom Navigation Suite", () => {
  const pagePath = path.join(process.cwd(), "src/app/page.tsx");
  assert.ok(fs.existsSync(pagePath), "src/app/page.tsx must exist");
  const source = fs.readFileSync(pagePath, "utf-8");

  it("T-089: Mobile Bottom Navigation is implemented with responsive visibility", () => {
    assert.ok(
      source.includes('aria-label="เมนูหลักสำหรับมือถือ"'),
      "Defines mobile bottom nav with accessible aria-label"
    );
    assert.ok(
      source.includes("md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95"),
      "Bottom nav is fixed to bottom and hidden on md screens"
    );
    assert.ok(
      source.includes('onClick={() => setActiveTab("KITCHEN_HUD")}'),
      "Bottom nav links to KITCHEN_HUD (ตรวจรับ)"
    );
    assert.ok(
      source.includes('onClick={() => setActiveTab("MENU_PLAN")}'),
      "Bottom nav links to MENU_PLAN (เมนู)"
    );
    assert.ok(
      source.includes('onClick={() => setActiveTab("ANALYTICS")}'),
      "Bottom nav links to ANALYTICS (งบประมาณ)"
    );
    assert.ok(
      source.includes('onClick={() => setActiveTab("FINANCE_LEDGER")}'),
      "Bottom nav links to FINANCE_LEDGER (สมุดบัญชี)"
    );
    assert.ok(
      source.includes('onClick={() => setActiveTab("SETTINGS")}'),
      "Bottom nav links to SETTINGS (ตั้งค่า)"
    );
  });

  it("T-090: Desktop segmented dock is hidden on mobile screens to save space", () => {
    assert.ok(
      source.includes("hidden md:block max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 pt-1 overflow-x-auto"),
      "Desktop dock uses hidden md:block"
    );
  });

  it("T-091: Main content container accounts for mobile bottom nav bar height", () => {
    assert.ok(
      source.includes("pb-24 md:pb-8"),
      "Main container has pb-24 on mobile to prevent content overlap with bottom nav"
    );
  });

  it("T-092: Tab 1 features Mobile Quick Accept Banner and thumb-friendly stepper targets", () => {
    assert.ok(
      source.includes("ของสดมาส่งตรงตามสั่งครบทุกอย่าง?"),
      "Features quick accept banner for fast morning duty workflow"
    );
    assert.ok(
      source.includes("w-10 h-10 rounded-xl bg-white border border-[#E7E4DC] shadow-xs font-bold"),
      "Stepper buttons have enlarged touch targets (w-10 h-10)"
    );
    assert.ok(
      source.includes("sticky bottom-20 md:bottom-4"),
      "Sticky action bar floats safely above mobile bottom nav bar"
    );
  });

  it("T-093: Mobile food card layout reduces cognitive noise with food emojis and surface elevation", () => {
    assert.ok(
      source.includes("getFoodEmoji"),
      "Provides recognizable food emoji icons for rapid visual scanning"
    );
    assert.ok(
      source.includes("sm:hidden flex items-center justify-between text-xs text-[#66746C] mt-2 font-medium"),
      "Provides streamlined single-line summary on mobile"
    );
    assert.ok(
      source.includes("hidden sm:flex flex-wrap items-center gap-2 sm:gap-2.5"),
      "Detailed 3-column chip layout reserved for desktop"
    );
  });
});

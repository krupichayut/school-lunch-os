import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SCHOOL_SETTINGS,
  normalizeSchoolSettings,
  verifyAdminPasscode,
  SchoolSettings,
} from "../lib/storage";

describe("Package 26: Public Inspection Kiosk & Admin Passcode Gate Suite", () => {
  const rootDir = process.cwd();
  const pagePath = path.join(rootDir, "src", "app", "page.tsx");

  it("T-126: DEFAULT_SCHOOL_SETTINGS includes adminPasscode initialized to '1234'", () => {
    assert.equal(DEFAULT_SCHOOL_SETTINGS.adminPasscode, "1234");
  });

  it("T-127: normalizeSchoolSettings preserves valid adminPasscode and falls back to '1234' on missing/corrupt input", () => {
    const custom = normalizeSchoolSettings({ adminPasscode: "9999" });
    assert.equal(custom.adminPasscode, "9999");

    const fallbackNull = normalizeSchoolSettings({ adminPasscode: null });
    assert.equal(fallbackNull.adminPasscode, "1234");

    const fallbackEmpty = normalizeSchoolSettings({ adminPasscode: "   " });
    assert.equal(fallbackEmpty.adminPasscode, "1234");
  });

  it("T-128: verifyAdminPasscode validates matching credentials correctly and rejects wrong/empty passcodes", () => {
    const settings: SchoolSettings = {
      ...DEFAULT_SCHOOL_SETTINGS,
      adminPasscode: "5678",
    };

    assert.equal(verifyAdminPasscode("5678", settings), true);
    assert.equal(verifyAdminPasscode(" 5678 ", settings), true, "Should trim whitespace");
    assert.equal(verifyAdminPasscode("1234", settings), false, "Wrong passcode must be rejected");
    assert.equal(verifyAdminPasscode("", settings), false, "Empty passcode must be rejected");
  });

  it("T-129: page.tsx provides handleSelectTab gate that allows Tab 1 publicly and prompts auth for Tabs 2-5", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      pageContent.includes("handleSelectTab"),
      "page.tsx must define handleSelectTab with security checks"
    );
    assert.ok(
      pageContent.includes('tab === "KITCHEN_HUD"'),
      "KITCHEN_HUD must always be accessible without authentication"
    );
    assert.ok(
      pageContent.includes("setShowAdminAuthModal(true)"),
      "Must trigger Admin Auth Modal when unauthenticated user attempts to access Tabs 2-5"
    );
  });

  it("T-130: page.tsx provides AdminAuthModal with passcode input and error state", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      pageContent.includes("เข้าสู่ระบบผู้ดูแลโครงการ"),
      "page.tsx must provide AdminAuthModal dialog"
    );
    assert.ok(
      pageContent.includes("authInputPasscode"),
      "page.tsx must manage authInputPasscode state"
    );
    assert.ok(
      pageContent.includes("handleAdminLogout"),
      "page.tsx must provide logout handler"
    );
  });

  it("T-131: Tab 5 Settings provides security configuration section for admin passcode", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      pageContent.includes("ความปลอดภัยและการเข้าถึง (Security & Admin Passcode)"),
      "Settings must include admin passcode configuration card"
    );
    assert.ok(
      pageContent.includes("settingsForm.adminPasscode"),
      "Settings form must bind adminPasscode"
    );
  });
});

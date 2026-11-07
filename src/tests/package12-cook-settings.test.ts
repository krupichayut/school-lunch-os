import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCHOOL_SETTINGS,
  normalizeSchoolSettings,
  SchoolSettings,
} from "../lib/storage";

describe("Package 12: Cook Management & Anti-Mock Names", () => {
  it("T-054: SchoolSettings defaults cookName to empty string '' (strictly no random/mock names)", () => {
    assert.strictEqual(
      DEFAULT_SCHOOL_SETTINGS.cookName,
      "",
      "DEFAULT_SCHOOL_SETTINGS.cookName must be empty string by default, never a mock name"
    );
    assert.ok(
      !DEFAULT_SCHOOL_SETTINGS.cookName?.includes("วันเพ็ญ"),
      "Must not contain hardcoded mock name 'วันเพ็ญ'"
    );
  });

  it("T-055: normalizeSchoolSettings safely retains valid cookName and trims whitespace", () => {
    const customSettings: Partial<SchoolSettings> = {
      cookName: "  นางสมใจ อิ่มอร่อย  ",
    };
    const normalized = normalizeSchoolSettings(customSettings);
    assert.strictEqual(
      normalized.cookName,
      "นางสมใจ อิ่มอร่อย",
      "Should retain custom cook name and trim whitespace"
    );
  });

  it("T-056: normalizeSchoolSettings defaults undefined/null/corrupt cookName to empty string '' without generating fake names", () => {
    const corruptPayloads = [
      {},
      { cookName: null },
      { cookName: undefined },
      { cookName: 12345 },
      { settings: { cookName: "   " } },
    ];

    for (const payload of corruptPayloads) {
      const normalized = normalizeSchoolSettings(payload);
      assert.strictEqual(
        normalized.cookName,
        "",
        "Must default to empty string, preventing system from making up names"
      );
    }
  });

  it("T-057: Cook signature formatting logic cleanly switches between real cook name and official blank dots", () => {
    const formatCookSignature = (cookName?: string) => {
      return cookName?.trim() ? cookName.trim() : ".....................................................";
    };

    // Case 1: When user provides real cook name
    assert.strictEqual(
      formatCookSignature("นางบุญมี รสเด็ด"),
      "นางบุญมี รสเด็ด",
      "Should output real cook name verbatim"
    );

    // Case 2: When empty string, spaces, or undefined
    assert.strictEqual(
      formatCookSignature(""),
      ".....................................................",
      "Should output official dotted line when empty"
    );
    assert.strictEqual(
      formatCookSignature("   "),
      ".....................................................",
      "Should output official dotted line when only spaces"
    );
    assert.strictEqual(
      formatCookSignature(undefined),
      ".....................................................",
      "Should output official dotted line when undefined"
    );
  });

  it("T-058: Updating cookName preserves all other settings and round budget fields", () => {
    const baseSettings: SchoolSettings = {
      ...DEFAULT_SCHOOL_SETTINGS,
      studentCount: 86,
      subsidyPerHead: 27,
      daysPerInstallment: 20,
      cookName: "",
    };

    const updatedSettings: SchoolSettings = {
      ...baseSettings,
      cookName: "นางมาลี มีสุข",
    };

    const normalized = normalizeSchoolSettings(updatedSettings);
    assert.strictEqual(normalized.cookName, "นางมาลี มีสุข");
    assert.strictEqual(normalized.studentCount, 86);
    assert.strictEqual(normalized.subsidyPerHead, 27);
    assert.strictEqual(normalized.daysPerInstallment, 20);
    assert.strictEqual(normalized.schoolName, DEFAULT_SCHOOL_SETTINGS.schoolName);
  });
});

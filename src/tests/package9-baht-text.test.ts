import { describe, it } from "node:test";
import assert from "node:assert";
import { toBahtText, toThaiNumerals } from "../lib/baht-text";

describe("Package 9: Thai Official BahtText and Numerals Tests", () => {
  it("T-037: toBahtText handles zero, null, and empty inputs", () => {
    assert.strictEqual(toBahtText(0), "ศูนย์บาทถ้วน");
    assert.strictEqual(toBahtText(null), "ศูนย์บาทถ้วน");
    assert.strictEqual(toBahtText(undefined), "ศูนย์บาทถ้วน");
    assert.strictEqual(toBahtText(""), "ศูนย์บาทถ้วน");
    assert.strictEqual(toBahtText("invalid"), "ศูนย์บาทถ้วน");
  });

  it("T-038: toBahtText converts single digits and units correctly", () => {
    assert.strictEqual(toBahtText(1), "หนึ่งบาทถ้วน");
    assert.strictEqual(toBahtText(5), "ห้าบาทถ้วน");
    assert.strictEqual(toBahtText(10), "สิบบาทถ้วน");
    assert.strictEqual(toBahtText(11), "สิบเอ็ดบาทถ้วน");
    assert.strictEqual(toBahtText(20), "ยี่สิบบาทถ้วน");
    assert.strictEqual(toBahtText(21), "ยี่สิบเอ็ดบาทถ้วน");
    assert.strictEqual(toBahtText(25), "ยี่สิบห้าบาทถ้วน");
  });

  it("T-039: toBahtText converts hundreds, thousands, and edge case 'เอ็ด'", () => {
    assert.strictEqual(toBahtText(101), "หนึ่งร้อยเอ็ดบาทถ้วน");
    assert.strictEqual(toBahtText(1001), "หนึ่งพันเอ็ดบาทถ้วน");
    assert.strictEqual(toBahtText(1180), "หนึ่งพันหนึ่งร้อยแปดสิบบาทถ้วน");
    assert.strictEqual(toBahtText(1210), "หนึ่งพันสองร้อยสิบบาทถ้วน");
    assert.strictEqual(toBahtText(6190), "หกพันหนึ่งร้อยเก้าสิบบาทถ้วน");
    assert.strictEqual(toBahtText(99000), "เก้าหมื่นเก้าพันบาทถ้วน");
    assert.strictEqual(toBahtText(95760), "เก้าหมื่นห้าพันเจ็ดร้อยหกสิบบาทถ้วน");
  });

  it("T-040: toBahtText handles satang decimal amounts accurately", () => {
    assert.strictEqual(toBahtText(0.50), "ห้าสิบสตางค์");
    assert.strictEqual(toBahtText(1210.50), "หนึ่งพันสองร้อยสิบบาทห้าสิบสตางค์");
    assert.strictEqual(toBahtText(1.25), "หนึ่งบาทยี่สิบห้าสตางค์");
    assert.strictEqual(toBahtText(10.05), "สิบบาทห้าสตางค์");
  });

  it("T-041: toBahtText handles formatted strings with commas and negative values", () => {
    assert.strictEqual(toBahtText("99,000.00"), "เก้าหมื่นเก้าพันบาทถ้วน");
    assert.strictEqual(toBahtText("-450"), "ลบสี่ร้อยห้าสิบบาทถ้วน");
  });

  it("T-042: toThaiNumerals converts Arabic numbers to Thai digits", () => {
    assert.strictEqual(toThaiNumerals(2569), "๒๕๖๙");
    assert.strictEqual(toThaiNumerals("1,210.00"), "๑,๒๑๐.๐๐");
    assert.strictEqual(toThaiNumerals("RCV-2569-01"), "RCV-๒๕๖๙-๐๑");
    assert.strictEqual(toThaiNumerals(null), "");
  });
});

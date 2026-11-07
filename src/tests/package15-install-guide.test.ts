import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Package 15: Mobile PWA Install Guide Suite", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "src/components/MobileInstallGuideModal.tsx"
  );
  const manifestPath = path.resolve(process.cwd(), "public/manifest.json");

  it("T-069: MobileInstallGuideModal component file exists and is non-empty", () => {
    assert.ok(fs.existsSync(componentPath), "Component file must exist");
    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(content.length > 500, "Component must have substantial content");
    assert.ok(
      content.includes("export default function MobileInstallGuideModal"),
      "Must export MobileInstallGuideModal"
    );
  });

  it("T-070: MobileInstallGuideModal source contains instructions for both iOS Safari and Android Chrome", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(
      content.includes("iPhone / iPad") && content.includes("Safari"),
      "Must contain guidance for iOS Safari"
    );
    assert.ok(
      content.includes("Android") && content.includes("Chrome"),
      "Must contain guidance for Android Chrome"
    );
  });

  it("T-071: MobileInstallGuideModal contains Add to Home Screen and Share button steps for iOS", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(
      content.includes("Share") || content.includes("แชร์"),
      "Must describe the Share button on iOS"
    );
    assert.ok(
      content.includes("เพิ่มไปยังหน้าจอโฮม") || content.includes("Add to Home Screen"),
      "Must describe 'Add to Home Screen' action"
    );
  });

  it("T-072: MobileInstallGuideModal contains Chrome menu 3-dot and Install app steps for Android", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    assert.ok(
      content.includes("จุด") || content.includes("MoreVertical"),
      "Must describe the Chrome 3-dot overflow menu"
    );
    assert.ok(
      content.includes("เพิ่มลงในหน้าจอหลัก") || content.includes("ติดตั้งแอปพลิเคชัน"),
      "Must describe adding to home screen on Android"
    );
  });

  it("T-073: PWA manifest has icons linked and standalone mode configured for mobile installations", () => {
    assert.ok(fs.existsSync(manifestPath), "manifest.json must exist in public");
    const json = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.strictEqual(json.display, "standalone", "Display must be standalone for app-like feeling");
    assert.ok(
      json.icons.some((i: { src: string }) => i.src.includes("icon-192")),
      "Must include 192px icon"
    );
    assert.ok(
      json.icons.some((i: { src: string }) => i.src.includes("icon-512")),
      "Must include 512px icon"
    );
  });
});

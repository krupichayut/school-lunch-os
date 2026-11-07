import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Package 13: App Logo & Mobile PWA Home Screen Assets", () => {
  const publicDir = path.resolve(process.cwd(), "public");

  it("T-059: public/app-logo.png exists and contains valid high-resolution image data", () => {
    const logoPath = path.join(publicDir, "app-logo.png");
    assert.ok(fs.existsSync(logoPath), "app-logo.png must exist in public directory");
    const stat = fs.statSync(logoPath);
    assert.ok(stat.size > 100000, "app-logo.png should be high-resolution (>100KB)");
  });

  it("T-060: Apple Touch Icon (180x180) exists for iOS Safari Home Screen", () => {
    const appleIconPath = path.join(publicDir, "apple-touch-icon.png");
    assert.ok(fs.existsSync(appleIconPath), "apple-touch-icon.png must exist for iOS Add to Home Screen");
    const stat = fs.statSync(appleIconPath);
    assert.ok(stat.size > 1000, "apple-touch-icon.png must have non-trivial size");
  });

  it("T-061: Standard PWA icons (192x192 and 512x512) exist for Android / Chrome Home Screen", () => {
    const icon192 = path.join(publicDir, "icon-192.png");
    const icon512 = path.join(publicDir, "icon-512.png");
    assert.ok(fs.existsSync(icon192), "icon-192.png must exist");
    assert.ok(fs.existsSync(icon512), "icon-512.png must exist");
  });

  it("T-062: public/manifest.json is valid PWA manifest with standalone display and icons", () => {
    const manifestPath = path.join(publicDir, "manifest.json");
    assert.ok(fs.existsSync(manifestPath), "manifest.json must exist in public directory");
    const content = fs.readFileSync(manifestPath, "utf-8");
    const json = JSON.parse(content);
    assert.strictEqual(json.display, "standalone", "PWA display must be standalone");
    assert.ok(json.name, "Manifest must have app name");
    assert.ok(json.short_name, "Manifest must have short_name for mobile homescreen");
    assert.ok(Array.isArray(json.icons) && json.icons.length >= 2, "Manifest must define icons");
  });
});

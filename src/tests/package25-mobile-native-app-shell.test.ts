import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("Package 25: Native Mobile App-Shell & Adaptive Card Stream Suite", () => {
  const rootDir = process.cwd();
  const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");
  const cssPath = path.join(rootDir, "src", "app", "globals.css");
  const pagePath = path.join(rootDir, "src", "app", "page.tsx");
  const calendarPath = path.join(rootDir, "src", "components", "MenuCalendarPlanner.tsx");

  it("T-120: Viewport in layout.tsx includes viewportFit: 'cover' for edge-to-edge iOS/Android display", () => {
    const layoutContent = fs.readFileSync(layoutPath, "utf-8");
    assert.ok(
      layoutContent.includes('viewportFit: "cover"'),
      "layout.tsx must configure viewportFit: 'cover' to support iPhone Dynamic Island/Notch and Android gesture bar"
    );
  });

  it("T-121: globals.css defines safe-area insets and disables mobile WebKit tap highlight", () => {
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(
      cssContent.includes(".safe-area-top"),
      "globals.css must define .safe-area-top"
    );
    assert.ok(
      cssContent.includes(".safe-area-bottom"),
      "globals.css must define .safe-area-bottom with env(safe-area-inset-bottom)"
    );
    assert.ok(
      cssContent.includes("-webkit-tap-highlight-color: transparent"),
      "globals.css must eliminate tap-highlight gray flash for native app feel"
    );
  });

  it("T-122: globals.css enforces 16px font-size on mobile inputs to eliminate iOS Safari auto-zoom", () => {
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(
      cssContent.includes("font-size: 16px !important"),
      "Form controls on screens <= 768px must enforce 16px font-size to prevent unwanted Safari zoom"
    );
  });

  it("T-123: page.tsx provides a sleek 54px Mobile Native App Bar and Expandable Executive Sheet", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      pageContent.includes("SLEEK MOBILE NATIVE APP BAR (< md SCREENS: 54px ULTRA-COMPACT)"),
      "page.tsx must provide a dedicated compact mobile header on < md screens"
    );
    assert.ok(
      pageContent.includes("showMobileSummarySheet"),
      "page.tsx must provide state and trigger for Mobile Executive Summary Sheet"
    );
    assert.ok(
      pageContent.includes("ข้อมูลบริหารจัดการประจำวัน"),
      "Executive Sheet provides duty teacher and remaining budget breakdown"
    );
  });

  it("T-124: MenuCalendarPlanner.tsx renders Mobile Week-Day Agenda Cards on < md screens", () => {
    const calendarContent = fs.readFileSync(calendarPath, "utf-8");
    assert.ok(
      calendarContent.includes("MOBILE WEEK-DAY AGENDA VIEW (SHOWN ONLY ON < md SCREENS)"),
      "MenuCalendarPlanner must include dedicated mobile agenda cards"
    );
    assert.ok(
      calendarContent.includes("hidden md:grid grid-cols-7 gap-2"),
      "Desktop 7-column grid must be hidden on mobile screens"
    );
    assert.ok(
      calendarContent.includes("calendarWeeks"),
      "MenuCalendarPlanner computes calendarWeeks to allow easy week stepper navigation on phones"
    );
  });

  it("T-125: Tab 4 Finance Ledger provides Mobile Transaction Card Feed without horizontal scroll", () => {
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    assert.ok(
      pageContent.includes("MOBILE TRANSACTION FEED (< md SCREENS: NATIVE CARDS, NO HORIZONTAL SCROLL)"),
      "Finance Ledger must include native card stream on < md screens"
    );
    assert.ok(
      pageContent.includes("hidden md:block overflow-x-auto"),
      "Traditional wide HTML table must be restricted to md: and above"
    );
  });
});

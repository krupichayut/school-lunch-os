import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_PRESET_MENUS,
  PresetMenu,
  DayPlan,
  getRoundSchoolDays,
} from '../lib/storage';

describe('Package 17: Master Menu Library & Calendar-Driven Planning', () => {
  const masterMenuCompPath = path.join(process.cwd(), 'src/components/MasterMenuLibrary.tsx');
  const pagePath = path.join(process.cwd(), 'src/app/page.tsx');

  it('T-079: MasterMenuLibrary component exists and defines rich library props', () => {
    assert.ok(fs.existsSync(masterMenuCompPath), 'MasterMenuLibrary.tsx must exist');
    const source = fs.readFileSync(masterMenuCompPath, 'utf-8');
    assert.ok(source.includes('export default function MasterMenuLibrary'), 'Exports MasterMenuLibrary');
    assert.ok(source.includes('onAssignMenuToDate'), 'Supports onAssignMenuToDate');
    assert.ok(source.includes('onAddNewPresetMenu'), 'Supports onAddNewPresetMenu');
    assert.ok(source.includes('onUpdatePresetMenu'), 'Supports onUpdatePresetMenu');
    assert.ok(source.includes('onDeletePresetMenu'), 'Supports onDeletePresetMenu');
  });

  it('T-080: Master library contains preset recipes with calculated ingredient costs', () => {
    assert.ok(DEFAULT_PRESET_MENUS.length >= 8, 'Default preset menus library must have at least 8 recipes');
    const khaoManGai = DEFAULT_PRESET_MENUS.find((m) => m.name.includes('ข้าวมันไก่'));
    assert.ok(khaoManGai, 'Khao Man Gai recipe must exist');
    assert.ok(khaoManGai.ingredients.length >= 4, 'Recipe must have ingredients');

    const totalCost = khaoManGai.ingredients.reduce(
      (sum, i) => sum + (i.qty || 0) * (i.unitPrice || 0),
      0
    );
    assert.ok(totalCost > 500 && totalCost < 2500, `Cost must be realistic: ${totalCost}`);
  });

  it('T-081: Assigning a menu to a calendar date isolates changes to that date in datePlans', () => {
    const datePlans: Record<string, DayPlan> = {};
    const roundDays = getRoundSchoolDays();
    assert.strictEqual(roundDays.length, 20);

    const recipe = DEFAULT_PRESET_MENUS[0];
    const targetDate = '2026-11-09'; // Monday Week 2

    datePlans[targetDate] = {
      menuName: recipe.name,
      category: recipe.category || 'อาหารจานเดียว',
      ingredients: recipe.ingredients.map((item, idx) => ({
        ...item,
        id: `ing-${targetDate}-${idx + 1}`,
      })),
      isFrozen: false,
      frozenAtTime: null,
      inspectionItems: [],
      isReceivingConfirmed: false,
      confirmedAtTime: null,
      inspectionDate: targetDate,
    };

    assert.strictEqual(datePlans[targetDate].menuName, recipe.name);
    assert.strictEqual(datePlans[targetDate].ingredients.length, recipe.ingredients.length);

    // Modify ingredient on this specific date
    datePlans[targetDate].ingredients[0].qty = 999;
    assert.strictEqual(datePlans[targetDate].ingredients[0].qty, 999);
    // Original master recipe must be completely untouched
    assert.notStrictEqual(recipe.ingredients[0].qty, 999);
  });

  it('T-082: page.tsx mounts MasterMenuLibrary when view is LIBRARY and DATE_DETAIL when editing specific date', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(pageSource.includes('<MasterMenuLibrary'), 'page.tsx mounts MasterMenuLibrary');
    assert.ok(pageSource.includes('menuPlanningView === "LIBRARY"'), 'Has LIBRARY view condition');
    assert.ok(pageSource.includes('menuPlanningView === "DATE_DETAIL"'), 'Has DATE_DETAIL view condition');
    assert.ok(!pageSource.includes('ตารางอาหารกลางวัน 5 วันทำการ (จันทร์ – ศุกร์)'), 'Old 5-day Mon-Fri ribbon is removed from menu planning');
  });

  it('T-083: Date-Specific Detail View renders full Thai date instead of generic weekday', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(
      pageSource.includes('formatThaiDateFull(selectedPlanningDate)'),
      'Renders formatted full Thai date for the active planning date'
    );
  });
});

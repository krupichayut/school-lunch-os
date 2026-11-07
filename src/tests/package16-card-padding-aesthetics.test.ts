import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('Package 16: Card Padding & High-Legibility Aesthetics', () => {
  const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
  const pageSource = fs.readFileSync(pagePath, 'utf-8');

  it('T-074: No invalid fractional spacing classes (like p-4.5) exist in page.tsx', () => {
    const invalidSpacingRegex = /(?:p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb)-[4567]\.5/g;
    const matches = pageSource.match(invalidSpacingRegex);
    assert.strictEqual(
      matches,
      null,
      `Found invalid Tailwind spacing classes that cause 0 padding: ${matches?.join(', ')}`
    );
  });

  it('T-075: Morning Receiving inspection items have generous padding (p-4 sm:p-5)', () => {
    assert.ok(
      pageSource.includes('bg-white rounded-2xl p-4 sm:p-5 border'),
      'Inspection cards must use valid p-4 sm:p-5 to provide breathing room from borders'
    );
  });

  it('T-076: Inspection item titles use proper line-height so Thai vowels never touch borders', () => {
    assert.ok(
      pageSource.includes('leading-normal') && pageSource.includes('text-base sm:text-lg'),
      'Inspection titles must use leading-normal to prevent clipping of Thai tone marks'
    );
  });

  it('T-077: Quantitative metrics use chip containers with background and borders', () => {
    assert.ok(
      pageSource.includes('bg-[#FAF9F6] border border-[#E7E4DC] rounded-xl px-3 py-1.5'),
      'Ordered & Calculated price metrics must use distinct padded chips'
    );
    assert.ok(
      pageSource.includes('bg-[#F2F8F5] border border-[#C7E2D6] rounded-xl px-3 py-1.5'),
      'Actual received metric must use an emerald padded chip'
    );
  });

  it('T-078: Settings Live Simulation & Teacher Duty cards have non-zero padding', () => {
    assert.ok(
      pageSource.includes('md:col-span-2 p-5 sm:p-6 bg-[#F2F8F5] rounded-3xl'),
      'Live Simulation card in settings must use p-5 sm:p-6'
    );
    assert.ok(
      pageSource.includes('bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl border border-[#E7E4DC]'),
      'Teacher duty cards in settings must use p-4 sm:p-5'
    );
  });
});

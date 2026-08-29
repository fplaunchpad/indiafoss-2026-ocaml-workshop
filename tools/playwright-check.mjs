#!/usr/bin/env node
// End-to-end smoke check: loads the toolchain smoke page, verifies
// x-ocaml registration, slide-mode navigation, fragment reveal,
// Run All / Clear All buttons.

import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8765/_site/test/smoke.html';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const events = [];
  page.on('console', m => events.push(`console.${m.type()}: ${m.text()}`));
  page.on('pageerror', e => events.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => events.push(`requestfailed: ${r.url()} -- ${r.failure()?.errorText}`));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  // Wait for x-ocaml registration. The bundle is a large wasm toplevel;
  // on a cold load right after a full rebuild, first compile can take a
  // while, so allow a generous window before declaring failure.
  await page.waitForFunction(() => !!customElements.get('x-ocaml'), null, { timeout: 90_000 });

  // Wait for cells to upgrade (shadow DOM populated with the Run button).
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('x-ocaml'))
            .every(c => c.shadowRoot?.querySelector('.run_btn button')),
    null, { timeout: 90_000 });

  const cellCount = await page.evaluate(() => document.querySelectorAll('x-ocaml').length);
  console.log('cells upgraded:', cellCount);

  // --- chapter mode: chapter content should be visible ---
  const chapterVisible = await page.evaluate(() =>
    document.body.classList.contains('mode-chapter')
    && getComputedStyle(document.querySelector('.chapter')).display !== 'none');
  console.log('chapter visible:', chapterVisible);

  // --- toggle to slide mode ---
  await page.evaluate(() => { location.hash = '#slides'; });
  await page.waitForFunction(() => document.body.classList.contains('mode-slides'));
  await page.waitForTimeout(300);

  const slideHidden = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.chapter')).display === 'none');
  console.log('chapter hidden in slide mode:', slideHidden);

  // Reveal.js should have moved sections into .reveal .slides.
  const slidesInReveal = await page.evaluate(() =>
    document.querySelectorAll('.reveal .slides section[data-slide]').length);
  console.log('slides inside reveal wrapper:', slidesInReveal);

  // --- navigate: press right arrow twice, expect slide index to advance ---
  const startIdx = await page.evaluate(() => window.Reveal?.getIndices()?.h ?? -1);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  const afterIdx = await page.evaluate(() => window.Reveal?.getIndices()?.h ?? -1);
  console.log('reveal indices: start =', startIdx, ' after 2x ArrowRight =', afterIdx);

  // --- fragments: keep pressing to reveal them ---
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  const visibleFragments = await page.evaluate(() =>
    document.querySelectorAll('.fragment.visible').length);
  const totalFragments = await page.evaluate(() =>
    document.querySelectorAll('.fragment').length);
  console.log(`fragments revealed: ${visibleFragments} / ${totalFragments}`);

  // --- back to chapter via the toggle button (covers the hash cleanup path) ---
  await page.click('.mode-toggle');
  await page.waitForFunction(() => document.body.classList.contains('mode-chapter'));
  await page.waitForTimeout(300);
  const urlAfterReturn = page.url();
  const slidesRestoredInChapter = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section[data-slide]'))
      .every(s => s.closest('.chapter')));
  console.log('url after returning to chapter:', urlAfterReturn);
  console.log('slide sections restored to chapter:', slidesRestoredInChapter);

  // Click "Run all" — wait for at least one cell to produce output.
  await page.click('.run-all');
  let ranCells = 0;
  for (let i = 0; i < 60 && ranCells === 0; i++) {
    await page.waitForTimeout(500);
    ranCells = await page.evaluate(() => {
      let n = 0;
      for (const c of document.querySelectorAll('x-ocaml')) {
        if (c.shadowRoot && c.shadowRoot.querySelector('.caml_meta, .caml_stdout, .caml_stderr, .caml_html')) n++;
      }
      return n;
    });
  }
  console.log('cells with output after Run all:', ranCells);

  // Clear all
  await page.click('.clear-all');
  await page.waitForTimeout(500);
  const afterClear = await page.evaluate(() => {
    let n = 0;
    for (const c of document.querySelectorAll('x-ocaml')) {
      if (c.shadowRoot && c.shadowRoot.querySelector('.caml_meta, .caml_stdout, .caml_stderr, .caml_html')) n++;
    }
    return n;
  });
  console.log('cells with output after Clear all:', afterClear);

  console.log('---events---');
  for (const e of events) console.log('  ' + e);

  await browser.close();

  // Assert. Logging alone let a broken Run-all / slide mode pass the
  // smoke test; collect expectations and fail on any miss.
  const consoleErrors = events.filter(e =>
    e.startsWith('console.error') || e.startsWith('pageerror'));
  const expectations = [
    [cellCount > 0, `cells upgraded (${cellCount})`],
    [chapterVisible, 'chapter visible in chapter mode'],
    [slideHidden, 'chapter hidden in slide mode'],
    [slidesInReveal > 0, `slides inside reveal wrapper (${slidesInReveal})`],
    [afterIdx > startIdx, `reveal navigation advanced (${startIdx} -> ${afterIdx})`],
    [totalFragments === 0 || visibleFragments > 0,
      `fragments revealed (${visibleFragments}/${totalFragments})`],
    [slidesRestoredInChapter, 'slide sections restored to chapter'],
    [ranCells > 0, `cells with output after Run all (${ranCells})`],
    [afterClear === 0, `cells cleared after Clear all (${afterClear} left)`],
    [consoleErrors.length === 0,
      `no console errors (${consoleErrors.length} seen)`],
  ];
  const failures = expectations.filter(([ok]) => !ok).map(([, what]) => what);
  if (failures.length > 0) {
    console.error('FAILED checks:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('all checks passed');
}

main().catch(e => { console.error(e); process.exit(1); });

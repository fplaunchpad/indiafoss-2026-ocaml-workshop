#!/usr/bin/env node
// Slide-overflow check: for each workshop part, enter slide mode
// and verify every slide fits the 1280x800 reveal.js canvas.
//
//   node tools/playwright-overflow-check.mjs BASE_URL [page.html ...]
//
// BASE_URL is the directory serving _site/ contents (e.g.
// http://localhost:8765/_site). With no page args, checks every
// numbered HTML page under _site/. Exits 1 if any slide overflows.
//
// Pages are scanned by a pool of OVERFLOW_WORKERS parallel tabs
// (default 6). The x-ocaml worker is left enabled: auto-run cell
// output contributes real slide height, so measuring without it
// under-reports. Each tab keeps its context (and HTTP cache), so
// the big toplevel bundles are fetched once per tab, not per page.

import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:8765/_site';
let pages = process.argv.slice(3);
if (pages.length === 0) {
  const site = join(dirname(fileURLToPath(import.meta.url)), '..', '_site');
  pages = readdirSync(site).filter(f => /^\d\d-.*\.html$/.test(f)).sort();
}
const POOL = Math.max(1, Number(process.env.OVERFLOW_WORKERS ?? 6));

// Slight tolerance: reveal reports a few px of slack on some themes.
const W = 1280, H = 800, SLACK = 2;

async function checkPage(page, url) {
  await page.goto(url + '#slides', { waitUntil: 'domcontentloaded' });
  const hasDeck = await page
    .waitForFunction(() => window.Reveal?.isReady?.(), null, { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!hasDeck) return { skipped: true };

  // Let the visible cells upgrade so heights are final. Hidden /
  // init cells never grow a Run button and do not affect layout,
  // so they are excluded; a straggler page proceeds after the cap
  // (best effort) rather than stalling the scan.
  await page
    .waitForFunction(
      () => Array.from(document.querySelectorAll('x-ocaml'))
        .filter(c => !c.hasAttribute('hidden'))
        .every(c => c.shadowRoot?.querySelector('.run_btn button')),
      null, { timeout: 20_000 })
    .catch(() => {});
  // Images contribute zero height until decoded; an early measure
  // silently under-reports. Wait for every <img> to decode before measuring.
  await page
    .evaluate(() => Promise.all(
      Array.from(document.images).map(i => i.decode().catch(() => {}))))
    .catch(() => {});
  await page.evaluate(() => window.Reveal?.layout?.());
  await page.waitForTimeout(500);

  // Reveal keeps non-current slides at display:none (scrollHeight
  // 0), so measuring them in place silently passes everything.
  // Navigate to each slide and measure it while it is current.
  return await page.evaluate(([W, H, SLACK]) => {
    const R = window.Reveal;
    const total = R.getTotalSlides();
    const bad = [];
    const slides = Array.from(
      document.querySelectorAll('.reveal .slides section'))
      .filter(s => !s.querySelector('section')); // skip subslide containers
    let n = 0;
    for (const s of slides) {
      n++;
      const heading = s.querySelector('h1,h2,h3')?.textContent?.trim() ?? `#${n}`;
      const { h, v } = R.getIndices(s);
      R.slide(h, v ?? 0);
      R.layout();
      const sw = s.scrollWidth, sh = s.scrollHeight;
      if (sw > W + SLACK || sh > H + SLACK) {
        bad.push(`${heading} (${sw}x${sh})`);
      }
    }
    R.slide(0, 0);
    return { total, bad };
  }, [W, H, SLACK]);
}

async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  const queue = pages.slice();
  const results = new Map();

  await Promise.all(
    Array.from({ length: Math.min(POOL, queue.length) }, async () => {
      const ctx = await browser.newContext({ viewport: { width: W, height: H } });
      const page = await ctx.newPage();
      for (;;) {
        const p = queue.shift();
        if (!p) break;
        try {
          results.set(p, await checkPage(page, `${BASE}/${p}`));
        } catch (e) {
          results.set(p, { error: String(e).split('\n')[0] });
        }
      }
      await ctx.close();
    })
  );
  await browser.close();

  let failures = 0;
  for (const p of pages) {
    const res = results.get(p) ?? { error: 'no result' };
    if (res.error) {
      failures++;
      console.error(`${p}: ERROR ${res.error}`);
    } else if (res.skipped) {
      console.log(`${p}: no deck (skipped)`);
    } else if (res.bad.length === 0) {
      console.log(`${p}: ${res.total} slides ok`);
    } else {
      failures += res.bad.length;
      console.error(`${p}: OVERFLOW on ${res.bad.length} slide(s):`);
      for (const b of res.bad) console.error(`    ${b}`);
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (failures > 0) {
    console.error(`overflow-check: ${failures} failing slide(s)/page(s) in ${secs}s`);
    process.exit(1);
  }
  console.log(`overflow-check: all slides fit (${pages.length} pages in ${secs}s)`);
}

main().catch(e => { console.error(e); process.exit(1); });

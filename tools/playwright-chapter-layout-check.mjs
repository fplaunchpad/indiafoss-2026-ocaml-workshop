#!/usr/bin/env node
// Keep the right-hand chapter outline attached to the article on wide screens.

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8765/_site';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/03-modules.html`, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.toc').isVisible()) {
    throw new Error('1280px: chapter outline should be hidden when it cannot fit');
  }
  console.log('1280px: chapter outline hidden');

  for (const width of [1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/03-modules.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.toc', { state: 'visible' });

    const geometry = await page.evaluate(() => {
      const chapter = document.querySelector('.chapter').getBoundingClientRect();
      const toc = document.querySelector('.toc').getBoundingClientRect();
      return {
        chapterRight: chapter.right,
        tocLeft: toc.left,
        tocRight: toc.right,
        viewportWidth: innerWidth,
      };
    });
    const gap = geometry.tocLeft - geometry.chapterRight;
    if (gap < 12 || gap > 32) {
      throw new Error(`${width}px: chapter-to-outline gap is ${gap}px`);
    }
    if (geometry.tocRight > geometry.viewportWidth) {
      throw new Error(`${width}px: outline extends beyond the viewport`);
    }
    console.log(`${width}px: chapter outline is ${gap}px from the article`);
  }

  await page.locator('.sidebar-collapse').click();
  const collapsedGap = await page.evaluate(() => {
    const chapter = document.querySelector('.chapter').getBoundingClientRect();
    const toc = document.querySelector('.toc').getBoundingClientRect();
    return toc.left - chapter.right;
  });
  if (collapsedGap < 12 || collapsedGap > 32) {
    throw new Error(`collapsed workshop outline: chapter-to-outline gap is ${collapsedGap}px`);
  }
  console.log(`collapsed workshop outline: chapter outline is ${collapsedGap}px from the article`);
} finally {
  await browser.close();
}

console.log('chapter layout checks passed');

// Screenshot one slide of a built workshop page.
// Usage: node tools/page-shot.mjs <page-url>#slides "<h2 title substring>" <out.png>
// Navigates per-slide via the Reveal API with transitions off, the
// same approach as playwright-overflow-check.mjs.
import { chromium } from 'playwright';
const [url, title, out] = process.argv.slice(2);
if (!url || !title || !out) {
  console.error('usage: node tools/page-shot.mjs <url>#slides "<h2 substring>" <out.png>');
  process.exit(2);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'networkidle' });
const found = await page.evaluate((t) => {
  Reveal.configure({ transition: 'none' });
  const slides = [...document.querySelectorAll('.reveal .slides section')];
  const i = slides.findIndex(s => s.querySelector('h2')?.textContent.includes(t));
  if (i < 0) return false;
  const { h, v } = Reveal.getIndices(slides[i]);
  Reveal.slide(h, v ?? 0);
  Reveal.layout();
  return true;
}, title);
if (!found) { console.error(`no slide with h2 matching "${title}"`); process.exit(1); }
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();
console.log('shot', out);

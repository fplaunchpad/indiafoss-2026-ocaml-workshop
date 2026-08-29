#!/usr/bin/env node
// Smoke-test the standalone game exercises and their embedded OCaml runtime.

import { chromium } from 'playwright';

const ROOT = process.argv[2] || 'http://localhost:8765/_site';
const games = [
  ['Game of Life', 'games/life_partial_list.html'],
  ['Tic-Tac-Toe', 'games/tictactoe_partial_list.html'],
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

try {
  const landing = await context.newPage();
  await landing.goto(`${ROOT}/index.html`, { waitUntil: 'domcontentloaded' });
  const landingText = await landing.locator('main').innerText();
  const gameLinks = await landing.locator('.games a').evaluateAll(links =>
    links.map(link => link.getAttribute('href')));
  if (!landingText.includes('Final 45-minute game lab')
      || !landingText.includes('do not refresh')
      || !gameLinks.includes('games/life_partial_list.html')
      || !gameLinks.includes('games/tictactoe_partial_list.html')) {
    throw new Error('landing page is missing the game-lab guidance or links');
  }
  await landing.close();

  for (const [name, path] of games) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`page: ${error.message}`));
    page.on('requestfailed', request =>
      errors.push(`request: ${request.url()} — ${request.failure()?.errorText}`));

    await page.goto(`${ROOT}/${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!customElements.get('x-ocaml'), null,
      { timeout: 90_000 });
    await page.waitForFunction(() => {
      const cells = Array.from(document.querySelectorAll('x-ocaml'));
      return cells.length > 1 && cells.slice(0, 2)
        .every(cell => cell.shadowRoot?.querySelector('.run_btn button'));
    }, null, { timeout: 90_000 });

    const cellCount = await page.locator('x-ocaml').count();
    const credit = await page.locator('.credit').textContent();
    const home = await page.locator('.workshop-nav a').getAttribute('href');
    const pageText = await page.locator('.content').innerText();
    const refresherLinks = await page.locator('.content a[href*="02-data-types"]')
      .evaluateAll(links => links.map(link => link.getAttribute('href')));

    // Running the board cell also evaluates its unfinished predecessors.
    await page.evaluate(() => {
      const boardCell = document.querySelectorAll('x-ocaml')[1];
      boardCell.shadowRoot.querySelector('.run_btn button').click();
    });
    try {
      await page.waitForFunction(() => document.querySelector('#game-panel')?.children.length > 0,
        null, { timeout: 90_000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        cells: Array.from(document.querySelectorAll('x-ocaml')).slice(0, 2)
          .map(cell => cell.shadowRoot?.innerText || ''),
        panel: document.querySelector('#game-panel')?.innerHTML || '',
      }));
      throw new Error(`${name} did not initialize:\n${JSON.stringify(diagnostics)}\n${errors.join('\n')}`,
        { cause: error });
    }
    const panelChildren = await page.locator('#game-panel').evaluate(node => node.children.length);

    const failures = [
      [cellCount > 1, `expected multiple OCaml cells, found ${cellCount}`],
      [credit?.includes('Smayan Agarwal'), 'contributor credit is missing'],
      [home === '../index.html', `workshop-home link is ${home}`],
      [pageText.includes('45-minute lab:'), 'game-lab scope is missing'],
      [pageText.includes('not saved across reloads'), 'reload warning is missing'],
      [refresherLinks.includes('../02-data-types.html#pattern-matching'),
        'pattern-matching refresher link is missing'],
      [refresherLinks.includes('../02-data-types.html#matching-lists'),
        'list-matching refresher link is missing'],
      [panelChildren > 0, 'game panel did not render'],
      [errors.length === 0, errors.join('\n')],
    ].filter(([ok]) => !ok).map(([, message]) => message);

    if (failures.length) throw new Error(`${name}:\n${failures.join('\n')}`);
    console.log(`${name}: ${cellCount} cells upgraded; game panel rendered`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('game checks passed');

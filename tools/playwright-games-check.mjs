#!/usr/bin/env node
// Smoke-test the chapter-built game exercises and their embedded OCaml runtime.

import { chromium } from 'playwright';

const ROOT = process.argv[2] || 'http://localhost:8765/_site';
const games = [
  ['Game of Life', '05-game-of-life.html'],
  ['Tic-Tac-Toe', '04-tic-tac-toe.html'],
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });

try {
  const landing = await context.newPage();
  await landing.goto(`${ROOT}/index.html`, { waitUntil: 'domcontentloaded' });
  const landingText = await landing.locator('main').innerText();
  const gameLinks = await landing.locator('.games a').evaluateAll(links =>
    links.map(link => link.getAttribute('href')));
  const partLabels = await landing.locator('.parts:not(.games) .part-no')
    .allTextContents();
  const gameCardTextDoesNotOverlap = async () => landing.locator('.games a')
    .evaluateAll(cards => cards.every(card => {
      const label = card.querySelector('.part-no')?.getBoundingClientRect();
      const title = card.querySelector('.part-title')?.getBoundingClientRect();
      if (!label || !title) return false;
      return label.right <= title.left || title.right <= label.left
        || label.bottom <= title.top || title.bottom <= label.top;
    }));
  const gameCardTitlesAlign = async () => landing.locator('.games .part-title')
    .evaluateAll(titles => {
      const lefts = titles.map(title => title.getBoundingClientRect().left);
      return lefts.length === 3 && Math.max(...lefts) - Math.min(...lefts) <= 1;
    });
  if (!landingText.includes('Final 45-minute game lab')
      || !landingText.includes('saved locally in this browser')
      || partLabels.join(',') !== '1,2,3'
      || !gameLinks.includes('05-game-of-life.html')
      || !gameLinks.includes('04-tic-tac-toe.html')
      || !gameLinks.includes('06-joy.html')) {
    throw new Error('landing page is missing the game-lab guidance or links');
  }
  if (!await gameCardTextDoesNotOverlap()) {
    throw new Error('game-card label overlaps its title at desktop width');
  }
  if (!await gameCardTitlesAlign()) {
    throw new Error('game-card titles do not share a desktop alignment');
  }
  await landing.setViewportSize({ width: 390, height: 800 });
  if (!await gameCardTextDoesNotOverlap()) {
    throw new Error('game-card label overlaps its title at mobile width');
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

    const sidebarLinks = await page.locator('.sidebar-nav a').allTextContents();
    await page.evaluate(() => {
      localStorage.removeItem('indiafoss-ocaml-sidebar-hidden');
      document.body.classList.remove('sidebar-hidden');
    });
    await page.locator('.sidebar-collapse').click();
    const sidebarClosed = await page.locator('body').evaluate(body =>
      body.classList.contains('sidebar-hidden'));
    await page.locator('.sidebar-collapse').click();
    const sidebarReopened = await page.locator('body').evaluate(body =>
      !body.classList.contains('sidebar-hidden'));

    const cellCount = await page.locator('x-ocaml').count();
    const credit = await page.locator('.chapter').first().textContent();
    const home = await page.locator('.home-link').getAttribute('href');
    const pageText = await page.locator('.chapter').innerText();
    const refresherLinks = await page.locator('.chapter a[href*="02-data-types"]')
      .evaluateAll(links => links.map(link => link.getAttribute('href')));
    const layout = await page.evaluate(() => {
      const proseFont = Number.parseFloat(getComputedStyle(document.body).fontSize);
      const cell = document.querySelector('x-ocaml');
      const content = document.querySelector('.chapter');
      const board = document.querySelector('.game-board');
      return {
        proseFont,
        cellFont: cell ? Number.parseFloat(getComputedStyle(cell).fontSize) : 0,
        contentWidth: content?.getBoundingClientRect().width || 0,
        boardWidth: board?.getBoundingClientRect().width || 0,
        boardGap: board && content
          ? board.getBoundingClientRect().left - content.getBoundingClientRect().right : 0,
      };
    });

    let lifeStacksAtLaptopWidth = true;
    if (name === 'Game of Life') {
      await page.setViewportSize({ width: 1024, height: 800 });
      lifeStacksAtLaptopWidth = await page.locator('.game-chapter-layout').evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length === 1);
      await page.setViewportSize({ width: 1440, height: 800 });
    }

    // Running the board cell also evaluates its unfinished predecessors.
    await page.evaluate(() => {
      const boardCell = document.querySelector('x-ocaml[game-panel]');
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
      [sidebarLinks.length === 6,
        `workshop sidebar has ${sidebarLinks.length} links instead of 6`],
      [sidebarClosed && sidebarReopened, 'sidebar toggle did not close and reopen'],
      [credit?.includes('Smayan Agarwal'), 'contributor credit is missing'],
      [home === 'index.html', `workshop-home link is ${home}`],
      [pageText.includes('45-minute lab:'), 'game-lab scope is missing'],
      [pageText.includes('saved locally in this browser'), 'local-save guidance is missing'],
      [refresherLinks.includes('02-data-types.html#pattern-matching'),
        'pattern-matching refresher link is missing'],
      [refresherLinks.includes('02-data-types.html#matching-lists'),
        'list-matching refresher link is missing'],
      [layout.proseFont <= 16,
        `${name} prose font is too large (${layout.proseFont}px)`],
      [layout.cellFont <= layout.proseFont * 0.93,
        `${name} editor font is too large (${layout.cellFont}px for ${layout.proseFont}px prose)`],
      [layout.contentWidth >= 700,
        `${name} content column is too narrow (${layout.contentWidth}px)`],
      [layout.boardWidth <= 321,
        `${name} board exceeds its declared width (${layout.boardWidth}px)`],
      [layout.boardGap <= 36,
        `${name} board is detached from the content (${layout.boardGap}px gap)`],
      [lifeStacksAtLaptopWidth, 'Life layout does not stack at laptop width'],
      [panelChildren > 0, 'game panel did not render'],
      [errors.length === 0, errors.join('\n')],
    ].filter(([ok]) => !ok).map(([, message]) => message);

    if (failures.length) throw new Error(`${name}:\n${failures.join('\n')}`);

    const marker = `(* saved-work-check-${path.replace(/\W/g, '-')} *)`;
    const firstStudentEditor = page.locator('.quiz-code[data-quiz-id]').first()
      .locator('x-ocaml:not([data-quiz-test]):not([run-on="peek"])').last()
      .locator('.cm-content');
    await firstStudentEditor.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type(marker);
    await page.waitForTimeout(800);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const firstQuiz = document.querySelector('.quiz-code[data-quiz-id]');
      const editable = Array.from(firstQuiz?.querySelectorAll('x-ocaml') || [])
        .filter(cell => !cell.hasAttribute('data-quiz-test') && cell.getAttribute('run-on') !== 'peek');
      return editable.at(-1)?.shadowRoot?.querySelector('.cm-content');
    }, null, { timeout: 90_000 });
    const restored = await page.locator('.quiz-code[data-quiz-id]').first()
      .locator('x-ocaml:not([data-quiz-test]):not([run-on="peek"])').last()
      .locator('.cm-content').innerText();
    if (!restored.includes(marker)) throw new Error(`${name}: saved work did not survive reload`);

    await page.evaluate(() => {
      const prefix = `indiafoss-ocaml-cell:${location.pathname}#`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) localStorage.removeItem(key);
      }
    });
    console.log(`${name}: ${cellCount} cells upgraded; game rendered; work survived reload`);
    await page.close();
  }

  // The Joy sandbox page: chapter-built and listed with the other labs.
  // Check that its cells upgrade, that the src-load Joy payload is
  // reachable, and that running a `show` cell renders an SVG.
  {
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`page: ${error.message}`));
    page.on('requestfailed', request =>
      errors.push(`request: ${request.url()} — ${request.failure()?.errorText}`));

    await page.goto(`${ROOT}/06-joy.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!customElements.get('x-ocaml'), null,
      { timeout: 90_000 });
    await page.waitForFunction(() => {
      const cells = Array.from(document.querySelectorAll('x-ocaml'));
      return cells.length > 1 && cells.slice(0, 2)
        .every(cell => cell.shadowRoot?.querySelector('.run_btn button'));
    }, null, { timeout: 90_000 });
    const cellCount = await page.locator('x-ocaml').count();
    const sidebarLinks = await page.locator('.sidebar-nav a').allTextContents();
    await page.evaluate(() => {
      localStorage.removeItem('indiafoss-ocaml-sidebar-hidden');
      document.body.classList.remove('sidebar-hidden');
    });
    await page.locator('.sidebar-collapse').click();
    const sidebarClosed = await page.locator('body').evaluate(body =>
      body.classList.contains('sidebar-hidden'));
    await page.locator('.sidebar-collapse').click();
    const sidebarReopened = await page.locator('body').evaluate(body =>
      !body.classList.contains('sidebar-hidden'));

    // Cell 0 is the setup cell, cell 1 binds `c`, cell 2 is `show [ c ]`.
    // Running cell 2 also evaluates its predecessors.
    await page.evaluate(() => {
      document.querySelectorAll('x-ocaml')[2]
        .shadowRoot.querySelector('.run_btn button').click();
    });
    try {
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('x-ocaml')).some(cell =>
          cell.shadowRoot?.querySelector('svg') || cell.querySelector('svg')),
        null, { timeout: 90_000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() =>
        Array.from(document.querySelectorAll('x-ocaml')).slice(0, 3)
          .map(cell => cell.shadowRoot?.innerText || ''));
      throw new Error(`Joy did not render an SVG:\n${JSON.stringify(diagnostics)}\n${errors.join('\n')}`,
        { cause: error });
    }
    if (sidebarLinks.length !== 6 || !sidebarClosed || !sidebarReopened) {
      throw new Error('Joy: workshop sidebar is incomplete or its toggle failed');
    }
    if (errors.length) throw new Error(`Joy:\n${errors.join('\n')}`);
    console.log(`Joy: ${cellCount} cells upgraded; SVG rendered`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('game checks passed');

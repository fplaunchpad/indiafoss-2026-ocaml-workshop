#!/usr/bin/env node
// Pin down when OCaml cells are allowed to run.
//
// Two rules, for every page the site builds:
//
//   1. Loading a page runs nothing. x-ocaml's default is [run-on=load],
//      which evaluates a cell the moment it connects, so an ungated page
//      evaluated its whole document before the reader touched anything.
//      Divs.preprocess now stamps [run-on=click] on every ordinary cell
//      ([run-on=peek] on :::solution and hidden quiz-test cells), and the
//      only cell still allowed to run at load is a game page's hidden boot
//      sentinel, whose job is to prove the worker answers.
//   2. Pressing Run on a cell runs that cell and every earlier cell that
//      has not run yet, skipping peek cells, and nothing after it. That
//      backward cascade is x-ocaml's own (cell.ml's [run]); these checks
//      exist so a change to the run-on markers cannot quietly break it.
//
// The evidence is taken from two independent places:
//
//   * every message the page posts to the x-ocaml worker, captured by
//     wrapping Worker.prototype.postMessage before any page script runs.
//     The payload is an OCaml Marshal blob whose first data byte encodes
//     the request constructor, so an evaluation request is distinguishable
//     from the format/merlin chatter a cell sends when it merely connects,
//     and its [id] field says which cell asked. This is the decisive
//     signal: it cannot be erased by the page's own startup-output
//     suppression.
//   * the output panes x-ocaml renders into each cell's shadow root, which
//     is what a reader actually sees.
//
// Usage: node tools/playwright-run-on-load-check.mjs [ROOT] [page-filter]
//   ROOT defaults to http://localhost:8765/_site
//   page-filter, if given, keeps only pages whose file name contains it.

import { chromium } from 'playwright';

const ROOT = process.argv[2] || 'http://localhost:8765/_site';
const FILTER = process.argv[3] || '';
const T = 120_000;          // per-wait budget; the game worker is ~33 MB
const QUIET_MS = 2_500;     // window in which no further traffic may appear

// ---------------------------------------------------------------- pages
//
// [mid] is a hint: the check walks forward from that document index to the
// first cell that is actually runnable, so the numbers stay valid when a
// chapter gains or loses a cell.
const PAGES = [
  { file: '01-basics.html', game: false, mid: 13, quiz: true, afterPeek: true },
  { file: '02-data-types.html', game: false, mid: 20, quiz: true, afterPeek: true },
  { file: '03-modules.html', game: false, mid: 3, runAll: true, persist: true },
  { file: '04-tic-tac-toe.html', game: true, mid: 7, quiz: true, afterPeek: true },
  { file: '05-game-of-life.html', game: true, mid: 7, quiz: true, afterPeek: true },
  { file: '06-joy.html', game: false, mid: 8, svg: true },
  { file: '07-wordle.html', game: true, mid: 7, quiz: true, afterPeek: true },
].filter(p => p.file.includes(FILTER));

// ------------------------------------------------------ instrumentation
// Runs before any page script. Wraps the worker so we see every request
// the runtime posts and can count the responses that come back.
function instrument() {
  window.__xoReq = [];
  window.__xoResp = 0;
  const at = (c, i) => (typeof c === 'string' ? c.charCodeAt(i) : c[i]);
  // js_of_ocaml hands postMessage an MlBytes record: { t, c, l }, where [c]
  // is the byte store (a JS string or an index-keyed array).
  const decode = (data) => {
    const c = data && data.c;
    if (c == null) return { head: null, undecodable: true };
    const len = (typeof c === 'string') ? c.length : (data.l ?? Object.keys(c).length);
    const b = i => at(c, i);
    // Marshal small-format header is 20 bytes; data starts at 20.
    const head = b(20);
    let ascii = '';
    for (let i = 20; i < Math.min(len, 20 + 240); i++) {
      const ch = b(i);
      ascii += (ch >= 32 && ch < 127) ? String.fromCharCode(ch) : '.';
    }
    // PREFIX_SMALL_BLOCK: 0x80 | tag | size << 4.
    const isBlock = head >= 0x80;
    const tag = isBlock ? (head & 0x0f) : null;
    const size = isBlock ? ((head >> 4) & 0x07) : null;
    let id = null;
    if (isBlock) {
      const v = b(21);
      if (v >= 0x40 && v <= 0x7f) id = v - 0x40;        // PREFIX_SMALL_INT
      else if (v === 0x00) id = b(22);                   // CODE_INT8
      else if (v === 0x01) id = (b(22) << 8) | b(23);    // CODE_INT16
    }
    // Request constructors in the deployed bundle's X_protocol, read off
    // the wire (see the header comment): tag 1 / size 3 is the
    // checkpointed Eval(id, line, code) a Run press sends, tag 3 / size 3
    // is its peek twin (a :::solution or quiz-test cell), tag 4 / size 2
    // is the Format(id, code) request every cell sends just by connecting,
    // tag 0 / size 2 is a merlin query, and a game page's own repaint
    // dispatch arrives as tag 2 / size 2.
    let kind = 'other';
    if (isBlock && size === 3 && tag === 1) kind = 'eval';
    else if (isBlock && size === 3 && tag === 3) kind = 'peek';
    else if (isBlock && size === 2 && tag === 4) kind = 'format';
    else if (isBlock && size === 2 && tag === 0) kind = 'merlin';
    else if (isBlock && size === 2 && tag === 2) kind = 'dispatch';
    else if (head === 0x40) kind = 'setup';
    return { head, tag, size, id, len, kind, ascii, t: Math.round(performance.now()) };
  };
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (data, ...rest) {
    try { window.__xoReq.push(decode(data)); }
    catch (e) { window.__xoReq.push({ head: null, undecodable: true, err: String(e) }); }
    return post.call(this, data, ...rest);
  };
  const Native = window.Worker;
  const Wrapped = function (...args) {
    const w = new Native(...args);
    try { w.addEventListener('message', () => { window.__xoResp += 1; }); } catch (e) { /* ignore */ }
    return w;
  };
  Wrapped.prototype = Native.prototype;
  window.Worker = Wrapped;
}

// ------------------------------------------------------------- helpers
async function cellReport(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('x-ocaml')).map((cell, index) => ({
    index,
    runOn: cell.getAttribute('run-on'),
    boot: cell.hasAttribute('data-boot-sentinel'),
    sentinel: cell.hasAttribute('data-runtime-sentinel'),
    quizTest: cell.hasAttribute('data-quiz-test'),
    panel: cell.getAttribute('game-panel'),
    inSolution: !!cell.closest('details.solution'),
    inQuiz: cell.closest('.quiz-code')?.dataset?.quizId ?? null,
    upgraded: !!cell.shadowRoot?.querySelector('.cm-content'),
    panes: cell.shadowRoot
      ? cell.shadowRoot.querySelectorAll('.caml_meta, .caml_stdout, .caml_stderr, .caml_html').length
      : 0,
    paneText: cell.shadowRoot
      ? Array.from(cell.shadowRoot.querySelectorAll('.caml_meta, .caml_stdout, .caml_stderr, .caml_html'))
        .map(e => e.textContent || '').join('').trim().slice(0, 120)
      : '',
    source: (cell.getAttribute('data-source') || '').slice(0, 60),
  })));
}

const requests = page => page.evaluate(() => window.__xoReq);
const runRequests = reqs => reqs.filter(r => r.kind === 'eval' || r.kind === 'peek');

async function settleAfterLoad(page) {
  await page.waitForFunction(() => !!customElements.get('x-ocaml'), null, { timeout: T });
  await page.waitForFunction(() => {
    const cells = Array.from(document.querySelectorAll('x-ocaml'));
    return cells.length > 1
      && cells.every(c => c.shadowRoot?.querySelector('.run_btn button'))
      && cells.every(c => c.shadowRoot?.querySelector('.cm-content'));
  }, null, { timeout: T });
  await page.waitForFunction(() => document.body.classList.contains('runtime-ready'),
    null, { timeout: T });
  // The worker has to have answered something (formatted sources, merlin)
  // before "nothing has run" means anything at all.
  await page.waitForFunction(() => window.__xoResp > 0, null, { timeout: T });
  await page.waitForTimeout(QUIET_MS);
}

// Run the cell at [index] and wait until its own output lands, which is the
// end of the backward cascade, then let the page go quiet.
async function runCell(page, index) {
  const mark = await page.evaluate(() => window.__xoReq.length);
  await page.evaluate(i => {
    const cell = document.querySelectorAll('x-ocaml')[i];
    cell.shadowRoot.querySelector('.run_btn button').click();
  }, index);
  await page.waitForFunction(i => {
    const cell = document.querySelectorAll('x-ocaml')[i];
    return (cell.shadowRoot?.querySelectorAll('.caml_meta, .caml_stdout, .caml_stderr, .caml_html').length || 0) > 0;
  }, index, { timeout: T });
  await page.waitForTimeout(QUIET_MS);
  const reqs = await page.evaluate(m => window.__xoReq.slice(m), mark);
  return runRequests(reqs);
}

// Press a code quiz's Check button and report both the verdict and the
// evaluations it triggered. The verdict is captured inside the polling
// function, the first time the status line resolves: other page logic can
// rewrite that badge moments later (the stored-pass bookkeeping does), and
// what matters here is what the Check itself reported.
async function checkQuiz(page, quizId) {
  const mark = await page.evaluate(() => window.__xoReq.length);
  await page.evaluate(id => {
    window.__verdict = null;
    document.querySelector(`.quiz-code[data-quiz-id="${id}"] .quiz-check`).click();
  }, quizId);
  await page.waitForFunction(id => {
    const status = document.querySelector(`.quiz-code[data-quiz-id="${id}"] .quiz-status`);
    if (!status || window.__verdict) return !!window.__verdict;
    if (status.classList.contains('pass')) { window.__verdict = 'pass'; return true; }
    if (status.classList.contains('fail')) {
      window.__verdict = 'fail: ' + (status.textContent || '').trim();
      return true;
    }
    return false;
  }, quizId, { timeout: T });
  const verdict = await page.evaluate(() => window.__verdict);
  await page.waitForTimeout(QUIET_MS);
  const runs = runRequests(await page.evaluate(m => window.__xoReq.slice(m), mark));
  return { verdict, runs };
}

// Cells x-ocaml will actually evaluate on the way to [index]: everything at
// or before it that is not a peek cell.
const chainUpTo = (cells, index) =>
  cells.filter(c => c.index <= index && c.runOn !== 'peek').map(c => c.index);

// What pressing Run on [index] must evaluate, given what has already run:
// the clicked cell itself (a second press re-runs it) plus every earlier
// non-peek cell still sitting at Not_run.
const expectedRuns = (cells, index, ran) =>
  [...new Set(chainUpTo(cells, index).filter(i => !ran.has(i)).concat([index]))];

const sortNum = xs => [...xs].sort((a, b) => a - b);
const same = (a, b) => JSON.stringify(sortNum(a)) === JSON.stringify(sortNum(b));

function pickRunnable(cells, from) {
  const candidate = cells.find(c => c.index >= from && c.runOn === 'click' && !c.panel);
  return candidate ? candidate.index : null;
}

// Any cell showing output that the checks have not accounted for as run.
// Order-independent, so it catches a cell running too early and a cell
// running when nothing asked it to.
const strayOutput = (report, ran) =>
  report.filter(c => c.panes > 0 && !ran.has(c.index)).map(c => '#' + c.index);

// ---------------------------------------------------------------- driver
const browser = await chromium.launch({ headless: true });
const results = [];
let failed = 0;

try {
  for (const spec of PAGES) {
    const failures = [];
    const notes = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(instrument);
    const page = await context.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`page: ${e.message}`));
    page.on('requestfailed', r => errors.push(`request: ${r.url()} — ${r.failure()?.errorText}`));

    try {
      await page.goto(`${ROOT}/${spec.file}`, { waitUntil: 'domcontentloaded' });
      await settleAfterLoad(page);

      const cells = await cellReport(page);
      const loadReqs = await requests(page);
      const authored = cells.filter(c => !c.boot && !c.sentinel);

      // ---- 1. the decoder is reading real traffic ----------------------
      // If this ever stops holding, every "nothing ran" assertion below
      // would pass vacuously, so check it first.
      const formats = loadReqs.filter(r => r.kind === 'format');
      if (formats.length !== cells.length) {
        failures.push(`worker-protocol decoding looks wrong: ${formats.length} format requests for ${cells.length} cells`);
      }
      if (!loadReqs.some(r => r.kind === 'setup')) {
        failures.push('no Setup request decoded: the marshal decoder no longer matches the bundle');
      }
      if (loadReqs.some(r => r.undecodable)) {
        failures.push(`${loadReqs.filter(r => r.undecodable).length} worker messages could not be decoded`);
      }

      // ---- 2. every cell carries an explicit run-on mode ---------------
      const unmarked = authored.filter(c => c.runOn !== 'click' && c.runOn !== 'peek');
      if (unmarked.length) {
        failures.push(`${unmarked.length} cell(s) have no run-on=click/peek and so default to load: `
          + unmarked.map(c => `#${c.index} ${JSON.stringify(c.source)}`).join('; '));
      }
      for (const c of authored) {
        const wantPeek = c.quizTest || c.inSolution;
        if (wantPeek && c.runOn !== 'peek') {
          failures.push(`#${c.index} is a ${c.quizTest ? 'quiz-test' : 'solution'} cell but run-on=${c.runOn}`);
        }
        if (!wantPeek && c.runOn !== 'click') {
          failures.push(`#${c.index} should be run-on=click but is run-on=${c.runOn}`);
        }
      }

      // ---- 3. nothing ran merely because the page loaded ---------------
      const loadRuns = runRequests(loadReqs);
      if (spec.game) {
        // A game page keeps one hidden [run-on=load] boot sentinel; it is
        // the only cell allowed to run on its own, and it is not authored
        // content. Everything else must stay untouched.
        const boot = cells.find(c => c.boot);
        const rtSentinel = cells.find(c => c.sentinel);
        if (!boot) failures.push('game page has no boot sentinel');
        if (!rtSentinel) failures.push('game page has no runtime sentinel');
        if (boot && boot.runOn) failures.push(`boot sentinel should stay at the load default, has run-on=${boot.runOn}`);
        if (loadRuns.length !== 1) {
          failures.push(`expected exactly 1 evaluation at load (the boot sentinel), saw ${loadRuns.length}: `
            + JSON.stringify(loadRuns.map(r => [r.kind, r.id, r.ascii.slice(0, 60)])));
        } else {
          const only = loadRuns[0];
          if (!only.ascii.includes('__indiafoss_boot_ready__')) {
            failures.push(`the one evaluation at load is not the boot sentinel: ${JSON.stringify(only.ascii.slice(0, 80))}`);
          }
          if (boot && only.id !== boot.index) {
            failures.push(`boot evaluation carries id ${only.id}, boot sentinel sits at index ${boot.index}`);
          }
        }
        if (boot && boot.panes === 0) {
          failures.push('boot sentinel produced no output, so the runtime never proved itself ready');
        }
        const panelCells = cells.filter(c => c.panel);
        if (panelCells.length !== 1) {
          failures.push(`expected exactly one game-panel cell, found ${panelCells.length}`);
        } else if (panelCells[0].panel !== '#game-panel' || panelCells[0].runOn !== 'click') {
          failures.push(`game-panel cell has game-panel=${panelCells[0].panel} run-on=${panelCells[0].runOn}`);
        }
        const gameChapter = await page.evaluate(() => document.body.classList.contains('game-chapter'));
        if (!gameChapter) failures.push('game page lost its game-chapter body class');
      } else if (loadRuns.length !== 0) {
        failures.push(`page load evaluated ${loadRuns.length} cell(s): `
          + JSON.stringify(loadRuns.map(r => [r.kind, r.id, r.ascii.slice(0, 60)])));
      }
      const ranAtLoad = authored.filter(c => c.panes > 0);
      if (ranAtLoad.length) {
        failures.push(`${ranAtLoad.length} cell(s) already show output before any click: `
          + ranAtLoad.map(c => `#${c.index} ${JSON.stringify(c.paneText.slice(0, 60))}`).join('; '));
      }

      // Everything below tracks which cells have been evaluated so far, so
      // each later click can be checked against the exact expected set.
      const ran = new Set(cells.filter(c => c.panes > 0).map(c => c.index));

      // ---- 4. the very first cell runs alone ---------------------------
      const first = authored.find(c => c.runOn === 'click' && !c.panel);
      if (first) {
        const firstChain = expectedRuns(cells, first.index, ran);
        const got = await runCell(page, first.index);
        if (!same(got.map(r => r.id), firstChain)) {
          failures.push(`running the first cell (#${first.index}) evaluated ${JSON.stringify(sortNum(got.map(r => r.id)))}, expected ${JSON.stringify(sortNum(firstChain))}`);
        }
        for (const i of firstChain) ran.add(i);
        const after = await cellReport(page);
        const stray = strayOutput(after, ran);
        if (stray.length) failures.push(`running the first cell left output on ${stray.join(', ')}`);
        if (after[first.index].panes === 0) failures.push('the first cell ran but shows no output');
        notes.push(`first cell #${first.index}: ${firstChain.length} evaluation(s)`);
      } else {
        failures.push('no runnable cell found on the page');
      }

      // ---- 5. the game board comes up only when asked ------------------
      // Before the cells further down, because the board cell sits near the
      // top and any later cell's cascade would run it on the way past.
      if (spec.game) {
        const panelIndex = cells.find(c => c.panel)?.index ?? null;
        if (panelIndex === null) {
          failures.push('game page has no game-panel cell');
        } else {
          const emptyBefore = await page.evaluate(() =>
            document.querySelector('#game-panel')?.children.length === 0);
          if (!emptyBefore) {
            failures.push('#game-panel already has content before the board cell was run');
          }
          const mark = await page.evaluate(() => window.__xoReq.length);
          await page.evaluate(i => {
            document.querySelectorAll('x-ocaml')[i].shadowRoot.querySelector('.run_btn button').click();
          }, panelIndex);
          await page.waitForFunction(() => document.querySelector('#game-panel')?.children.length > 0,
            null, { timeout: T });
          await page.waitForTimeout(QUIET_MS);
          const got = runRequests(await page.evaluate(m => window.__xoReq.slice(m), mark));
          const expected = expectedRuns(cells, panelIndex, ran);
          if (!same(got.map(r => r.id), expected)) {
            failures.push(`running the board cell (#${panelIndex}) evaluated ${JSON.stringify(sortNum(got.map(r => r.id)))}, expected ${JSON.stringify(sortNum(expected))}`);
          }
          for (const i of expected) ran.add(i);
          const stray = strayOutput(await cellReport(page), ran);
          if (stray.length) {
            failures.push(`running the board cell left output on unrelated cell(s): ${stray.join(', ')}`);
          }
          notes.push(`board cell #${panelIndex}: panel rendered, ${expected.length} evaluation(s)`);
        }
      }

      // ---- 6. a cell partway down runs itself and its predecessors ----
      const mid = pickRunnable(cells, spec.mid);
      if (mid === null) {
        failures.push(`no runnable cell at or after index ${spec.mid}`);
      } else if (mid > (first?.index ?? -1)) {
        const expected = expectedRuns(cells, mid, ran);
        const got = await runCell(page, mid);
        if (!same(got.map(r => r.id), expected)) {
          failures.push(`running #${mid} evaluated ${JSON.stringify(sortNum(got.map(r => r.id)))}, expected ${JSON.stringify(sortNum(expected))}`);
        }
        if (got.some(r => r.kind === 'peek')) {
          failures.push(`running #${mid} sent a peek evaluation, so a solution/test cell was dragged into the chain`);
        }
        for (const i of expected) ran.add(i);
        const after = await cellReport(page);
        if (after[mid].panes === 0) failures.push(`#${mid} ran but shows no output`);
        const stray = strayOutput(after, ran);
        if (stray.length) {
          failures.push(`running #${mid} left output on unrelated cell(s): ${stray.join(', ')}`);
        }
        notes.push(`mid cell #${mid}: ${expected.length} evaluation(s)`);
      }

      // ---- 7. a cell sitting after a peek cell skips it ----------------
      if (spec.afterPeek) {
        // Reach past the next :::solution / quiz-test cell that has not run,
        // so the cascade has to step over a peek cell to get there.
        const lastRan = Math.max(...ran);
        const nextPeek = cells.find(c => c.runOn === 'peek' && c.index > lastRan);
        const target = nextPeek ? pickRunnable(cells, nextPeek.index + 1) : null;
        if (!nextPeek) {
          failures.push('expected an unrun peek cell further down the page');
        } else if (target === null) {
          failures.push(`no runnable cell after peek cell #${nextPeek.index}`);
        } else {
          const skipped = cells.filter(c => c.runOn === 'peek'
            && c.index > lastRan && c.index < target).map(c => '#' + c.index);
          if (!skipped.length) {
            failures.push(`running #${target} does not step over any peek cell, so this check proves nothing`);
          }
          const expected = expectedRuns(cells, target, ran);
          const got = await runCell(page, target);
          if (!same(got.map(r => r.id), expected)) {
            failures.push(`running #${target} (past peek ${skipped.join(', ')}) evaluated ${JSON.stringify(sortNum(got.map(r => r.id)))}, expected ${JSON.stringify(sortNum(expected))}`);
          }
          for (const i of expected) ran.add(i);
          const after = await cellReport(page);
          const peeked = after.filter(c => c.runOn === 'peek' && c.panes > 0);
          if (peeked.length) {
            failures.push(`peek cell(s) ran during the cascade: ${peeked.map(c => '#' + c.index).join(', ')}`);
          }
          const stray = strayOutput(after, ran);
          if (stray.length) {
            failures.push(`running #${target} left output on unrelated cell(s): ${stray.join(', ')}`);
          }
          notes.push(`cell after peek ${skipped.join(', ')}: ran #${target}, ${expected.length} evaluation(s)`);
        }
      }

      // ---- 8. a code quiz still checks itself -------------------------
      if (spec.quiz) {
        const quizId = await page.evaluate(() => {
          const quizzes = Array.from(document.querySelectorAll('.quiz-code[data-quiz-id]'));
          return quizzes.length ? quizzes[0].dataset.quizId : null;
        });
        if (!quizId) {
          failures.push('expected a :::quiz code block on this page');
        } else {
          const testIndex = cells.find(c => c.quizTest && c.inQuiz === quizId)?.index ?? null;
          const studentIndex = cells.filter(c => c.inQuiz === quizId && !c.quizTest && c.runOn === 'click')
            .map(c => c.index).pop() ?? null;
          if (testIndex === null || studentIndex === null) {
            failures.push(`quiz ${quizId} is missing a student or test cell`);
          } else {
            const { verdict, runs: got } = await checkQuiz(page, quizId);
            // Check runs the hidden peek cell, which pulls in every
            // not-yet-run ordinary cell before it and nothing else.
            const expected = expectedRuns(cells, testIndex, ran);
            if (!same(got.map(r => r.id), expected)) {
              failures.push(`Check on ${quizId} evaluated ${JSON.stringify(sortNum(got.map(r => r.id)))}, expected ${JSON.stringify(sortNum(expected))}`);
            }
            const peekRuns = got.filter(r => r.kind === 'peek').map(r => r.id);
            if (!same(peekRuns, [testIndex])) {
              failures.push(`Check on ${quizId} sent peek evaluations for ${JSON.stringify(sortNum(peekRuns))}, expected just the test cell #${testIndex}`);
            }
            for (const i of expected) ran.add(i);
            const after = await cellReport(page);
            if (after[testIndex].panes === 0) {
              failures.push(`quiz ${quizId}: the hidden test cell produced no output`);
            }
            const stray = strayOutput(after, ran);
            if (stray.length) {
              failures.push(`Check on ${quizId} left output on unrelated cell(s): ${stray.join(', ')}`);
            }
            notes.push(`quiz ${quizId}: Check on the unsolved template reported "${verdict}" after ${expected.length} evaluation(s)`);

            // ---- 8b. the reference answer still passes ----------------
            // Editing the student cell resets it and everything after it to
            // Not_run and clears their output, so this goes last on the page
            // and re-derives what has run from the page itself.
            const solutionIndex = cells.find(c => c.inSolution && c.index > testIndex)?.index ?? null;
            if (solutionIndex === null) {
              failures.push(`quiz ${quizId} has no :::solution cell to check against`);
            } else {
              const answer = await page.evaluate(i =>
                document.querySelectorAll('x-ocaml')[i].getAttribute('data-source'), solutionIndex);
              const editor = page.locator('x-ocaml').nth(studentIndex).locator('.cm-content');
              await editor.click();
              await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
              await page.keyboard.insertText(answer);
              const { verdict: answerVerdict } = await checkQuiz(page, quizId);
              if (answerVerdict !== 'pass') {
                failures.push(`quiz ${quizId}: Check on the reference answer reported "${answerVerdict}"`);
              } else {
                notes.push(`quiz ${quizId}: reference answer passes from a click`);
              }
              const after2 = await cellReport(page);
              const beyond = after2.filter(c => c.index > testIndex && c.panes > 0);
              if (beyond.length) {
                failures.push(`checking ${quizId} ran cell(s) past its test cell: ${beyond.map(c => '#' + c.index).join(', ')}`);
              }
            }
          }
        }
      }

      // ---- 9. the Joy sandbox still draws ------------------------------
      if (spec.svg) {
        const drew = await page.evaluate(() => Array.from(document.querySelectorAll('x-ocaml'))
          .some(c => c.shadowRoot?.querySelector('svg')));
        if (!drew) failures.push('no cell rendered an SVG after the runs above');
        else notes.push('SVG rendered from a clicked cell');
      }

      // ---- 10. Run all is still the way to run everything --------------
      if (spec.runAll) {
        const mark = await page.evaluate(() => window.__xoReq.length);
        await page.evaluate(() => document.querySelector('.run-all').click());
        const runnable = cells.filter(c => c.runOn === 'click').map(c => c.index);
        await page.waitForFunction(wanted => wanted.every(i => {
          const cell = document.querySelectorAll('x-ocaml')[i];
          return (cell.shadowRoot?.querySelectorAll('.caml_meta, .caml_stdout, .caml_stderr, .caml_html').length || 0) > 0;
        }), runnable, { timeout: T });
        await page.waitForTimeout(QUIET_MS);
        const got = runRequests(await page.evaluate(m => window.__xoReq.slice(m), mark));
        if (got.some(r => r.kind === 'peek')) {
          failures.push('Run all dragged a peek cell into the chain');
        }
        const after = await cellReport(page);
        const missed = after.filter(c => c.runOn === 'click' && c.panes === 0);
        if (missed.length) failures.push(`Run all left ${missed.map(c => '#' + c.index).join(', ')} unrun`);
        const peeked = after.filter(c => c.runOn === 'peek' && c.panes > 0);
        if (peeked.length) failures.push(`Run all ran peek cell(s) ${peeked.map(c => '#' + c.index).join(', ')}`);
        notes.push(`Run all: every one of ${runnable.length} cell(s) ran on request`);
      }

      // ---- 11. a reload with saved work still runs nothing -------------
      // A game page deliberately re-runs restored answers (that is what
      // waitForRuntimeQuiescence is for). A chapter page has no such
      // machinery and must come back completely cold.
      if (spec.persist) {
        const marker = `(* run-on-load-check-${spec.file.replace(/\W/g, '-')} *)`;
        const editIndex = cells.find(c => c.runOn === 'click').index;
        const editor = page.locator('x-ocaml').nth(editIndex).locator('.cm-content');
        await editor.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
        await page.keyboard.press('Enter');
        await page.keyboard.type(marker);
        await page.waitForTimeout(1200);   // outlast the 400ms persist debounce
        const saved = await page.evaluate(prefix => {
          for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i)?.startsWith(prefix)) return true;
          }
          return false;
        }, 'indiafoss-ocaml-cell:');
        if (!saved) {
          failures.push('typing into a cell did not persist, so the reload check below proves nothing');
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        await settleAfterLoad(page);
        const reloadRuns = runRequests(await requests(page));
        if (reloadRuns.length !== 0) {
          failures.push(`reloading with saved work evaluated ${reloadRuns.length} cell(s): `
            + JSON.stringify(reloadRuns.map(r => [r.kind, r.id])));
        }
        const reloaded = await cellReport(page);
        const withOutput = reloaded.filter(c => c.panes > 0);
        if (withOutput.length) {
          failures.push(`after reload ${withOutput.map(c => '#' + c.index).join(', ')} show output without a click`);
        }
        const restored = await page.evaluate(i => document.querySelectorAll('x-ocaml')[i]
          .shadowRoot.querySelector('.cm-content').innerText, editIndex);
        if (!restored.includes('run-on-load-check')) {
          failures.push('saved work did not survive the reload');
        }
        await page.evaluate(() => {
          const prefix = `indiafoss-ocaml-cell:${location.pathname}#`;
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) localStorage.removeItem(key);
          }
        });
        notes.push('reload with saved work: restored, and still nothing ran');
      }

      if (errors.length) failures.push(`browser errors:\n  ${errors.join('\n  ')}`);

      const census = cells.reduce((acc, c) => {
        const key = c.boot ? 'boot' : c.sentinel ? 'sentinel' : (c.runOn || 'LOAD-DEFAULT');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      results.push({ file: spec.file, cells: cells.length, census, notes, failures });
    } catch (error) {
      failures.push(`threw: ${error.message}`);
      if (errors.length) failures.push(`browser errors:\n  ${errors.join('\n  ')}`);
      results.push({ file: spec.file, cells: null, census: {}, notes, failures });
    } finally {
      await context.close();
    }
    const last = results[results.length - 1];
    if (last.failures.length) failed += 1;
    console.log(`\n[${last.failures.length ? 'FAIL' : 'ok'}] ${spec.file} — ${last.cells ?? '?'} cells ${JSON.stringify(last.census)}`);
    for (const n of last.notes) console.log(`   · ${n}`);
    for (const f of last.failures) console.log(`   x ${f}`);
  }
} finally {
  await browser.close();
}

console.log('');
if (failed) {
  console.log(`run-on checks FAILED on ${failed} page(s)`);
  process.exit(1);
}
console.log(`run-on checks passed on ${results.length} page(s): nothing runs at load, `
  + 'and a Run press runs exactly its own cell and its unrun predecessors');

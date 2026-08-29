(function () {
  'use strict';

  const storagePrefix = 'indiafoss-ocaml-game:';

  function storageKey() {
    return storagePrefix + (document.body?.dataset.gameId || location.pathname);
  }

  function studentCell(quiz) {
    const editable = Array.from(quiz.querySelectorAll('x-ocaml')).filter((cell) =>
      !cell.hasAttribute('data-quiz-test') && cell.getAttribute('run-on') !== 'peek');
    return editable.at(-1);
  }

  function readSavedWork() {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || '{}');
    } catch (_error) {
      return {};
    }
  }

  function writeSavedWork(saved) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(saved));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function sourceFromEditor(cell) {
    const lines = cell.shadowRoot?.querySelectorAll('.cm-content .cm-line');
    if (!lines?.length) return null;
    return Array.from(lines, (line) => line.textContent || '').join('\n');
  }

  function setStatus(message, state) {
    const status = document.querySelector('[data-save-status]');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function restore() {
    const saved = readSavedWork();
    document.querySelectorAll('.quiz-code[data-quiz-id]').forEach((quiz) => {
      const source = saved[quiz.dataset.quizId];
      const cell = studentCell(quiz);
      if (cell && typeof source === 'string') cell.textContent = source;
    });
  }

  function loadRuntime() {
    const script = document.createElement('script');
    script.src = new URL('x-ocaml.js', document.baseURI).href;
    script.setAttribute('src-worker', new URL('x-ocaml.worker.js', document.baseURI).href);
    script.async = true;
    document.head.appendChild(script);
  }

  function restoreThenLoad() {
    const start = () => {
      restore();
      loadRuntime();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  function attach() {
    const saved = readSavedWork();
    const timers = new Map();

    document.querySelectorAll('.quiz-code[data-quiz-id]').forEach((quiz) => {
      const cell = studentCell(quiz);
      const editor = cell?.shadowRoot?.querySelector('.cm-content');
      if (!cell || !editor) return;

      editor.addEventListener('input', () => {
        setStatus('Saving…', 'saving');
        clearTimeout(timers.get(quiz));
        timers.set(quiz, setTimeout(() => {
          const source = sourceFromEditor(cell);
          if (source === null) return;
          saved[quiz.dataset.quizId] = source;
          if (writeSavedWork(saved)) {
            setStatus('Saved locally in this browser.', 'saved');
          } else {
            setStatus('Could not save in this browser.', 'error');
          }
        }, 250));
      });
    });

    document.querySelector('[data-reset-saved-work]')?.addEventListener('click', () => {
      if (!window.confirm('Reset all saved answers on this game page?')) return;
      try {
        localStorage.removeItem(storageKey());
      } catch (_error) {
        // Reloading still restores the bundled starter code if storage is unavailable.
      }
      location.reload();
    });

    setStatus('Saved locally in this browser.', 'saved');
  }

  window.GamePersistence = { attach, restoreThenLoad };
})();

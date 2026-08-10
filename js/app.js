/**
 * MedCalc — application logic
 * ---------------------------
 * Vanilla JS, no build step, no dependencies.
 *
 *  · hash routing            #/          → card grid
 *                            #/bmi       → single calculator
 *  · schema-driven forms     built from CALCULATORS[].fields
 *  · validation              on submit, then live once a result exists
 *  · localStorage            theme + last inputs per calculator
 */

(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Helpers
     --------------------------------------------------------------- */

  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  /** Escape text before it goes into innerHTML. */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* private mode / quota — non-critical, ignore */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) { /* ignore */ }
    }
  };

  const KEY_THEME = 'medcalc:theme';
  const inputsKey = (id) => `medcalc:inputs:${id}`;

  const findCalc = (id) => CALCULATORS.find((c) => c.id === id);

  /* ---------------------------------------------------------------
     Theme
     --------------------------------------------------------------- */

  const themeToggle = byId('theme-toggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#161f26' : '#0f766e');
  }

  function initTheme() {
    const saved = store.get(KEY_THEME, null);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    themeToggle.addEventListener('click', () => {
      const next =
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      store.set(KEY_THEME, next);
    });

    // Follow the OS only while the user has not made an explicit choice.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (store.get(KEY_THEME, null) === null) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  /* ---------------------------------------------------------------
     Navigation & card grid
     --------------------------------------------------------------- */

  const navEl = byId('nav');
  const navEmpty = byId('nav-empty');
  const cardsEl = byId('cards');
  const cardsEmpty = byId('cards-empty');
  const searchInput = byId('search');

  function renderNav() {
    const groups = {};
    CALCULATORS.forEach((c) => {
      (groups[c.category] = groups[c.category] || []).push(c);
    });

    navEl.innerHTML = Object.keys(groups)
      .map(
        (category) => `
        <div class="nav-group" data-group="${esc(category)}">
          <h2 class="nav-group__title">${esc(category)}</h2>
          ${groups[category]
            .map(
              (c) => `
            <a class="nav-item" href="#/${esc(c.id)}" data-id="${esc(c.id)}">
              <span class="nav-item__icon" aria-hidden="true">${esc(c.icon)}</span>
              <span>${esc(c.name)}</span>
            </a>`
            )
            .join('')}
        </div>`
      )
      .join('');
  }

  function renderCards() {
    cardsEl.innerHTML = CALCULATORS.map(
      (c) => `
      <a class="card" href="#/${esc(c.id)}" data-id="${esc(c.id)}">
        <div class="card__top">
          <span class="card__icon" aria-hidden="true">${esc(c.icon)}</span>
          <span class="card__short">${esc(c.short)}</span>
        </div>
        <h2 class="card__name">${esc(c.name)}</h2>
        <p class="card__desc">${esc(c.description)}</p>
      </a>`
    ).join('');
  }

  function markActiveNav(id) {
    navEl.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === id);
      if (el.dataset.id === id) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------
     Search / filter
     --------------------------------------------------------------- */

  function matches(calc, query) {
    if (!query) return true;
    const haystack = [calc.name, calc.short, calc.category, calc.description]
      .concat(calc.keywords)
      .join(' ')
      .toLowerCase();
    // every whitespace-separated term must appear somewhere
    return query.split(/\s+/).every((term) => haystack.includes(term));
  }

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    const visible = CALCULATORS.filter((c) => matches(c, query)).map((c) => c.id);

    cardsEl.querySelectorAll('.card').forEach((el) => {
      el.hidden = !visible.includes(el.dataset.id);
    });
    navEl.querySelectorAll('.nav-item').forEach((el) => {
      el.hidden = !visible.includes(el.dataset.id);
    });
    // hide a category heading when all of its items are filtered out
    navEl.querySelectorAll('.nav-group').forEach((group) => {
      const any = Array.from(group.querySelectorAll('.nav-item')).some((el) => !el.hidden);
      group.hidden = !any;
    });

    const none = visible.length === 0;
    cardsEmpty.hidden = !none;
    navEmpty.hidden = !none;
    byId('cards-empty-q').textContent = `“${searchInput.value.trim()}”`;

    // On narrow screens the sidebar is hidden, so searching must reveal the grid.
    if (query && window.innerWidth <= 860 && location.hash.replace(/^#\/?/, '')) {
      location.hash = '#/';
    }
  }

  function initSearch() {
    searchInput.addEventListener('input', applyFilter);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        applyFilter();
        searchInput.blur();
      }
    });
    // "/" focuses search, the way most docs sites behave
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     Form building
     --------------------------------------------------------------- */

  const fieldsEl = byId('fields');
  const formEl = byId('calc-form');
  const resultEl = byId('result');

  const PLACEHOLDER_RESULT = resultEl.innerHTML;

  let current = null;   // calculator currently on screen
  let liveMode = false; // recalculate on every keystroke once a result is shown

  function fieldHTML(f) {
    const help = f.help ? `<p class="field__help" id="help-${esc(f.id)}">${esc(f.help)}</p>` : '';
    const describedBy = f.help ? ` aria-describedby="help-${esc(f.id)}"` : '';

    const labelRow = `
      <div class="field__label">
        <label for="f-${esc(f.id)}">${esc(f.label)}</label>
        ${f.unit ? `<span class="field__unit">${esc(f.unit)}</span>` : ''}
        ${f.optional ? '<span class="field__optional">optional</span>' : ''}
      </div>`;

    let control = '';

    if (f.type === 'number') {
      control = `
        <input
          class="field__control"
          type="number"
          inputmode="decimal"
          id="f-${esc(f.id)}"
          name="${esc(f.id)}"
          min="${esc(f.min)}"
          max="${esc(f.max)}"
          step="${esc(f.step)}"
          placeholder="${esc(f.placeholder || '')}"${describedBy}>`;
    } else if (f.type === 'select') {
      control = `
        <select class="field__control" id="f-${esc(f.id)}" name="${esc(f.id)}"${describedBy}>
          <option value="" selected>Select…</option>
          ${f.options
            .map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
            .join('')}
        </select>`;
    } else if (f.type === 'checkbox') {
      control = `
        <div class="checks" role="group" aria-labelledby="f-${esc(f.id)}"${describedBy}>
          ${f.options
            .map(
              (o) => `
            <label class="check">
              <input type="checkbox" name="${esc(f.id)}" value="${esc(o.value)}">
              <span>${esc(o.label)}</span>
              ${
                typeof o.points === 'number'
                  ? `<span class="check__points">${o.points > 0 ? '+' : ''}${o.points}</span>`
                  : ''
              }
            </label>`
            )
            .join('')}
        </div>`;
    }

    // checkbox groups label the whole fieldset rather than a single control
    const labelBlock =
      f.type === 'checkbox'
        ? `<div class="field__label"><span id="f-${esc(f.id)}">${esc(f.label)}</span></div>`
        : labelRow;

    return `
      <div class="field" data-field="${esc(f.id)}">
        ${labelBlock}
        ${control}
        ${help}
        <p class="field__error" id="err-${esc(f.id)}"></p>
      </div>`;
  }

  function buildForm(calc) {
    fieldsEl.innerHTML = calc.fields.map(fieldHTML).join('');
  }

  /* ---------------------------------------------------------------
     Reading & validating input
     --------------------------------------------------------------- */

  function setFieldError(id, message) {
    const wrap = fieldsEl.querySelector(`[data-field="${id}"]`);
    if (!wrap) return;
    const control = wrap.querySelector('.field__control');
    wrap.classList.toggle('has-error', Boolean(message));
    byId(`err-${id}`).textContent = message || '';
    if (control) control.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearErrors(calc) {
    calc.fields.forEach((f) => setFieldError(f.id, ''));
  }

  /**
   * Read the form and validate it against the schema.
   * @returns {{ok: boolean, values: object, errors: object}}
   */
  function readForm(calc) {
    const values = {};
    const errors = {};

    calc.fields.forEach((f) => {
      if (f.type === 'checkbox') {
        values[f.id] = Array.from(
          fieldsEl.querySelectorAll(`input[name="${f.id}"]:checked`)
        ).map((el) => el.value);
        return;
      }

      const el = byId(`f-${f.id}`);
      const raw = el ? el.value.trim() : '';

      if (raw === '') {
        if (f.optional) {
          values[f.id] = null;
        } else {
          errors[f.id] =
            f.type === 'select' ? 'Please choose an option.' : 'This field is required.';
        }
        return;
      }

      if (f.type === 'select') {
        values[f.id] = raw;
        return;
      }

      const num = Number(raw);
      if (!Number.isFinite(num)) {
        errors[f.id] = 'Enter a valid number.';
      } else if (typeof f.min === 'number' && num < f.min) {
        errors[f.id] = `Must be at least ${f.min}${f.unit ? ' ' + f.unit : ''}.`;
      } else if (typeof f.max === 'number' && num > f.max) {
        errors[f.id] = `Must be no more than ${f.max}${f.unit ? ' ' + f.unit : ''}.`;
      } else {
        values[f.id] = num;
      }
    });

    return { ok: Object.keys(errors).length === 0, values, errors };
  }

  /* ---------------------------------------------------------------
     Rendering the result
     --------------------------------------------------------------- */

  function renderResult(calc, values) {
    const r = calc.calculate(values);
    const level = r.badge ? r.badge.level : 'info';

    resultEl.innerHTML = `
      <div class="result" data-level="${esc(level)}">
        <div class="result__head">
          <p class="result__label">${esc(r.primary.label)}</p>
          <p class="result__value">
            ${esc(r.primary.value)}
            ${r.primary.unit ? `<span class="result__unit">${esc(r.primary.unit)}</span>` : ''}
          </p>
          ${r.badge ? `<span class="badge badge--${esc(level)}">${esc(r.badge.text)}</span>` : ''}
        </div>

        ${r.interpretation ? `<p class="result__interpretation">${esc(r.interpretation)}</p>` : ''}

        ${
          r.details && r.details.length
            ? `<dl class="result__details">
                ${r.details
                  .map(
                    (d) => `
                  <div class="result__row">
                    <dt>${esc(d.label)}</dt>
                    <dd>${esc(d.value)}</dd>
                  </div>`
                  )
                  .join('')}
              </dl>`
            : ''
        }

        ${r.note ? `<p class="result__note">${esc(r.note)}</p>` : ''}
      </div>`;
  }

  function resetResult() {
    resultEl.innerHTML = PLACEHOLDER_RESULT;
    liveMode = false;
  }

  /* ---------------------------------------------------------------
     Restoring saved input
     --------------------------------------------------------------- */

  function restoreValues(calc) {
    const saved = store.get(inputsKey(calc.id), null);
    if (!saved) return false;

    calc.fields.forEach((f) => {
      const value = saved[f.id];
      if (value === undefined || value === null) return;

      if (f.type === 'checkbox') {
        if (!Array.isArray(value)) return;
        fieldsEl.querySelectorAll(`input[name="${f.id}"]`).forEach((el) => {
          el.checked = value.includes(el.value);
        });
      } else {
        const el = byId(`f-${f.id}`);
        if (el) el.value = value;
      }
    });
    return true;
  }

  function saveValues(calc, values) {
    store.set(inputsKey(calc.id), values);
  }

  /* ---------------------------------------------------------------
     Form events
     --------------------------------------------------------------- */

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!current) return;

    const { ok, values, errors } = readForm(current);
    current.fields.forEach((f) => setFieldError(f.id, errors[f.id] || ''));

    if (!ok) {
      resetResult();
      const firstBad = current.fields.find((f) => errors[f.id]);
      const el = firstBad && byId(`f-${firstBad.id}`);
      if (el) el.focus();
      return;
    }

    renderResult(current, values);
    saveValues(current, values);
    liveMode = true;

    // On phones the result sits below the form — bring it into view.
    if (window.innerWidth <= 980) {
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  formEl.addEventListener('input', onFormChange);
  formEl.addEventListener('change', onFormChange);

  function onFormChange(e) {
    if (!current) return;

    // clear the error on the field being edited as soon as it is touched
    const name = e.target && e.target.name;
    if (name) setFieldError(name, '');

    if (!liveMode) return;

    const { ok, values } = readForm(current);
    if (ok) {
      renderResult(current, values);
      saveValues(current, values);
    }
  }

  formEl.addEventListener('reset', () => {
    if (!current) return;
    // let the browser clear the controls first
    setTimeout(() => {
      clearErrors(current);
      resetResult();
      store.remove(inputsKey(current.id));
      const first = byId(`f-${current.fields[0].id}`);
      if (first) first.focus();
    }, 0);
  });

  /* ---------------------------------------------------------------
     Router
     --------------------------------------------------------------- */

  const viewHome = byId('view-home');
  const viewCalc = byId('view-calc');

  function showHome() {
    current = null;
    liveMode = false;
    viewCalc.hidden = true;
    viewHome.hidden = false;
    markActiveNav(null);
    document.title = 'MedCalc — Clinical Calculators';
  }

  function showCalc(calc) {
    current = calc;
    liveMode = false;

    viewHome.hidden = true;
    viewCalc.hidden = false;

    byId('calc-icon').textContent = calc.icon;
    byId('calc-category').textContent = calc.category;
    byId('calc-name').textContent = calc.name;
    byId('calc-desc').textContent = calc.description;
    document.title = `${calc.short} — MedCalc`;

    buildForm(calc);
    resetResult();
    markActiveNav(calc.id);

    // Bring back the last values used for this calculator, and if they are
    // still complete and valid, show the result straight away.
    if (restoreValues(calc)) {
      const { ok, values } = readForm(calc);
      if (ok) {
        renderResult(calc, values);
        liveMode = true;
      }
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function route() {
    const id = location.hash.replace(/^#\/?/, '').trim();
    const calc = id && findCalc(id);

    if (calc) showCalc(calc);
    else showHome();
  }

  /* ---------------------------------------------------------------
     Boot
     --------------------------------------------------------------- */

  initTheme();
  renderNav();
  renderCards();
  initSearch();
  applyFilter();

  window.addEventListener('hashchange', route);
  route();
})();

/*
 * Tip Calculator - app.js
 *
 * - Exact integer (BigInt) arithmetic: no float multiplication, no float artifacts.
 * - Half-up rounding to cents.
 * - Text-only DOM updates (textContent / attributes). No innerHTML, eval,
 *   storage, cookies or network access.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Constants                                                          */
  /* ------------------------------------------------------------------ */

  var NUMBER_RE = /^\d*\.?\d+$|^\d+\.$/;
  var WHOLE_RE = /^\d+$/;
  var DASH = '\u2014';
  var ZERO_TEXT = '0.00';
  var DEFAULT_PRESET = 15;
  var DEFAULT_PEOPLE = '1';

  // BigInt constants created via BigInt() (no `n` literals) for parser safety.
  var ZERO = BigInt(0);
  var ONE = BigInt(1);
  var TWO = BigInt(2);
  var TEN = BigInt(10);
  var HUNDRED = BigInt(100);

  var MESSAGES = {
    billNegative: 'Bill cannot be negative.',
    billInvalid: 'Enter a valid number.',
    customTip: 'Custom tip must be between 0 and 100.',
    people: 'Number of people must be a whole number of at least 1.'
  };

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */

  var state = {
    selectedPreset: DEFAULT_PRESET, // number or null
    lastPreset: DEFAULT_PRESET      // number
  };

  /* ------------------------------------------------------------------ */
  /* DOM references                                                     */
  /* ------------------------------------------------------------------ */

  var form = document.getElementById('tip-form');
  var billInput = document.getElementById('bill');
  var billError = document.getElementById('bill-error');
  var customInput = document.getElementById('custom-tip');
  var customError = document.getElementById('custom-tip-error');
  var peopleInput = document.getElementById('people');
  var peopleError = document.getElementById('people-error');
  var resetBtn = document.getElementById('reset-btn');
  var presetButtons = Array.prototype.slice.call(
    document.querySelectorAll('.tip-preset')
  );
  var resultEls = [
    document.getElementById('result-tip'),
    document.getElementById('result-total'),
    document.getElementById('result-tip-per-person'),
    document.getElementById('result-total-per-person')
  ];

  if (!billInput || !customInput || !peopleInput) {
    return; // Required markup missing; nothing to wire up.
  }

  /* ------------------------------------------------------------------ */
  /* Exact decimal helpers                                              */
  /* ------------------------------------------------------------------ */

  /** 10^n as a BigInt (n is a non-negative integer). */
  function pow10(n) {
    var result = ONE;
    for (var i = 0; i < n; i += 1) {
      result *= TEN;
    }
    return result;
  }

  /**
   * Division of non-negative BigInts, rounded half-up.
   * floor(n / d + 1/2) == floor((2n + d) / (2d))
   */
  function divRoundHalfUp(n, d) {
    return (TWO * n + d) / (TWO * d);
  }

  /**
   * Parse a raw string into an exact decimal.
   * Returns { status: 'empty' | 'negative' | 'invalid' | 'valid',
   *           units: BigInt, scale: number }
   * where value = units / 10^scale.
   */
  function parseDecimal(raw) {
    var s = String(raw == null ? '' : raw).trim();

    if (s === '') {
      return { status: 'empty' };
    }
    if (s.charAt(0) === '-' && NUMBER_RE.test(s.slice(1))) {
      return { status: 'negative' };
    }
    if (!NUMBER_RE.test(s)) {
      return { status: 'invalid' };
    }

    var dot = s.indexOf('.');
    var intPart = dot === -1 ? s : s.slice(0, dot);
    var fracPart = dot === -1 ? '' : s.slice(dot + 1);
    var digits = intPart + fracPart;

    return {
      status: 'valid',
      units: BigInt(digits === '' ? '0' : digits),
      scale: fracPart.length
    };
  }

  /** Convert units/10^scale to an integer at targetScale, rounding half-up. */
  function toScaled(units, scale, targetScale) {
    if (scale <= targetScale) {
      return units * pow10(targetScale - scale);
    }
    return divRoundHalfUp(units, pow10(scale - targetScale));
  }

  /** Format non-negative integer cents as "X.YY". */
  function formatCents(cents) {
    var intPart = cents / HUNDRED;
    var frac = (cents % HUNDRED).toString();
    if (frac.length < 2) {
      frac = '0' + frac;
    }
    return intPart.toString() + '.' + frac;
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                         */
  /* ------------------------------------------------------------------ */

  function validateBill(raw) {
    var p = parseDecimal(raw);
    if (p.status === 'empty') {
      return { valid: true, cents: ZERO };
    }
    if (p.status === 'negative') {
      return { valid: false, message: MESSAGES.billNegative };
    }
    if (p.status === 'invalid') {
      return { valid: false, message: MESSAGES.billInvalid };
    }
    return { valid: true, cents: toScaled(p.units, p.scale, 2) };
  }

  function validateCustomTip(raw) {
    var p = parseDecimal(raw);
    if (p.status === 'empty') {
      return { valid: true, empty: true };
    }
    if (p.status !== 'valid') {
      return { valid: false, message: MESSAGES.customTip };
    }
    // 0 <= value <= 100  <=>  units <= 100 * 10^scale
    if (p.units > HUNDRED * pow10(p.scale)) {
      return { valid: false, message: MESSAGES.customTip };
    }
    return { valid: true, empty: false, units: p.units, scale: p.scale };
  }

  function validatePeople(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!WHOLE_RE.test(s)) {
      return { valid: false, message: MESSAGES.people };
    }
    var count = BigInt(s);
    if (count < ONE) {
      return { valid: false, message: MESSAGES.people };
    }
    return { valid: true, count: count };
  }

  /* ------------------------------------------------------------------ */
  /* DOM update helpers (text-only)                                     */
  /* ------------------------------------------------------------------ */

  function showError(input, errorEl, message) {
    if (errorEl) {
      if (errorEl.textContent !== message) {
        errorEl.textContent = message;
      }
      errorEl.hidden = false;
    }
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError(input, errorEl) {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    input.removeAttribute('aria-invalid');
  }

  function applyValidation(input, errorEl, result) {
    if (result.valid) {
      clearError(input, errorEl);
    } else {
      showError(input, errorEl, result.message);
    }
  }

  function setResults(texts) {
    for (var i = 0; i < resultEls.length; i += 1) {
      var el = resultEls[i];
      if (el && el.textContent !== texts[i]) {
        el.textContent = texts[i];
      }
    }
  }

  function readPresetValue(button) {
    var raw = button.getAttribute('data-tip');
    var p = parseDecimal(raw);
    if (p.status !== 'valid') {
      return null;
    }
    var n = Number(String(raw).trim());
    return isFinite(n) ? n : null;
  }

  function syncPresetButtons() {
    presetButtons.forEach(function (button) {
      var value = readPresetValue(button);
      var pressed = state.selectedPreset !== null && value === state.selectedPreset;
      button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      if (pressed) {
        button.classList.add('is-selected');
      } else {
        button.classList.remove('is-selected');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Core recalculation                                                 */
  /* ------------------------------------------------------------------ */

  function recalculate() {
    var bill = validateBill(billInput.value);
    var custom = validateCustomTip(customInput.value);
    var people = validatePeople(peopleInput.value);

    applyValidation(billInput, billError, bill);
    applyValidation(customInput, customError, custom);
    applyValidation(peopleInput, peopleError, people);

    // Preset / custom selection side effects.
    if (custom.valid) {
      if (custom.empty) {
        if (state.selectedPreset === null) {
          state.selectedPreset = state.lastPreset;
          syncPresetButtons();
        }
      } else if (state.selectedPreset !== null) {
        state.selectedPreset = null;
        syncPresetButtons();
      }
    }
    // Invalid custom value: presets left unchanged.

    if (!bill.valid || !custom.valid || !people.valid) {
      setResults([DASH, DASH, DASH, DASH]);
      return;
    }

    // Determine effective tip percentage as an exact decimal.
    var pctUnits;
    var pctScale;
    if (!custom.empty) {
      pctUnits = custom.units;
      pctScale = custom.scale;
    } else {
      var presetParsed = parseDecimal(String(
        state.selectedPreset === null ? state.lastPreset : state.selectedPreset
      ));
      if (presetParsed.status !== 'valid') {
        setResults([DASH, DASH, DASH, DASH]);
        return;
      }
      pctUnits = presetParsed.units;
      pctScale = presetParsed.scale;
    }

    var billCents = bill.cents;
    // tipCents = roundHalfUp(billCents * pct / 100), pct = pctUnits / 10^pctScale
    var tipCents = divRoundHalfUp(billCents * pctUnits, HUNDRED * pow10(pctScale));
    var totalCents = billCents + tipCents;
    var tipPerPerson = divRoundHalfUp(tipCents, people.count);
    var totalPerPerson = divRoundHalfUp(totalCents, people.count);

    setResults([
      formatCents(tipCents),
      formatCents(totalCents),
      formatCents(tipPerPerson),
      formatCents(totalPerPerson)
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* Event handlers                                                     */
  /* ------------------------------------------------------------------ */

  function onPresetClick(event) {
    var button = event.currentTarget;
    var value = readPresetValue(button);
    if (value === null) {
      return;
    }
    state.selectedPreset = value;
    state.lastPreset = value;
    syncPresetButtons();

    customInput.value = '';
    clearError(customInput, customError);

    recalculate();
  }

  function onReset() {
    billInput.value = '';
    customInput.value = '';
    peopleInput.value = DEFAULT_PEOPLE;

    state.selectedPreset = DEFAULT_PRESET;
    state.lastPreset = DEFAULT_PRESET;
    syncPresetButtons();

    clearError(billInput, billError);
    clearError(customInput, customError);
    clearError(peopleInput, peopleError);

    setResults([ZERO_TEXT, ZERO_TEXT, ZERO_TEXT, ZERO_TEXT]);
    recalculate();
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
  }

  billInput.addEventListener('input', recalculate);
  customInput.addEventListener('input', recalculate);
  peopleInput.addEventListener('input', recalculate);

  presetButtons.forEach(function (button) {
    button.addEventListener('click', onPresetClick);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', onReset);
  }

  /* ------------------------------------------------------------------ */
  /* Initial state                                                      */
  /* ------------------------------------------------------------------ */

  syncPresetButtons();
  recalculate();
})();

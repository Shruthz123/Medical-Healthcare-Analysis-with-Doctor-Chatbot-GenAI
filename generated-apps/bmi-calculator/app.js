/*
 * BMI Calculator
 *
 * Structure:
 *   1. Pure functions (no DOM access): parsing, validation, unit conversion,
 *      BMI calculation, rounding, categorisation and advice text.
 *   2. DOM layer: unit switching, error rendering and result rendering.
 *
 * Privacy: nothing is sent over the network, stored or logged.
 * Security: user input is never inserted as HTML; only textContent /
 *           text nodes are used for output.
 *
 * In Node.js the pure functions are exported via module.exports so they can be
 * verified independently (see tests/bmi.test.js).
 */
(function (root) {
  'use strict';

  /* =====================================================================
   * 1. PURE FUNCTIONS
   * ===================================================================== */

  const CM_PER_INCH = 2.54;
  const KG_PER_POUND = 0.45359237;
  const INCHES_PER_FOOT = 12;

  const LIMITS = Object.freeze({
    heightCm: Object.freeze({ min: 100, max: 250 }),
    weightKg: Object.freeze({ min: 20, max: 300 }),
    feet: Object.freeze({ min: 3, max: 8 }),
    inches: Object.freeze({ min: 0, max: 11.9 }),
    pounds: Object.freeze({ min: 44, max: 660 })
  });

  const MESSAGES = Object.freeze({
    heightCm: Object.freeze({
      empty: 'Enter your height in centimetres.',
      invalid: 'Height must be a number, for example 170.',
      range: 'Height must be between 100 and 250 cm.'
    }),
    weightKg: Object.freeze({
      empty: 'Enter your weight in kilograms.',
      invalid: 'Weight must be a number, for example 65.',
      range: 'Weight must be between 20 and 300 kg.'
    }),
    feet: Object.freeze({
      empty: 'Enter the feet part of your height.',
      invalid: 'Feet must be a whole number, for example 5.',
      range: 'Feet must be a whole number between 3 and 8.'
    }),
    inches: Object.freeze({
      empty: '',
      invalid: 'Inches must be a number, for example 9.',
      range: 'Inches must be between 0 and 11.9.'
    }),
    heightTotal: 'Total height must be between 100 and 250 cm (about 3 ft 3.4 in to 8 ft 2.4 in).',
    pounds: Object.freeze({
      empty: 'Enter your weight in pounds.',
      invalid: 'Weight must be a number, for example 150.',
      range: 'Weight must be between 44 and 660 lb.'
    })
  });

  const CATEGORIES = Object.freeze({
    underweight: Object.freeze({
      key: 'underweight',
      name: 'Underweight',
      range: 'Below 18.5',
      advice: 'Your BMI is below the healthy range for adults. Being underweight can sometimes be linked to nutritional or other health issues. Consider talking to a healthcare professional, such as your doctor, about your weight and diet.'
    }),
    normal: Object.freeze({
      key: 'normal',
      name: 'Normal weight',
      range: '18.5 to 24.9',
      advice: 'Your BMI is within the healthy range for adults. A balanced diet, regular physical activity and good sleep can help you maintain it.'
    }),
    overweight: Object.freeze({
      key: 'overweight',
      name: 'Overweight',
      range: '25.0 to 29.9',
      advice: 'Your BMI is above the healthy range for adults. Small, sustainable changes to diet and activity can help. Consider consulting a healthcare professional for personalised guidance.'
    }),
    obese: Object.freeze({
      key: 'obese',
      name: 'Obese',
      range: '30.0 and above',
      advice: 'Your BMI is in the obese range for adults, which is associated with a higher risk of some health conditions. Please consider consulting a healthcare professional, who can help you explore safe and effective options.'
    })
  });

  // Plain decimal numbers only: optional sign, digits, optional fraction.
  // Rejects "", "abc", "12abc", "1e2", "Infinity", "1,5", etc.
  const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

  /**
   * Parse a raw input string.
   * @param {*} raw
   * @returns {{status: 'empty'|'invalid'|'ok', value: number|null}}
   */
  function parseNumber(raw) {
    const text = raw === null || raw === undefined ? '' : String(raw).trim();
    if (text === '') {
      return { status: 'empty', value: null };
    }
    if (!NUMBER_PATTERN.test(text)) {
      return { status: 'invalid', value: null };
    }
    const value = Number(text);
    if (!Number.isFinite(value)) {
      return { status: 'invalid', value: null };
    }
    return { status: 'ok', value: value };
  }

  /**
   * Validate one raw field value against a rule.
   * @param {*} raw
   * @param {{min:number, max:number, integer?:boolean, emptyValue?:number,
   *          messages:{empty:string, invalid:string, range:string}}} rule
   * @returns {{value: number|null, error: string|null}}
   */
  function validateField(raw, rule) {
    const parsed = parseNumber(raw);
    if (parsed.status === 'empty') {
      if (typeof rule.emptyValue === 'number') {
        return { value: rule.emptyValue, error: null };
      }
      return { value: null, error: rule.messages.empty };
    }
    if (parsed.status === 'invalid') {
      return { value: null, error: rule.messages.invalid };
    }
    if (rule.integer && !Number.isInteger(parsed.value)) {
      return { value: null, error: rule.messages.range };
    }
    if (parsed.value < rule.min || parsed.value > rule.max) {
      return { value: null, error: rule.messages.range };
    }
    return { value: parsed.value, error: null };
  }

  /** Convert feet + inches to centimetres (1 in = 2.54 cm exactly). */
  function feetInchesToCm(feet, inches) {
    return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
  }

  /** Convert pounds to kilograms (1 lb = 0.45359237 kg exactly). */
  function poundsToKg(pounds) {
    return pounds * KG_PER_POUND;
  }

  /**
   * Validate metric inputs.
   * @param {{heightCm:*, weightKg:*}} raw
   * @returns {{valid:boolean, errors:Object<string,string>, heightCm:number|null, weightKg:number|null}}
   */
  function validateMetric(raw) {
    const source = raw || {};
    const errors = {};

    const height = validateField(source.heightCm, {
      min: LIMITS.heightCm.min,
      max: LIMITS.heightCm.max,
      messages: MESSAGES.heightCm
    });
    const weight = validateField(source.weightKg, {
      min: LIMITS.weightKg.min,
      max: LIMITS.weightKg.max,
      messages: MESSAGES.weightKg
    });

    if (height.error) errors.heightCm = height.error;
    if (weight.error) errors.weightKg = weight.error;

    const valid = Object.keys(errors).length === 0;
    return {
      valid: valid,
      errors: errors,
      heightCm: valid ? height.value : null,
      weightKg: valid ? weight.value : null
    };
  }

  /**
   * Validate imperial inputs and convert them to metric.
   * Error keys: feet, inches, heightTotal, pounds.
   * @param {{feet:*, inches:*, pounds:*}} raw
   * @returns {{valid:boolean, errors:Object<string,string>, heightCm:number|null, weightKg:number|null}}
   */
  function validateImperial(raw) {
    const source = raw || {};
    const errors = {};

    const feet = validateField(source.feet, {
      min: LIMITS.feet.min,
      max: LIMITS.feet.max,
      integer: true,
      messages: MESSAGES.feet
    });
    const inches = validateField(source.inches, {
      min: LIMITS.inches.min,
      max: LIMITS.inches.max,
      emptyValue: 0,
      messages: MESSAGES.inches
    });
    const pounds = validateField(source.pounds, {
      min: LIMITS.pounds.min,
      max: LIMITS.pounds.max,
      messages: MESSAGES.pounds
    });

    if (feet.error) errors.feet = feet.error;
    if (inches.error) errors.inches = inches.error;

    let heightCm = null;
    if (!feet.error && !inches.error) {
      heightCm = feetInchesToCm(feet.value, inches.value);
      if (heightCm < LIMITS.heightCm.min || heightCm > LIMITS.heightCm.max) {
        errors.heightTotal = MESSAGES.heightTotal;
        heightCm = null;
      }
    }

    if (pounds.error) errors.pounds = pounds.error;

    const valid = Object.keys(errors).length === 0;
    return {
      valid: valid,
      errors: errors,
      heightCm: valid ? heightCm : null,
      weightKg: valid ? poundsToKg(pounds.value) : null
    };
  }

  /**
   * BMI = weight (kg) / height (m)^2.
   * Computed as kg * 10000 / cm^2 to reduce floating-point error.
   */
  function calculateBmi(heightCm, weightKg) {
    if (!(Number.isFinite(heightCm) && heightCm > 0)) {
      throw new RangeError('Height must be a positive finite number.');
    }
    if (!(Number.isFinite(weightKg) && weightKg > 0)) {
      throw new RangeError('Weight must be a positive finite number.');
    }
    return (weightKg * 10000) / (heightCm * heightCm);
  }

  /** Shift a number's decimal point using exponent notation (avoids binary multiplication error). */
  function shiftDecimal(value, places) {
    const parts = String(value).split('e');
    const exponent = (parts.length > 1 ? Number(parts[1]) : 0) + places;
    return Number(parts[0] + 'e' + exponent);
  }

  /**
   * Round half-up (half away from zero) to a number of decimal places,
   * based on the number's shortest decimal representation.
   * e.g. roundHalfUp(24.95) === 25, roundHalfUp(1.005, 2) === 1.01
   */
  function roundHalfUp(value, decimals) {
    const places = decimals === undefined ? 1 : decimals;
    if (!Number.isFinite(value)) {
      throw new TypeError('roundHalfUp expects a finite number.');
    }
    if (!Number.isInteger(places) || places < 0) {
      throw new RangeError('decimals must be a non-negative integer.');
    }
    const sign = value < 0 ? -1 : 1;
    const shifted = shiftDecimal(Math.abs(value), places);
    const result = sign * shiftDecimal(Math.round(shifted), -places);
    return result === 0 ? 0 : result; // normalise -0
  }

  /** Format a rounded BMI for display, always with one decimal place. */
  function formatBmi(roundedBmi) {
    return roundedBmi.toFixed(1);
  }

  /**
   * Category key from the displayed (rounded to one decimal) BMI.
   *   < 18.5 underweight | 18.5–24.9 normal | 25.0–29.9 overweight | >= 30.0 obese
   */
  function categorize(displayedBmi) {
    if (!Number.isFinite(displayedBmi)) {
      throw new TypeError('categorize expects a finite number.');
    }
    if (displayedBmi < 18.5) return 'underweight';
    if (displayedBmi < 25) return 'normal';
    if (displayedBmi < 30) return 'overweight';
    return 'obese';
  }

  /**
   * Full calculation pipeline from metric values.
   * @returns {{bmi:number, roundedBmi:number, displayBmi:string, category:string,
   *            categoryName:string, advice:string}}
   */
  function computeResult(heightCm, weightKg) {
    const bmi = calculateBmi(heightCm, weightKg);
    const roundedBmi = roundHalfUp(bmi, 1);
    const category = categorize(roundedBmi);
    const info = CATEGORIES[category];
    return {
      bmi: bmi,
      roundedBmi: roundedBmi,
      displayBmi: formatBmi(roundedBmi),
      category: category,
      categoryName: info.name,
      advice: info.advice
    };
  }

  const api = Object.freeze({
    CM_PER_INCH: CM_PER_INCH,
    KG_PER_POUND: KG_PER_POUND,
    LIMITS: LIMITS,
    MESSAGES: MESSAGES,
    CATEGORIES: CATEGORIES,
    parseNumber: parseNumber,
    validateMetric: validateMetric,
    validateImperial: validateImperial,
    feetInchesToCm: feetInchesToCm,
    poundsToKg: poundsToKg,
    calculateBmi: calculateBmi,
    roundHalfUp: roundHalfUp,
    formatBmi: formatBmi,
    categorize: categorize,
    computeResult: computeResult
  });

  // Node.js / CommonJS export for independent verification.
  if (typeof module === 'object' && module !== null && module.exports) {
    module.exports = api;
  }

  /* =====================================================================
   * 2. DOM LAYER (browser only)
   * ===================================================================== */

  if (typeof document === 'undefined') {
    return;
  }

  if (root) {
    root.BMICalculator = api;
  }

  function initDom() {
    const byId = function (id) { return document.getElementById(id); };

    const form = byId('bmi-form');
    const resultEl = byId('result');
    if (!form || !resultEl) {
      return;
    }

    const unitRadios = Array.prototype.slice.call(form.querySelectorAll('input[name="unit"]'));

    const groups = {
      metric: byId('metric-fields'),
      imperial: byId('imperial-fields')
    };

    const inputs = {
      heightCm: byId('height-cm'),
      weightKg: byId('weight-kg'),
      feet: byId('height-ft'),
      inches: byId('height-in'),
      pounds: byId('weight-lb')
    };

    // Insertion order matters: a field's own error is listed before the shared total-height error.
    const errorEls = {
      heightCm: byId('height-cm-error'),
      weightKg: byId('weight-kg-error'),
      feet: byId('height-ft-error'),
      inches: byId('height-in-error'),
      heightTotal: byId('height-imperial-error'),
      pounds: byId('weight-lb-error')
    };

    // Which inputs each error message belongs to.
    const ERROR_TARGETS = {
      heightCm: ['heightCm'],
      weightKg: ['weightKg'],
      feet: ['feet'],
      inches: ['inches'],
      heightTotal: ['feet', 'inches'],
      pounds: ['pounds']
    };

    const FIELD_ORDER = {
      metric: ['heightCm', 'weightKg'],
      imperial: ['feet', 'inches', 'pounds']
    };

    // Remember each input's baseline aria-describedby (its hint).
    Object.keys(inputs).forEach(function (key) {
      const input = inputs[key];
      input.dataset.baseDescribedby = input.getAttribute('aria-describedby') || '';
    });

    function getSelectedUnit() {
      for (let i = 0; i < unitRadios.length; i += 1) {
        if (unitRadios[i].checked) {
          return unitRadios[i].value === 'imperial' ? 'imperial' : 'metric';
        }
      }
      return 'metric';
    }

    function renderErrors(errors) {
      const extraDescribedBy = {};

      Object.keys(errorEls).forEach(function (key) {
        const el = errorEls[key];
        const message = errors[key];
        if (message) {
          const prefix = document.createElement('span');
          prefix.className = 'visually-hidden';
          prefix.textContent = 'Error: ';
          el.replaceChildren(prefix, document.createTextNode(message));
          el.hidden = false;
          ERROR_TARGETS[key].forEach(function (target) {
            (extraDescribedBy[target] = extraDescribedBy[target] || []).push(el.id);
          });
        } else {
          el.replaceChildren();
          el.hidden = true;
        }
      });

      Object.keys(inputs).forEach(function (key) {
        const input = inputs[key];
        const extra = extraDescribedBy[key] || [];
        const ids = [input.dataset.baseDescribedby].concat(extra).filter(Boolean).join(' ');
        if (ids) {
          input.setAttribute('aria-describedby', ids);
        } else {
          input.removeAttribute('aria-describedby');
        }
        if (extra.length > 0) {
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.removeAttribute('aria-invalid');
        }
      });
    }

    function clearErrors() {
      renderErrors({});
    }

    function clearResult() {
      resultEl.replaceChildren();
    }

    function createTextElement(tag, className, text) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      el.textContent = text;
      return el;
    }

    function renderResult(result) {
      const card = document.createElement('div');
      card.className = 'result-card category-' + result.category;

      card.appendChild(createTextElement('h2', 'result-heading', 'Your result'));

      const bmiLine = document.createElement('p');
      bmiLine.className = 'result-bmi';
      bmiLine.appendChild(createTextElement('span', 'result-bmi-label', 'BMI'));
      bmiLine.appendChild(document.createTextNode(' '));
      bmiLine.appendChild(createTextElement('span', 'result-bmi-value', result.displayBmi));
      card.appendChild(bmiLine);

      const categoryLine = document.createElement('p');
      categoryLine.className = 'result-category';
      categoryLine.appendChild(createTextElement('span', 'category-label', 'Category:'));
      categoryLine.appendChild(document.createTextNode(' '));
      categoryLine.appendChild(createTextElement('strong', 'category-badge', result.categoryName));
      card.appendChild(categoryLine);

      card.appendChild(createTextElement('p', 'result-advice', result.advice));

      // Fresh nodes each time so screen readers announce repeated calculations.
      resultEl.replaceChildren(card);
    }

    function focusFirstInvalid(unit) {
      const order = FIELD_ORDER[unit];
      for (let i = 0; i < order.length; i += 1) {
        const input = inputs[order[i]];
        if (input.getAttribute('aria-invalid') === 'true') {
          input.focus();
          return;
        }
      }
    }

    function handleCalculate() {
      const unit = getSelectedUnit();
      clearResult();

      const validation = unit === 'imperial'
        ? validateImperial({
          feet: inputs.feet.value,
          inches: inputs.inches.value,
          pounds: inputs.pounds.value
        })
        : validateMetric({
          heightCm: inputs.heightCm.value,
          weightKg: inputs.weightKg.value
        });

      renderErrors(validation.errors);

      if (!validation.valid) {
        focusFirstInvalid(unit);
        return;
      }

      renderResult(computeResult(validation.heightCm, validation.weightKg));
    }

    function applyUnit(unit) {
      groups.metric.hidden = unit !== 'metric';
      groups.imperial.hidden = unit !== 'imperial';
      Object.keys(inputs).forEach(function (key) {
        inputs[key].value = '';
      });
      clearErrors();
      clearResult();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      handleCalculate();
    });

    // Enter on a radio button also triggers Calculate (text inputs use implicit submission).
    form.addEventListener('keydown', function (event) {
      const target = event.target;
      if (event.key === 'Enter' && target && target.type === 'radio') {
        event.preventDefault();
        handleCalculate();
      }
    });

    unitRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        applyUnit(getSelectedUnit());
      });
    });

    // If the page is restored from the back/forward cache, clear any restored entries.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        applyUnit(getSelectedUnit());
      }
    });

    applyUnit(getSelectedUnit());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDom);
  } else {
    initDom();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
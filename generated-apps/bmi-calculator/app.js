/*
 * BMI Calculator - behaviour and pure logic.
 *
 * - Pure functions (no DOM access) are exported on window.BmiCalculator
 *   and via module.exports, so they can be tested apart from the page.
 * - DOM wiring runs only when a document exists.
 * - No network, no storage, no eval, no innerHTML: all text is written
 *   with textContent.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------

  var DECIMAL_RE = /^\d+(\.\d+)?$|^\.\d+$/;
  var NEGATIVE_DECIMAL_RE = /^-(\d+(\.\d+)?|\.\d+)$/;
  var WHOLE_RE = /^\d+$/;

  var MESSAGES = {
    emptyHeightCm: 'Please enter your height in centimetres.',
    emptyWeightKg: 'Please enter your weight in kilograms.',
    emptyFeet: 'Please enter feet.',
    emptyInches: 'Please enter inches (use 0 if none).',
    emptyPounds: 'Please enter your weight in pounds.',
    notNumber: 'Please enter a number.',
    feetWhole: 'Feet must be a whole number.',
    notPositive: 'Value must be greater than zero.',
    inchesRange: 'Inches must be at least 0 and less than 12.',
    cmRange: 'Height must be between 50 and 300 cm.',
    kgRange: 'Weight must be between 2 and 650 kg.',
    lbRange: 'Weight must be between 4.4 and 1433 lb.',
    totalHeightRange: 'Total height must be between 1 ft 8 in and 9 ft 10 in.'
  };

  var RANGES = {
    cmMin: 50,
    cmMax: 300,
    kgMin: 2,
    kgMax: 650,
    lbMin: 4.4,
    lbMax: 1433,
    totalInchesMin: 20, // 1 ft 8 in
    totalInchesMax: 118 // 9 ft 10 in
  };

  var CATEGORY_KEYS = {
    'Underweight': 'underweight',
    'Normal weight': 'normal',
    'Overweight': 'overweight',
    'Obese': 'obese'
  };

  // ---------------------------------------------------------------------
  // Pure calculation functions
  // ---------------------------------------------------------------------

  /**
   * Metric BMI = kg / (m)^2 where m = cm / 100.
   * @param {number} heightCm
   * @param {number} weightKg
   * @returns {number}
   */
  function calculateBmiMetric(heightCm, weightKg) {
    var meters = heightCm / 100;
    return weightKg / (meters * meters);
  }

  /**
   * Imperial BMI = 703 * lb / (total inches)^2.
   * @param {number} feet
   * @param {number} inches
   * @param {number} pounds
   * @returns {number}
   */
  function calculateBmiImperial(feet, inches, pounds) {
    var totalInches = feet * 12 + inches;
    return (703 * pounds) / (totalInches * totalInches);
  }

  /**
   * Round a BMI to one decimal place.
   * @param {number} bmi
   * @returns {number}
   */
  function roundBmi(bmi) {
    return Math.round(bmi * 10) / 10;
  }

  /**
   * WHO adult category for an already-rounded BMI.
   * @param {number} roundedBmi
   * @returns {"Underweight"|"Normal weight"|"Overweight"|"Obese"}
   */
  function getBmiCategory(roundedBmi) {
    if (roundedBmi < 18.5) {
      return 'Underweight';
    }
    if (roundedBmi < 25.0) {
      return 'Normal weight';
    }
    if (roundedBmi < 30.0) {
      return 'Overweight';
    }
    return 'Obese';
  }

  /**
   * Machine-friendly key for a category label.
   * @param {string} category
   * @returns {"underweight"|"normal"|"overweight"|"obese"|""}
   */
  function categoryKey(category) {
    return Object.prototype.hasOwnProperty.call(CATEGORY_KEYS, category)
      ? CATEGORY_KEYS[category]
      : '';
  }

  // ---------------------------------------------------------------------
  // Pure validation helpers
  // ---------------------------------------------------------------------

  function toTrimmedString(raw) {
    if (raw === null || raw === undefined) {
      return '';
    }
    return String(raw).trim();
  }

  /**
   * Parse a strictly positive decimal within [min, max].
   * Returns {error: string} or {value: number}.
   */
  function parsePositiveDecimalInRange(raw, emptyMessage, min, max, rangeMessage) {
    var text = toTrimmedString(raw);
    if (text === '') {
      return { error: emptyMessage };
    }
    if (NEGATIVE_DECIMAL_RE.test(text)) {
      return { error: MESSAGES.notPositive };
    }
    if (!DECIMAL_RE.test(text)) {
      return { error: MESSAGES.notNumber };
    }
    var value = parseFloat(text);
    if (!isFinite(value)) {
      return { error: MESSAGES.notNumber };
    }
    if (value <= 0) {
      return { error: MESSAGES.notPositive };
    }
    if (value < min || value > max) {
      return { error: rangeMessage };
    }
    return { value: value };
  }

  /** Feet: whole number greater than zero. */
  function parseFeet(raw) {
    var text = toTrimmedString(raw);
    if (text === '') {
      return { error: MESSAGES.emptyFeet };
    }
    if (NEGATIVE_DECIMAL_RE.test(text)) {
      return { error: MESSAGES.notPositive };
    }
    if (!DECIMAL_RE.test(text)) {
      return { error: MESSAGES.notNumber };
    }
    if (!WHOLE_RE.test(text)) {
      return { error: MESSAGES.feetWhole };
    }
    var value = parseInt(text, 10);
    if (!isFinite(value)) {
      return { error: MESSAGES.notNumber };
    }
    if (value <= 0) {
      return { error: MESSAGES.notPositive };
    }
    return { value: value };
  }

  /** Inches: decimal, at least 0 and less than 12. */
  function parseInches(raw) {
    var text = toTrimmedString(raw);
    if (text === '') {
      return { error: MESSAGES.emptyInches };
    }
    if (NEGATIVE_DECIMAL_RE.test(text)) {
      return { error: MESSAGES.inchesRange };
    }
    if (!DECIMAL_RE.test(text)) {
      return { error: MESSAGES.notNumber };
    }
    var value = parseFloat(text);
    if (!isFinite(value)) {
      return { error: MESSAGES.notNumber };
    }
    if (value < 0 || value >= 12) {
      return { error: MESSAGES.inchesRange };
    }
    return { value: value };
  }

  // ---------------------------------------------------------------------
  // Pure validators
  // ---------------------------------------------------------------------

  /**
   * @param {{heightCm: string, weightKg: string}} input
   * @returns {{valid: boolean, errors: Object, values?: {heightCm: number, weightKg: number}}}
   */
  function validateMetric(input) {
    var source = input || {};
    var errors = {};

    var height = parsePositiveDecimalInRange(
      source.heightCm,
      MESSAGES.emptyHeightCm,
      RANGES.cmMin,
      RANGES.cmMax,
      MESSAGES.cmRange
    );
    var weight = parsePositiveDecimalInRange(
      source.weightKg,
      MESSAGES.emptyWeightKg,
      RANGES.kgMin,
      RANGES.kgMax,
      MESSAGES.kgRange
    );

    if (height.error) {
      errors['height-cm'] = height.error;
    }
    if (weight.error) {
      errors['weight-kg'] = weight.error;
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors: errors };
    }
    return {
      valid: true,
      errors: errors,
      values: { heightCm: height.value, weightKg: weight.value }
    };
  }

  /**
   * @param {{feet: string, inches: string, pounds: string}} input
   * @returns {{valid: boolean, errors: Object, values?: {feet: number, inches: number, pounds: number}}}
   */
  function validateImperial(input) {
    var source = input || {};
    var errors = {};

    var feet = parseFeet(source.feet);
    var inches = parseInches(source.inches);
    var pounds = parsePositiveDecimalInRange(
      source.pounds,
      MESSAGES.emptyPounds,
      RANGES.lbMin,
      RANGES.lbMax,
      MESSAGES.lbRange
    );

    if (feet.error) {
      errors['height-ft'] = feet.error;
    }
    if (inches.error) {
      errors['height-in'] = inches.error;
    }
    if (pounds.error) {
      errors['weight-lb'] = pounds.error;
    }

    if (!feet.error && !inches.error) {
      var totalInches = feet.value * 12 + inches.value;
      if (totalInches < RANGES.totalInchesMin || totalInches > RANGES.totalInchesMax) {
        errors['height-ft'] = MESSAGES.totalHeightRange;
        errors['height-in'] = MESSAGES.totalHeightRange;
      }
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors: errors };
    }
    return {
      valid: true,
      errors: errors,
      values: { feet: feet.value, inches: inches.value, pounds: pounds.value }
    };
  }

  // ---------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------

  var api = {
    calculateBmiMetric: calculateBmiMetric,
    calculateBmiImperial: calculateBmiImperial,
    roundBmi: roundBmi,
    getBmiCategory: getBmiCategory,
    categoryKey: categoryKey,
    validateMetric: validateMetric,
    validateImperial: validateImperial
  };

  if (typeof window !== 'undefined') {
    window.BmiCalculator = api;
  }
  if (typeof module !== 'undefined' && module && typeof module === 'object') {
    module.exports = api;
  }

  // ---------------------------------------------------------------------
  // DOM wiring
  // ---------------------------------------------------------------------

  if (typeof document === 'undefined') {
    return;
  }

  var METRIC_FIELD_IDS = ['height-cm', 'weight-kg'];
  var IMPERIAL_FIELD_IDS = ['height-ft', 'height-in', 'weight-lb'];
  var ALL_FIELD_IDS = METRIC_FIELD_IDS.concat(IMPERIAL_FIELD_IDS);

  function byId(id) {
    return document.getElementById(id);
  }

  function errorElementFor(fieldId) {
    return byId(fieldId + '-error');
  }

  function clearFieldError(fieldId) {
    var input = byId(fieldId);
    var errorEl = errorElementFor(fieldId);
    if (errorEl) {
      errorEl.textContent = '';
    }
    if (input) {
      input.removeAttribute('aria-invalid');
    }
  }

  function setFieldError(fieldId, message) {
    var input = byId(fieldId);
    var errorEl = errorElementFor(fieldId);
    if (errorEl) {
      errorEl.textContent = message;
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  function clearAllErrors() {
    ALL_FIELD_IDS.forEach(clearFieldError);
  }

  function clearAllInputs() {
    ALL_FIELD_IDS.forEach(function (id) {
      var input = byId(id);
      if (input) {
        input.value = '';
      }
    });
  }

  function hideResult() {
    var resultEl = byId('result');
    var contentEl = byId('result-content');
    var valueEl = byId('bmi-value');
    var categoryEl = byId('bmi-category');

    if (contentEl) {
      contentEl.hidden = true;
    }
    if (valueEl) {
      valueEl.textContent = '';
    }
    if (categoryEl) {
      categoryEl.textContent = '';
    }
    if (resultEl) {
      resultEl.removeAttribute('data-category');
    }
  }

  function showResult(rounded, category) {
    var resultEl = byId('result');
    var contentEl = byId('result-content');
    var valueEl = byId('bmi-value');
    var categoryEl = byId('bmi-category');
    var key = categoryKey(category);

    if (valueEl) {
      valueEl.textContent = rounded.toFixed(1);
    }
    if (categoryEl) {
      categoryEl.textContent = category;
    }
    if (resultEl) {
      if (key) {
        resultEl.setAttribute('data-category', key);
      } else {
        resultEl.removeAttribute('data-category');
      }
    }
    if (contentEl) {
      contentEl.hidden = false;
    }
  }

  function isMetricMode() {
    var metricRadio = byId('unit-metric');
    // Default to metric if the radio is missing for some reason.
    return metricRadio ? metricRadio.checked : true;
  }

  function inputValue(id) {
    var input = byId(id);
    return input ? input.value : '';
  }

  function applyUnitVisibility() {
    var metric = isMetricMode();
    var metricFields = byId('metric-fields');
    var imperialFields = byId('imperial-fields');
    if (metricFields) {
      metricFields.hidden = !metric;
    }
    if (imperialFields) {
      imperialFields.hidden = metric;
    }
  }

  function handleUnitChange() {
    applyUnitVisibility();
    clearAllInputs();
    clearAllErrors();
    hideResult();
  }

  function handleSubmit(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    var metric = isMetricMode();
    var fieldIds = metric ? METRIC_FIELD_IDS : IMPERIAL_FIELD_IDS;
    var result = metric
      ? validateMetric({
          heightCm: inputValue('height-cm'),
          weightKg: inputValue('weight-kg')
        })
      : validateImperial({
          feet: inputValue('height-ft'),
          inches: inputValue('height-in'),
          pounds: inputValue('weight-lb')
        });

    if (!result.valid) {
      hideResult();
      var firstInvalid = null;
      fieldIds.forEach(function (id) {
        if (Object.prototype.hasOwnProperty.call(result.errors, id)) {
          setFieldError(id, result.errors[id]);
          if (!firstInvalid) {
            firstInvalid = byId(id);
          }
        } else {
          clearFieldError(id);
        }
      });
      if (firstInvalid && typeof firstInvalid.focus === 'function') {
        firstInvalid.focus();
      }
      return;
    }

    clearAllErrors();

    var values = result.values;
    var bmi = metric
      ? calculateBmiMetric(values.heightCm, values.weightKg)
      : calculateBmiImperial(values.feet, values.inches, values.pounds);
    var rounded = roundBmi(bmi);
    var category = getBmiCategory(rounded);

    showResult(rounded, category);
  }

  function init() {
    var form = byId('bmi-form');
    if (!form) {
      return;
    }

    var metricRadio = byId('unit-metric');
    var imperialRadio = byId('unit-imperial');

    if (metricRadio) {
      metricRadio.addEventListener('change', handleUnitChange);
    }
    if (imperialRadio) {
      imperialRadio.addEventListener('change', handleUnitChange);
    }

    form.addEventListener('submit', handleSubmit);

    // Sync visibility with the current radio state (e.g. after back/forward
    // navigation restores form state) and start with a clean result area.
    applyUnitVisibility();
    hideResult();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

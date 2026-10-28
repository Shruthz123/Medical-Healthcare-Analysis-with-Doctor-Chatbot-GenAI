/*
 * Dependency-free verification of the pure BMI functions in app.js
 * against the specification's acceptance examples.
 *
 * Run from the app folder:  node tests/bmi.test.js
 */
'use strict';

const assert = require('assert').strict;
const path = require('path');
const BMI = require(path.join(__dirname, '..', 'app.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('ok - ' + name);
  } catch (err) {
    failed += 1;
    console.error('not ok - ' + name);
    console.error('    ' + (err && err.message ? err.message : String(err)));
  }
}

/* ---------- Acceptance examples ---------- */

test('170 cm, 65 kg -> 22.5 Normal weight', function () {
  const v = BMI.validateMetric({ heightCm: '170', weightKg: '65' });
  assert.equal(v.valid, true);
  const r = BMI.computeResult(v.heightCm, v.weightKg);
  assert.equal(r.displayBmi, '22.5');
  assert.equal(r.categoryName, 'Normal weight');
});

test('5 ft 9 in, 150 lb -> 22.2 Normal weight', function () {
  const v = BMI.validateImperial({ feet: '5', inches: '9', pounds: '150' });
  assert.equal(v.valid, true);
  const r = BMI.computeResult(v.heightCm, v.weightKg);
  assert.equal(r.displayBmi, '22.2');
  assert.equal(r.categoryName, 'Normal weight');
});

test('180 cm, 81 kg -> 25.0 Overweight (boundary)', function () {
  const r = BMI.computeResult(180, 81);
  assert.equal(r.displayBmi, '25.0');
  assert.equal(r.categoryName, 'Overweight');
});

test('BMI computing to 18.50 -> Normal weight', function () {
  assert.equal(BMI.categorize(BMI.roundHalfUp(18.5, 1)), 'normal');
  const r = BMI.computeResult(200, 74); // 74 / 2.0^2 = 18.5
  assert.equal(r.displayBmi, '18.5');
  assert.equal(r.categoryName, 'Normal weight');
});

test('BMI computing to 29.96 displays 30.0 -> Obese', function () {
  assert.equal(BMI.roundHalfUp(29.96, 1), 30);
  assert.equal(BMI.categorize(BMI.roundHalfUp(29.96, 1)), 'obese');
  const r = BMI.computeResult(100, 29.96); // 29.96 / 1.0^2
  assert.equal(r.displayBmi, '30.0');
  assert.equal(r.categoryName, 'Obese');
});

test('300 cm -> height error, no result', function () {
  const v = BMI.validateMetric({ heightCm: '300', weightKg: '70' });
  assert.equal(v.valid, false);
  assert.ok(v.errors.heightCm);
  assert.equal(v.errors.weightKg, undefined);
  assert.equal(v.heightCm, null);
  assert.equal(v.weightKg, null);
});

test('Empty weight -> weight error, no result', function () {
  const v = BMI.validateMetric({ heightCm: '170', weightKg: '' });
  assert.equal(v.valid, false);
  assert.ok(v.errors.weightKg);
  assert.equal(v.errors.heightCm, undefined);
  assert.equal(v.weightKg, null);
});

/* ---------- Rounding and categorisation ---------- */

test('roundHalfUp rounds half up at one decimal', function () {
  assert.equal(BMI.roundHalfUp(24.95, 1), 25);
  assert.equal(BMI.roundHalfUp(24.94, 1), 24.9);
  assert.equal(BMI.roundHalfUp(18.45, 1), 18.5);
  assert.equal(BMI.roundHalfUp(18.449, 1), 18.4);
  assert.equal(BMI.roundHalfUp(22.25, 1), 22.3);
  assert.equal(BMI.roundHalfUp(1.005, 2), 1.01);
  assert.equal(BMI.roundHalfUp(24.999999999999996, 1), 25);
});

test('categorize thresholds on displayed values', function () {
  assert.equal(BMI.categorize(18.4), 'underweight');
  assert.equal(BMI.categorize(18.5), 'normal');
  assert.equal(BMI.categorize(24.9), 'normal');
  assert.equal(BMI.categorize(25.0), 'overweight');
  assert.equal(BMI.categorize(29.9), 'overweight');
  assert.equal(BMI.categorize(30.0), 'obese');
});

test('formatBmi always shows one decimal', function () {
  assert.equal(BMI.formatBmi(25), '25.0');
  assert.equal(BMI.formatBmi(22.5), '22.5');
});

test('Advice for non-normal categories recommends a healthcare professional', function () {
  ['underweight', 'overweight', 'obese'].forEach(function (key) {
    assert.match(BMI.CATEGORIES[key].advice, /healthcare professional/i);
  });
});

/* ---------- Conversion ---------- */

test('Exact conversion factors', function () {
  assert.equal(BMI.CM_PER_INCH, 2.54);
  assert.equal(BMI.KG_PER_POUND, 0.45359237);
  assert.equal(BMI.feetInchesToCm(0, 1), 2.54);
  assert.equal(BMI.poundsToKg(1), 0.45359237);
});

/* ---------- Validation details ---------- */

test('Non-numeric inputs are rejected', function () {
  ['abc', '12abc', '1e2', 'Infinity', '1,5', '.'].forEach(function (raw) {
    const v = BMI.validateMetric({ heightCm: raw, weightKg: '70' });
    assert.equal(v.valid, false, 'expected "' + raw + '" to be invalid');
    assert.equal(v.errors.heightCm, BMI.MESSAGES.heightCm.invalid);
  });
});

test('Metric range limits are inclusive', function () {
  assert.equal(BMI.validateMetric({ heightCm: '100', weightKg: '20' }).valid, true);
  assert.equal(BMI.validateMetric({ heightCm: '250', weightKg: '300' }).valid, true);
  assert.equal(BMI.validateMetric({ heightCm: '99.9', weightKg: '70' }).valid, false);
  assert.equal(BMI.validateMetric({ heightCm: '170', weightKg: '300.1' }).valid, false);
});

test('Empty inches counts as 0', function () {
  const v = BMI.validateImperial({ feet: '5', inches: '', pounds: '150' });
  assert.equal(v.valid, true);
  assert.ok(Math.abs(v.heightCm - 152.4) < 1e-9);
});

test('Feet must be a whole number from 3 to 8', function () {
  assert.ok(BMI.validateImperial({ feet: '5.5', inches: '0', pounds: '150' }).errors.feet);
  assert.ok(BMI.validateImperial({ feet: '2', inches: '0', pounds: '150' }).errors.feet);
  assert.ok(BMI.validateImperial({ feet: '9', inches: '0', pounds: '150' }).errors.feet);
  assert.ok(BMI.validateImperial({ feet: '', inches: '0', pounds: '150' }).errors.feet);
});

test('Inches must be 0 to 11.9', function () {
  assert.ok(BMI.validateImperial({ feet: '5', inches: '12', pounds: '150' }).errors.inches);
  assert.ok(BMI.validateImperial({ feet: '5', inches: '-1', pounds: '150' }).errors.inches);
  assert.equal(BMI.validateImperial({ feet: '5', inches: '11.9', pounds: '150' }).valid, true);
});

test('Imperial total height must convert to 100-250 cm', function () {
  const low = BMI.validateImperial({ feet: '3', inches: '0', pounds: '150' });
  assert.equal(low.valid, false);
  assert.ok(low.errors.heightTotal);

  const high = BMI.validateImperial({ feet: '8', inches: '11', pounds: '150' });
  assert.equal(high.valid, false);
  assert.ok(high.errors.heightTotal);

  const ok = BMI.validateImperial({ feet: '3', inches: '4', pounds: '100' });
  assert.equal(ok.valid, true);
});

test('Pounds must be 44 to 660', function () {
  assert.ok(BMI.validateImperial({ feet: '5', inches: '9', pounds: '43.9' }).errors.pounds);
  assert.ok(BMI.validateImperial({ feet: '5', inches: '9', pounds: '660.1' }).errors.pounds);
  assert.ok(BMI.validateImperial({ feet: '5', inches: '9', pounds: '' }).errors.pounds);
  assert.equal(BMI.validateImperial({ feet: '5', inches: '9', pounds: '44' }).valid, true);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exitCode = failed > 0 ? 1 : 0;
# Tip Calculator

A small, self-contained, single-page tip calculator. You enter a bill amount, a tip percentage and the number of people. The app then shows the tip, the total, and each person's share.

It is plain HTML, CSS and JavaScript. There is no build step, framework, package manager or network access.

## Running the app

There is nothing to install.

1. Download or clone this folder (`generated-apps/tip-calculator/`).
2. Open `index.html` directly in a current browser. You can double-click it or use **File → Open**. Chrome, Firefox, Safari and Edge are supported.

The page works from the `file://` protocol because all assets are linked with plain relative paths.

If you prefer, you can also serve the folder with any static file server. For example:

~~~sh
# optional; not required
python3 -m http.server 8000
# then visit http://localhost:8000/
~~~

## Features

- **Bill amount**: accepts any non-negative number, such as `42`, `42.5` or `42.50`. It is empty on page load.
- **Preset tips**: 10%, 15%, 18% and 20%. 15% is selected on page load, and only one preset can be selected at a time.
- **Custom tip %**: accepts any value from 0 to 100 inclusive.
  - Entering a valid custom value deselects all presets.
  - Clicking a preset clears the custom value.
  - Clearing the custom field falls back to the last selected preset.
- **Number of people**: accepts whole numbers of 1 or more. It defaults to 1.
- **Four live results**: Tip amount, Total (bill + tip), Tip per person and Total per person.
- **Live updates**: results recalculate as you type, so there is no submit button.
- **Reset**: restores the page-load state. The bill is empty, 15% is selected, the custom tip is empty, people is 1, results show `0.00`, and no errors are shown.

## Usage

1. Type the bill amount.
2. Pick a preset tip, or type a custom percentage.
3. Change the number of people if you are splitting the bill.
4. Read the results. They update immediately.
5. Press **Reset** to start again.

### Validation

An empty bill is not an error. All results show `0.00`.

The following inputs are invalid. Each one shows an inline error message under its field, and every result shows `—`:

| Input | Error message |
|---|---|
| Negative bill | Bill cannot be negative. |
| Non-numeric bill | Enter a valid number. |
| Custom tip outside 0–100 | Custom tip must be between 0 and 100. |
| People below 1 or not a whole number | Number of people must be a whole number of at least 1. |

As soon as the input becomes valid again, the error disappears and the results return.

### Rounding

- Results always show exactly two decimal places, rounded half-up.
- Calculations use integer arithmetic on cents rather than floating-point multiplication. Values such as `0.30000000000000004` therefore never appear.
- Each per-person value is rounded independently. Their sum may differ from the total by a few cents.

Examples:

| Bill | Tip | People | Tip | Total | Tip / person | Total / person |
|---|---|---|---|---|---|---|
| 100 | 15% | 2 | 15.00 | 115.00 | 7.50 | 57.50 |
| 10.00 | 15% | 3 | 1.50 | 11.50 | 0.50 | 3.83 |
| 50 | 0% (custom) | 1 | 0.00 | 50.00 | 0.00 | 50.00 |

Amounts are plain numbers with no currency symbol or locale-specific formatting.

## Accessibility

The app targets WCAG 2.1 AA.

- **Labels**: every input has a visible, associated `<label>`. The preset buttons are grouped in a `<fieldset>` with a `<legend>`.
- **Errors**:
  - Each error message is linked to its input with `aria-describedby`.
  - Invalid inputs set `aria-invalid="true"`.
  - Invalid inputs get a thicker red border, so the state is shown by more than colour alone.
- **Preset state**:
  - The selected preset exposes its state through `aria-pressed="true"`.
  - Visually, it has a different background, a bold border and a "✓" marker, so the state is not shown by colour alone.
- **Live results**: the results region uses `aria-live="polite"`, so screen readers announce updates without interrupting the user.
- **Keyboard**:
  - All controls are native buttons and inputs, so they are reachable and operable by keyboard.
  - Every control shows a clearly visible focus outline of at least 2px.
- **Contrast and display modes**:
  - Text contrast is at least 4.5:1.
  - Windows High Contrast (forced colours) mode is supported.
  - Transitions are disabled when the user prefers reduced motion.
- **Layout**: the layout is mobile-first and usable from 320 px wide upward.

## Privacy and security

- **No network**:
  - The app makes no network requests.
  - It uses no external scripts, CDNs, web fonts or analytics, and works fully offline.
- **No storage**:
  - The app uses no cookies, `localStorage` or `sessionStorage`.
  - Your input exists only in page memory and is gone when you close or reload the tab.
- **Safe DOM updates**:
  - User input is never inserted as HTML. All DOM updates use `textContent`.
  - The app does not use `innerHTML`, `eval` or `new Function`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: inputs, preset buttons, results region, error message elements and the Reset button. |
| `styles.css` | Layout, responsive design, selected and focus states, and error styling. Uses system fonts only. |
| `app.js` | Input parsing and validation, calculation, rounding and formatting, preset/custom selection logic, live updates, and reset behaviour. |
| `README.md` | This document. |

## Browser support

The app supports current versions of Chrome, Firefox, Safari and Edge, on desktop and mobile.

## Assumptions and scope

- There is no currency selection, localisation, tax calculation or uneven splitting.
- The custom tip is capped at 100% as a sanity limit.
- There is no backend, deployment or persistence of any kind.

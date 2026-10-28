# BMI Calculator

This is a single static web page that calculates adult Body Mass Index (BMI).

- **Input:** you enter height and weight in metric (cm, kg) or imperial (ft, in, lb) units.
- **Result:** the page shows your BMI rounded to one decimal place, the matching adult category and brief general advice.
- **Privacy:** everything runs in your browser. There is no backend, no build step and there are no third-party resources.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, including the unit selector, inputs, error messages, result live region and disclaimer. It also holds the CSP meta tag. |
| `styles.css` | Responsive layout, focus indicators, error states and category styling. |
| `app.js` | Pure calculation, validation, rounding and categorization functions, followed by a separate DOM layer. |
| `tests/bmi.test.js` | Optional, dependency-free checks of the pure functions against the acceptance examples. |
| `README.md` | This file. |

## Running locally

No installation, dependencies or build step are needed. Choose one of the options below.

### Option 1: Open the file directly

1. Open the `generated-apps/bmi-calculator/` folder.
2. Double-click `index.html`, or drag it into a browser window.

You can also open it from a terminal:

- macOS: `open index.html`
- Linux: `xdg-open index.html`
- Windows (PowerShell or Command Prompt): `start index.html`

Some browsers handle the page's Content-Security-Policy (`'self'`) strictly for `file://` URLs. If the Calculate button does nothing when you open the file this way, use Option 2.

### Option 2: Serve over a local web server (recommended)

This option uses the web server that is built into Python 3. Nothing else needs to be installed.

1. Open a terminal in this folder (`generated-apps/bmi-calculator/`).
2. Start the server:

   ```sh
   python3 -m http.server 8000
   ```

   On Windows, if `python3` is not recognised, use one of these instead:

   ```sh
   py -m http.server 8000
   python -m http.server 8000
   ```

3. Open **http://localhost:8000/** in your browser. The page loads from `index.html`.
4. To stop the server, press `Ctrl+C` in the terminal.

If port 8000 is already in use, pick another port, for example `python3 -m http.server 8080`, and open http://localhost:8080/ instead.

The server only provides the static files. All calculations still happen in your browser, and nothing you type is sent to the server.

Any other static file server also works, provided it serves this folder as the site root.

## Category thresholds

The page uses the standard four-category adult BMI classification:

| Displayed BMI | Category |
|---|---|
| Below 18.5 (< 18.5) | Underweight |
| 18.5 to 24.9 | Normal weight |
| 25.0 to 29.9 | Overweight |
| 30.0 and above (≥ 30.0) | Obese |

### How rounding affects the category

1. BMI is calculated as weight (kg) ÷ height (m)².
2. The result is rounded **half-up to one decimal place**. This rounded value is the one shown on the page.
3. The category is chosen from that **rounded, displayed value**, not from the unrounded result.

Because of this, the number you see and the category always match. For example:

- A BMI that computes to 18.50 displays as **18.5** and is classed as **Normal weight**.
- A BMI that computes to 24.95 displays as **25.0** and is classed as **Overweight**.
- A BMI that computes to 29.96 displays as **30.0** and is classed as **Obese**.

### Imperial conversion

Imperial values are converted to metric before the calculation, using these exact factors:

- 1 inch = 2.54 cm
- 1 pound = 0.45359237 kg

## Input ranges

| Field | Allowed range |
|---|---|
| Height (cm) | 100–250 |
| Weight (kg) | 20–300 |
| Feet | 3–8, whole number |
| Inches | 0–11.9 (empty counts as 0) |
| Imperial total height | Must convert to 100–250 cm |
| Weight (lb) | 44–660 |

A field that is empty, not a number or out of range shows an inline error. No result is shown until every field is valid.

## Optional: verify the calculation logic

The pure functions in `app.js` can be checked without a browser, using [Node.js](https://nodejs.org/) (any current LTS version). There are no packages to install.

From this folder, run:

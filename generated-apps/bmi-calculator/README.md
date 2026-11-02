# BMI Calculator

A self-contained, single-page web app that calculates an adult's **Body Mass Index (BMI)** from height and weight. It then shows the value, rounded to one decimal place, and the matching WHO adult weight category.

The app is plain HTML, CSS and JavaScript. It has no dependencies, no build step, no network requests and no data storage.

> **For adults 18+ only. This is not medical advice.**

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and all styles, in a single `<style>` block. It loads `app.js` with `defer`. |
| `app.js` | All behaviour: unit toggling, validation, BMI calculation, category lookup, and rendering of results and errors. The core logic is written as pure functions. |
| `README.md` | This document. |

---

## How to run

### Option 1: Open the file directly (no setup)

1. Download or clone this folder (`generated-apps/bmi-calculator/`).
2. Double-click `index.html`, or open it with **File → Open** in your browser.

The app works from the file system (`file://`) because it uses no modules, fetches or external resources.

### Option 2: Serve with any static web server

From inside `generated-apps/bmi-calculator/`, run any static server. For example:

```bash
# Python 3
python3 -m http.server 8000

# Node.js (if you have npx available)
npx serve .

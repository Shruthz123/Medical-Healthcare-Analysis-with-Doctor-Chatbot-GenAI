# Clinic Appointment Booking

A single-page web app for booking a clinic appointment. You enter a name, phone number, date and time.
Appointments are saved in your browser's `localStorage`, so they are still there after you reload the page.

There are no dependencies, no build step and no external resources. The app is plain HTML, CSS and JavaScript.

> **Privacy:** Appointments are stored only on this device and browser.
> No data is sent over the network. Anyone using the same browser profile can see the stored appointments.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure: header, privacy notice, booking form, message regions, appointment list |
| `styles.css` | Responsive, accessible styling (320px to desktop, WCAG AA contrast, visible focus) |
| `app.js` | Validation, `localStorage` read/write, list rendering, cancellation |
| `README.md` | This file |

## Running the app

### Option 1: Open the file directly

1. Download or copy the `clinic-appointment-booking` folder.
2. Double-click `index.html`, or open it with **File → Open** in Chrome, Firefox, Safari or Edge.

Browsers handle `localStorage` for `file://` pages in slightly different ways. If appointments do not persist in your browser when the file is opened directly, use Option 2.

### Option 2: Serve as static files

Any static file server works. Run one of these commands from inside the `clinic-appointment-booking` folder:

**Python 3 (macOS / Linux):**

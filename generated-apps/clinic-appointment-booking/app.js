/*
 * Clinic Appointment Booking
 * - Validates the booking form
 * - Reads/writes appointments in localStorage (key: "clinicAppointments")
 * - Renders the sorted appointment list
 * - Handles cancellation with confirmation
 *
 * Security: all user-provided values are rendered via textContent / text nodes.
 * No innerHTML with user data, no eval, no inline event handlers.
 * Privacy: no network requests are made.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var STORAGE_KEY = 'clinicAppointments';
  var STORAGE_TEST_KEY = '__clinicAppointments_storage_test__';

  var NAME_MAX_LENGTH = 100;
  var PHONE_MIN_DIGITS = 7;
  var PHONE_MAX_DIGITS = 15;
  var PHONE_ALLOWED_PATTERN = /^[0-9+\-() ]+$/;

  var DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  var TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
  var TIME_INPUT_PATTERN = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/;

  var FIELDS = ['name', 'phone', 'date', 'time'];
  var FIELD_LABELS = {
    name: 'Name',
    phone: 'Phone',
    date: 'Date',
    time: 'Time'
  };

  var DUPLICATE_SLOT_MESSAGE = 'This time slot is already booked';
  var STORAGE_UNAVAILABLE_WARNING =
    'Browser storage is unavailable, so appointments cannot be saved. ' +
    'Check that site data is allowed for this page, or try a different browser mode.';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var storage = null;
  var els = {
    inputs: {},
    errors: {}
  };
  var messageTimers = {};

  // ---------------------------------------------------------------------------
  // Date / time helpers (all in the user's local time zone)
  // ---------------------------------------------------------------------------

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function getTodayString(now) {
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function getCurrentTimeString(now) {
    return pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  }

  function isRealDate(value) {
    var match = DATE_PATTERN.exec(value);
    if (!match) {
      return false;
    }
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }
    var date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Normalises a time input value to HH:MM (24-hour).
   * Some browsers may include seconds (HH:MM:SS); those are dropped.
   */
  function normalizeTime(value) {
    var trimmed = value.trim();
    var match = TIME_INPUT_PATTERN.exec(trimmed);
    if (!match) {
      return trimmed;
    }
    return match[1] + ':' + match[2];
  }

  function formatDateForDisplay(dateString) {
    var match = DATE_PATTERN.exec(dateString);
    if (!match) {
      return dateString;
    }
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    try {
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  function formatTimeForDisplay(timeString) {
    var match = TIME_PATTERN.exec(timeString);
    if (!match) {
      return timeString;
    }
    // A fixed reference date avoids daylight-saving gaps altering the displayed time.
    var date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
    try {
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return timeString;
    }
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  /**
   * Returns a working localStorage object, or null if storage is unavailable
   * (e.g. disabled, blocked by privacy settings, or throws on access).
   */
  function detectStorage() {
    try {
      var candidate = window.localStorage;
      if (!candidate) {
        return null;
      }
      candidate.setItem(STORAGE_TEST_KEY, '1');
      candidate.removeItem(STORAGE_TEST_KEY);
      return candidate;
    } catch (e) {
      return null;
    }
  }

  function isValidRecord(record) {
    return (
      record !== null &&
      typeof record === 'object' &&
      !Array.isArray(record) &&
      typeof record.id === 'string' &&
      record.id.length > 0 &&
      typeof record.name === 'string' &&
      typeof record.phone === 'string' &&
      typeof record.date === 'string' &&
      DATE_PATTERN.test(record.date) &&
      typeof record.time === 'string' &&
      TIME_PATTERN.test(record.time)
    );
  }

  /**
   * Reads appointments from localStorage. Never throws.
   * Missing, invalid JSON, non-array data, or malformed records yield
   * an empty list (or the list without the malformed records).
   */
  function readAppointments() {
    if (!storage) {
      return [];
    }

    var raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return [];
    }

    if (raw === null || raw === '') {
      return [];
    }

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidRecord).map(function (record) {
      return {
        id: record.id,
        name: record.name,
        phone: record.phone,
        date: record.date,
        time: record.time,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : ''
      };
    });
  }

  /**
   * Writes appointments to localStorage. Returns true on success.
   */
  function writeAppointments(appointments) {
    if (!storage) {
      return false;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(appointments));
      return true;
    } catch (e) {
      return false;
    }
  }

  function sortAppointments(appointments) {
    return appointments.slice().sort(function (a, b) {
      if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1;
      }
      if (a.time !== b.time) {
        return a.time < b.time ? -1 : 1;
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? -1 : 1;
      }
      return 0;
    });
  }

  function generateCandidateId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) {
      // Fall through to the fallback below.
    }

    var randomPart = '';
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var values = new Uint32Array(2);
        window.crypto.getRandomValues(values);
        randomPart = values[0].toString(36) + values[1].toString(36);
      }
    } catch (e) {
      randomPart = '';
    }
    if (!randomPart) {
      randomPart = Math.random().toString(36).slice(2, 12);
    }
    return 'apt-' + Date.now().toString(36) + '-' + randomPart;
  }

  function generateUniqueId(existing) {
    var id;
    var isTaken = function (appointment) {
      return appointment.id === id;
    };
    do {
      id = generateCandidateId();
    } while (existing.some(isTaken));
    return id;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function getFormValues() {
    return {
      name: els.inputs.name.value.trim(),
      phone: els.inputs.phone.value.trim(),
      date: els.inputs.date.value.trim(),
      time: normalizeTime(els.inputs.time.value)
    };
  }

  function countCharacters(text) {
    return Array.from(text).length;
  }

  function countDigits(text) {
    var digits = text.match(/\d/g);
    return digits ? digits.length : 0;
  }

  /**
   * Validates form values. Returns an object mapping field names to
   * error messages; an empty object means the values are valid.
   */
  function validate(values, existingAppointments, now) {
    var errors = {};
    var today = getTodayString(now);

    // Name
    if (values.name === '') {
      errors.name = 'Please enter your name.';
    } else if (countCharacters(values.name) > NAME_MAX_LENGTH) {
      errors.name = 'Name must be ' + NAME_MAX_LENGTH + ' characters or fewer.';
    }

    // Phone
    if (values.phone === '') {
      errors.phone = 'Please enter your phone number.';
    } else if (!PHONE_ALLOWED_PATTERN.test(values.phone)) {
      errors.phone = 'Phone number may contain only digits, spaces, +, -, ( and ).';
    } else {
      var digitCount = countDigits(values.phone);
      if (digitCount < PHONE_MIN_DIGITS || digitCount > PHONE_MAX_DIGITS) {
        errors.phone =
          'Phone number must contain between ' + PHONE_MIN_DIGITS +
          ' and ' + PHONE_MAX_DIGITS + ' digits.';
      }
    }

    // Date
    var dateIsValid = false;
    if (values.date === '') {
      errors.date = 'Please choose a date.';
    } else if (!isRealDate(values.date)) {
      errors.date = 'Please enter a valid date.';
    } else if (values.date < today) {
      errors.date = 'Date cannot be earlier than today.';
    } else {
      dateIsValid = true;
    }

    // Time
    var timeIsValid = false;
    if (values.time === '') {
      errors.time = 'Please choose a time.';
    } else if (!TIME_PATTERN.test(values.time)) {
      errors.time = 'Please enter a valid time.';
    } else if (dateIsValid && values.date === today && values.time < getCurrentTimeString(now)) {
      errors.time = 'Time cannot be earlier than the current time.';
    } else {
      timeIsValid = true;
    }

    // Duplicate slot (only when date and time are otherwise valid)
    if (dateIsValid && timeIsValid) {
      var isDuplicate = existingAppointments.some(function (appointment) {
        return appointment.date === values.date && appointment.time === values.time;
      });
      if (isDuplicate) {
        errors.time = DUPLICATE_SLOT_MESSAGE;
      }
    }

    return errors;
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  function setFieldError(field, message) {
    var input = els.inputs[field];
    var errorEl = els.errors[field];
    if (!input || !errorEl) {
      return;
    }
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      errorEl.textContent = '';
    }
  }

  function clearAllFieldErrors() {
    FIELDS.forEach(function (field) {
      setFieldError(field, '');
    });
  }

  /**
   * Shows a message in a live region. The region is cleared first and filled
   * after a short delay so that screen readers announce repeated messages.
   */
  function showMessage(regionEl, text, type) {
    if (!regionEl) {
      return;
    }
    var key = regionEl.id;
    if (messageTimers[key]) {
      window.clearTimeout(messageTimers[key]);
      messageTimers[key] = null;
    }

    regionEl.textContent = '';
    regionEl.className = 'message';

    if (!text) {
      return;
    }

    messageTimers[key] = window.setTimeout(function () {
      regionEl.className = 'message message--' + (type === 'error' ? 'error' : 'success');
      regionEl.textContent = text;
      messageTimers[key] = null;
    }, 50);
  }

  function clearMessage(regionEl) {
    showMessage(regionEl, '', '');
  }

  function updateDateMin() {
    if (els.inputs.date) {
      els.inputs.date.min = getTodayString(new Date());
    }
  }

  function showStorageWarning() {
    if (!els.storageWarning) {
      return;
    }
    els.storageWarning.textContent = STORAGE_UNAVAILABLE_WARNING;
    els.storageWarning.hidden = false;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function createMetaRow(list, label, valueNode) {
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.appendChild(valueNode);
    list.appendChild(dt);
    list.appendChild(dd);
  }

  function createTimeElement(datetimeValue, displayText) {
    var timeEl = document.createElement('time');
    timeEl.setAttribute('datetime', datetimeValue);
    timeEl.textContent = displayText;
    return timeEl;
  }

  function createAppointmentItem(appointment) {
    var displayDate = formatDateForDisplay(appointment.date);
    var displayTime = formatTimeForDisplay(appointment.time);

    var item = document.createElement('li');
    item.className = 'appointment';

    var details = document.createElement('div');
    details.className = 'appointment__details';

    var nameEl = document.createElement('p');
    nameEl.className = 'appointment__name';
    nameEl.textContent = appointment.name;
    details.appendChild(nameEl);

    var meta = document.createElement('dl');
    meta.className = 'appointment__meta';
    createMetaRow(meta, 'Date', createTimeElement(appointment.date, displayDate));
    createMetaRow(
      meta,
      'Time',
      createTimeElement(appointment.date + 'T' + appointment.time, displayTime)
    );
    createMetaRow(meta, 'Phone', document.createTextNode(appointment.phone));
    details.appendChild(meta);

    var actions = document.createElement('div');
    actions.className = 'appointment__actions';

    var cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn--danger';
    cancelButton.setAttribute('data-id', appointment.id);
    cancelButton.appendChild(document.createTextNode('Cancel'));

    var srText = document.createElement('span');
    srText.className = 'visually-hidden';
    srText.textContent =
      ' appointment for ' + appointment.name + ' on ' + displayDate + ' at ' + displayTime;
    cancelButton.appendChild(srText);

    actions.appendChild(cancelButton);

    item.appendChild(details);
    item.appendChild(actions);
    return item;
  }

  /**
   * Re-renders the appointment list from storage. Returns the sorted list.
   */
  function renderAppointments() {
    var appointments = sortAppointments(readAppointments());
    var listEl = els.list;

    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    if (appointments.length === 0) {
      els.emptyMessage.hidden = false;
      listEl.hidden = true;
      return appointments;
    }

    var fragment = document.createDocumentFragment();
    appointments.forEach(function (appointment) {
      fragment.appendChild(createAppointmentItem(appointment));
    });
    listEl.appendChild(fragment);

    els.emptyMessage.hidden = true;
    listEl.hidden = false;
    return appointments;
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleSubmit(event) {
    event.preventDefault();

    clearAllFieldErrors();
    clearMessage(els.formMessage);
    clearMessage(els.listMessage);
    updateDateMin();

    var values = getFormValues();
    var existing = readAppointments();
    var errors = validate(values, existing, new Date());
    var invalidFields = FIELDS.filter(function (field) {
      return Boolean(errors[field]);
    });

    if (invalidFields.length > 0) {
      invalidFields.forEach(function (field) {
        setFieldError(field, errors[field]);
      });

      var summaryParts = invalidFields.map(function (field) {
        var text = errors[field];
        if (!/[.!?]$/.test(text)) {
          text += '.';
        }
        return FIELD_LABELS[field] + ': ' + text;
      });
      var heading = invalidFields.length === 1
        ? 'Appointment not booked. Please fix 1 error.'
        : 'Appointment not booked. Please fix ' + invalidFields.length + ' errors.';
      showMessage(els.formMessage, heading + ' ' + summaryParts.join(' '), 'error');

      els.inputs[invalidFields[0]].focus();
      return;
    }

    if (!storage) {
      showMessage(
        els.formMessage,
        'Appointment not saved. Browser storage is unavailable on this device, so appointments cannot be saved.',
        'error'
      );
      return;
    }

    var appointment = {
      id: generateUniqueId(existing),
      name: values.name,
      phone: values.phone,
      date: values.date,
      time: values.time,
      createdAt: new Date().toISOString()
    };

    var updated = existing.concat([appointment]);
    if (!writeAppointments(updated)) {
      showMessage(
        els.formMessage,
        'Appointment not saved. Browser storage may be full or unavailable.',
        'error'
      );
      return;
    }

    els.form.reset();
    clearAllFieldErrors();
    updateDateMin();
    renderAppointments();

    showMessage(
      els.formMessage,
      'Appointment booked for ' + appointment.name + ' on ' +
        formatDateForDisplay(appointment.date) + ' at ' +
        formatTimeForDisplay(appointment.time) + '.',
      'success'
    );
  }

  function focusAfterRemoval(removedIndex) {
    var buttons = els.list.querySelectorAll('button[data-id]');
    if (buttons.length > 0) {
      var nextIndex = Math.min(removedIndex, buttons.length - 1);
      buttons[nextIndex].focus();
    } else {
      els.listHeading.focus();
    }
  }

  function handleListClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }
    var button = target.closest('button[data-id]');
    if (!button || !els.list.contains(button)) {
      return;
    }

    var id = button.getAttribute('data-id');
    var appointments = sortAppointments(readAppointments());
    var index = -1;
    for (var i = 0; i < appointments.length; i += 1) {
      if (appointments[i].id === id) {
        index = i;
        break;
      }
    }

    clearMessage(els.formMessage);

    if (index === -1) {
      renderAppointments();
      showMessage(els.listMessage, 'That appointment no longer exists.', 'error');
      els.listHeading.focus();
      return;
    }

    var appointment = appointments[index];
    var displayDate = formatDateForDisplay(appointment.date);
    var displayTime = formatTimeForDisplay(appointment.time);

    var confirmed = window.confirm(
      'Cancel the appointment for ' + appointment.name + ' on ' +
        displayDate + ' at ' + displayTime + '?'
    );
    if (!confirmed) {
      return;
    }

    appointments.splice(index, 1);
    if (!writeAppointments(appointments)) {
      showMessage(
        els.listMessage,
        'The appointment could not be cancelled because browser storage is unavailable.',
        'error'
      );
      return;
    }

    renderAppointments();
    showMessage(
      els.listMessage,
      'Appointment for ' + appointment.name + ' on ' + displayDate +
        ' at ' + displayTime + ' was cancelled.',
      'success'
    );
    focusAfterRemoval(index);
  }

  function handleFieldInput(event) {
    var field = event.target && event.target.name;
    if (field && els.inputs[field] && els.inputs[field].getAttribute('aria-invalid') === 'true') {
      setFieldError(field, '');
    }
  }

  function handleStorageEvent(event) {
    // Keep the list in sync if appointments change in another tab.
    if (event.key === STORAGE_KEY || event.key === null) {
      renderAppointments();
    }
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  function init() {
    els.form = document.getElementById('booking-form');
    els.formMessage = document.getElementById('form-message');
    els.listMessage = document.getElementById('list-message');
    els.list = document.getElementById('appointment-list');
    els.emptyMessage = document.getElementById('empty-message');
    els.listHeading = document.getElementById('list-heading');
    els.storageWarning = document.getElementById('storage-warning');

    FIELDS.forEach(function (field) {
      els.inputs[field] = document.getElementById(field);
      els.errors[field] = document.getElementById(field + '-error');
    });

    if (!els.form || !els.list || !els.emptyMessage) {
      return;
    }

    storage = detectStorage();
    if (!storage) {
      showStorageWarning();
    }

    updateDateMin();
    renderAppointments();

    els.form.addEventListener('submit', handleSubmit);
    els.list.addEventListener('click', handleListClick);

    FIELDS.forEach(function (field) {
      var input = els.inputs[field];
      if (input) {
        input.addEventListener('input', handleFieldInput);
        input.addEventListener('change', handleFieldInput);
      }
    });

    if (els.inputs.date) {
      els.inputs.date.addEventListener('focus', updateDateMin);
    }

    window.addEventListener('storage', handleStorageEvent);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
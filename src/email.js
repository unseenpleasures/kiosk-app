// email.js — Email capture module for ID Card Factory Kiosk PWA
// Provides email sign-up screen with GDPR consent, validation, IndexedDB storage,
// and a 5-second confirmation countdown with early-dismiss.
// Phase 5: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

// ============================================================
// Module-scoped state
// ============================================================

var _emailCountdown = null;

// ============================================================
// renderEmail — main entry point called by router for #/email
// Clears #app and renders the email sign-up screen.
// ============================================================

function renderEmail() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen screen-email';
  screen.id = 'screen-email';

  var card = document.createElement('div');
  card.className = 'email-form-card';

  renderEmailForm(card);

  screen.appendChild(card);
  app.appendChild(screen);
}

// ============================================================
// renderEmailForm — builds form elements inside the card
// ============================================================

function renderEmailForm(card) {
  // Heading
  var heading = document.createElement('h2');
  heading.className = 'email-screen-heading';
  heading.textContent = 'Sign Up for Updates';
  card.appendChild(heading);

  // Subheading
  var subheading = document.createElement('p');
  subheading.className = 'email-screen-subheading';
  subheading.textContent = 'Get early access to new designs and exclusive event discounts.';
  card.appendChild(subheading);

  // Email input
  var emailInput = document.createElement('input');
  emailInput.className = 'email-input';
  emailInput.type = 'email';
  emailInput.setAttribute('inputmode', 'email');
  emailInput.setAttribute('autocorrect', 'off');
  emailInput.setAttribute('autocapitalize', 'off');
  emailInput.setAttribute('spellcheck', 'false');
  emailInput.placeholder = 'your@email.com';
  emailInput.id = 'email-input';
  card.appendChild(emailInput);

  // Validation error
  var errorEl = document.createElement('p');
  errorEl.className = 'email-validation-error';
  errorEl.id = 'email-error';
  errorEl.textContent = '';
  errorEl.style.display = 'none';
  card.appendChild(errorEl);

  // GDPR consent label (wraps checkbox + span)
  var consentLabel = document.createElement('label');
  consentLabel.className = 'email-consent-group';

  var checkbox = document.createElement('input');
  checkbox.className = 'email-consent-checkbox';
  checkbox.type = 'checkbox';
  checkbox.id = 'email-consent';
  // Do NOT set checked — unchecked by default (GDPR requirement)

  var consentSpan = document.createElement('span');
  consentSpan.textContent = 'I agree to receive email updates from The ID Card Factory.';

  consentLabel.appendChild(checkbox);
  consentLabel.appendChild(consentSpan);
  card.appendChild(consentLabel);

  // Submit button — disabled until checkbox is checked
  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn-primary btn-large email-submit';
  submitBtn.type = 'button';
  submitBtn.textContent = 'Sign me up';
  submitBtn.disabled = true;
  submitBtn.id = 'email-submit';
  card.appendChild(submitBtn);

  // Wire checkbox change: enable/disable submit
  checkbox.addEventListener('change', function() {
    submitBtn.disabled = !checkbox.checked;
  });

  // Wire submit button click
  submitBtn.addEventListener('click', function() {
    validateAndSave(emailInput, checkbox, card);
  });
}

// ============================================================
// validateAndSave — validates email, stores to IndexedDB
// Shows inline error on invalid input; navigates to confirmation on success.
// ============================================================

function validateAndSave(emailInput, checkbox, card) {
  var email = emailInput.value.trim();
  var errorEl = document.getElementById('email-error');
  var submitBtn = document.getElementById('email-submit');

  // Basic validation: non-empty and contains '@'
  if (email.length === 0 || email.indexOf('@') === -1) {
    errorEl.textContent = 'Please enter a valid email address.';
    errorEl.style.display = 'block';
    return;
  }

  // Hide any previous error
  errorEl.style.display = 'none';
  errorEl.textContent = '';

  // Disable submit to prevent double-submit
  submitBtn.disabled = true;

  // Build record per D-12
  var record = {
    email: email,
    eventName: Config.getEventName(),
    eventDate: Config.getEventDate(),
    consentAt: new Date().toISOString()
  };

  dbAdd('emails', record).then(function() {
    showEmailConfirmation(card);
  }).catch(function(err) {
    console.error('Email save failed:', err, record);

    // Show save error below submit button
    var saveError = document.getElementById('email-save-error');
    if (!saveError) {
      saveError = document.createElement('p');
      saveError.className = 'email-save-error';
      saveError.id = 'email-save-error';
      card.appendChild(saveError);
    }
    saveError.textContent = 'Something went wrong saving your details. Please try again.';

    // Re-enable submit so user can retry
    submitBtn.disabled = !checkbox.checked;
  });
}

// ============================================================
// showEmailConfirmation — replaces form with confirmation + countdown
// 5-second countdown then auto-navigates to #/
// Early-dismiss "Back to browsing" button navigates immediately.
// ============================================================

function showEmailConfirmation(card) {
  // Clear form — safe at this point, no user content remains
  card.innerHTML = '';

  // Checkmark icon
  var icon = document.createElement('span');
  icon.className = 'email-confirmation-icon';
  icon.textContent = '\u2713';
  card.appendChild(icon);

  // Heading
  var heading = document.createElement('h2');
  heading.className = 'email-confirmation-heading';
  heading.textContent = "YOU'RE IN!";
  card.appendChild(heading);

  // Body copy
  var body = document.createElement('p');
  body.className = 'email-confirmation-body';
  body.textContent = "Thanks for signing up. We\u2019ll let you know about new designs and event exclusives.";
  card.appendChild(body);

  // Signup count (async, nice-to-have — hidden until populated)
  var countEl = document.createElement('p');
  countEl.className = 'email-confirmation-count';
  countEl.id = 'email-count';
  countEl.style.display = 'none';
  card.appendChild(countEl);

  // Countdown text
  var countdownEl = document.createElement('p');
  countdownEl.className = 'email-countdown';
  countdownEl.id = 'email-countdown';
  countdownEl.textContent = 'Returning to catalogue in 5\u2026';
  card.appendChild(countdownEl);

  // Early-dismiss button
  var dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn-secondary btn-large';
  dismissBtn.type = 'button';
  dismissBtn.textContent = 'Back to browsing';
  card.appendChild(dismissBtn);

  // Async signup count — filter by current event name
  dbGetAll('emails').then(function(all) {
    var eventName = Config.getEventName();
    var filtered = all.filter(function(r) {
      return r.eventName === eventName;
    });
    countEl.textContent = "You're #" + filtered.length + " to sign up at this event!";
    countEl.style.display = 'block';
  }).catch(function() {
    // Silently ignore — count is a nice-to-have
  });

  // 5-second countdown
  var remaining = 5;
  _emailCountdown = setInterval(function() {
    remaining--;
    countdownEl.textContent = 'Returning to catalogue in ' + remaining + '\u2026';
    if (remaining <= 0) {
      clearInterval(_emailCountdown);
      _emailCountdown = null;
      window.location.hash = '#/';
    }
  }, 1000);

  // Stale interval cleanup — fires if user navigates away via chrome-home or
  // any other mechanism before countdown completes (RESEARCH.md Pitfall 1)
  function cleanupCountdown() {
    if (_emailCountdown !== null) {
      clearInterval(_emailCountdown);
      _emailCountdown = null;
    }
    window.removeEventListener('hashchange', cleanupCountdown);
  }
  window.addEventListener('hashchange', cleanupCountdown);

  // Early-dismiss click: clear countdown and navigate immediately
  dismissBtn.addEventListener('click', function() {
    clearInterval(_emailCountdown);
    _emailCountdown = null;
    window.location.hash = '#/';
  });
}

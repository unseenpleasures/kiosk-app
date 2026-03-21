// idle.js — Inactivity timer with countdown overlay for ID Card Factory Kiosk PWA
// After Config.getIdleTimeout() seconds of no input, shows a 10-second countdown.
// If not dismissed, navigates to #/ (home). Provides pause/resume API for email/admin screens.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

// ============================================================
// Module-level timer state
// ============================================================

var _idleTimer = null;
var _countdownTimer = null;
var _countdownEl = null;
var _countdownRemaining = 10;
var _active = false;
var _pausedForEmail = false;  // tracks email-screen pause separately from admin pauses

// ============================================================
// resetIdleTimer — clears existing timer and starts a fresh one
// Called on user interaction (touchstart, touchend, pointerdown)
// and on initIdleTimer() to start the initial countdown.
// ============================================================

function resetIdleTimer() {
  if (!_active) {
    return;
  }
  if (_countdownEl) {
    cancelCountdown();
  }
  clearTimeout(_idleTimer);
  var timeout = Config.getIdleTimeout() * 1000;
  _idleTimer = setTimeout(startCountdown, timeout);
}

// ============================================================
// startCountdown — shows the 10-second countdown overlay
// Called when the idle timer fires (no user interaction for Config.getIdleTimeout() seconds)
// ============================================================

function startCountdown() {
  _countdownRemaining = 10;
  _countdownEl = showCountdownOverlay(_countdownRemaining);
  _countdownTimer = setInterval(function() {
    _countdownRemaining -= 1;
    updateCountdownOverlay(_countdownEl, _countdownRemaining);
    if (_countdownRemaining <= 0) {
      cancelCountdown();
      window.location.hash = '#/';
    }
  }, 1000);
}

// ============================================================
// cancelCountdown — stops the countdown and removes the overlay
// Called by cancel button click and when user interacts during countdown
// ============================================================

function cancelCountdown() {
  clearInterval(_countdownTimer);
  _countdownTimer = null;
  if (_countdownEl && _countdownEl.parentNode) {
    _countdownEl.parentNode.removeChild(_countdownEl);
  }
  _countdownEl = null;
}

// ============================================================
// showCountdownOverlay — creates and appends the countdown overlay to body
// Appended to document.body (not #app) so it sits above all chrome elements.
// Returns the overlay element for reference.
// ============================================================

function showCountdownOverlay(seconds) {
  var overlay = document.createElement('div');
  overlay.className = 'idle-overlay';

  var message = document.createElement('p');
  message.className = 'idle-message';
  message.textContent = 'Returning to home in ' + seconds + ' seconds...';
  overlay.appendChild(message);

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'idle-cancel';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', function() {
    cancelCountdown();
    resetIdleTimer();
  });
  overlay.appendChild(cancelBtn);

  document.body.appendChild(overlay);
  return overlay;
}

// ============================================================
// updateCountdownOverlay — updates the countdown message text
// Handles singular/plural: "1 second" vs "N seconds"
// ============================================================

function updateCountdownOverlay(el, seconds) {
  var message = el.querySelector('.idle-message');
  if (message) {
    var unit = seconds === 1 ? 'second' : 'seconds';
    message.textContent = 'Returning to home in ' + seconds + ' ' + unit + '...';
  }
}

// ============================================================
// initIdleTimer — activates the idle timer and wires input listeners
// Called once from app.js boot() after catalogue is confirmed present.
// Uses { passive: true } on all touch/pointer listeners for scroll performance.
// ============================================================

function initIdleTimer() {
  _active = true;
  document.addEventListener('touchstart', resetIdleTimer, { passive: true });
  document.addEventListener('touchend', resetIdleTimer, { passive: true });
  document.addEventListener('pointerdown', resetIdleTimer, { passive: true });
  resetIdleTimer();
  initEmailGracePeriod();  // Phase 4: wire email screen grace period
}

// ============================================================
// initEmailGracePeriod — suppresses idle timer on #/email screen
// 3-minute grace period: timer does not start until user leaves email screen.
// Uses _pausedForEmail boolean to avoid conflicting with admin panel pauses.
// Source: CAT-10, D-15
// ============================================================

function initEmailGracePeriod() {
  window.addEventListener('hashchange', function() {
    var hash = window.location.hash;
    if (hash === '#/email') {
      _pausedForEmail = true;
      pauseIdleTimer();
    } else if (_pausedForEmail) {
      _pausedForEmail = false;
      resumeIdleTimer();
    }
  });
}

// ============================================================
// pauseIdleTimer — suspends timer (e.g. on email form, admin panel)
// Clears any active timer and cancels any in-progress countdown.
// ============================================================

function pauseIdleTimer() {
  _active = false;
  clearTimeout(_idleTimer);
  if (_countdownEl) {
    cancelCountdown();
  }
}

// ============================================================
// resumeIdleTimer — resumes timer after pause (e.g. leaving email form)
// ============================================================

function resumeIdleTimer() {
  _active = true;
  resetIdleTimer();
}

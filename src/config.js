// config.js — localStorage wrapper for ID Card Factory Kiosk PWA
// This is the EXCLUSIVE gateway to localStorage. No other module reads/writes localStorage directly.
// Source: STATE.md architecture constraint, CLAUDE.md security requirements.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

// ============================================================
// Key constants — all prefixed with 'kiosk_' to avoid collisions
// ============================================================

var KEYS = {
  PASSCODE_HASH: 'kiosk_passcode_hash',
  EVENT_NAME:    'kiosk_event_name',
  EVENT_DATE:    'kiosk_event_date',
  IDLE_TIMEOUT:  'kiosk_idle_timeout'   // stored as integer string (seconds)
};

var DEFAULT_IDLE_TIMEOUT = 60;  // seconds

// ============================================================
// Config — typed getter/setter pairs for each config key
// ============================================================

var Config = {

  // Admin passcode hash — null on fresh install (no passcode set yet)
  getPasscodeHash: function() {
    return localStorage.getItem(KEYS.PASSCODE_HASH);
  },
  setPasscodeHash: function(hash) {
    localStorage.setItem(KEYS.PASSCODE_HASH, hash);
  },

  // Event name — e.g. "MCM London May 2026"; empty string if not set
  getEventName: function() {
    return localStorage.getItem(KEYS.EVENT_NAME) || '';
  },
  setEventName: function(name) {
    localStorage.setItem(KEYS.EVENT_NAME, name);
  },

  // Event date — ISO date string e.g. "2026-05-24"; empty string if not set
  getEventDate: function() {
    return localStorage.getItem(KEYS.EVENT_DATE) || '';
  },
  setEventDate: function(date) {
    localStorage.setItem(KEYS.EVENT_DATE, date);
  },

  // Inactivity timeout — integer seconds; defaults to DEFAULT_IDLE_TIMEOUT (60)
  getIdleTimeout: function() {
    var stored = localStorage.getItem(KEYS.IDLE_TIMEOUT);
    return stored ? parseInt(stored, 10) : DEFAULT_IDLE_TIMEOUT;
  },
  setIdleTimeout: function(seconds) {
    localStorage.setItem(KEYS.IDLE_TIMEOUT, String(seconds));
  }

};

// ============================================================
// SHA-256 passcode hashing — uses Web Crypto API (secure context required)
// Note: crypto.subtle is available on HTTPS or localhost (both are secure contexts).
// ============================================================

// hashPasscode — returns Promise<string> (hex digest of the passcode)
// Uses Array.from(Uint8Array).map() pattern — NOT Uint8Array.prototype.toHex()
// which is not available in Safari 16.x
function hashPasscode(passcode) {
  var encoder = new TextEncoder();
  var data = encoder.encode(passcode);
  return window.crypto.subtle.digest('SHA-256', data).then(function(hashBuffer) {
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    var hashHex = hashArray.map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
    return hashHex;
  });
}

// verifyPasscode — returns Promise<boolean>
// Hashes inputPasscode and compares to stored hash.
// Returns false if no passcode has been set (storedHash is null).
function verifyPasscode(inputPasscode) {
  return hashPasscode(inputPasscode).then(function(inputHash) {
    var storedHash = Config.getPasscodeHash();
    return storedHash !== null && inputHash === storedHash;
  });
}

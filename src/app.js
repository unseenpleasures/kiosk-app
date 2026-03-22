// app.js — Boot coordinator for ID Card Factory Kiosk PWA
// Registers service worker, checks catalogue health, renders appropriate screen.

// ============================================================
// 1. Service Worker Registration
// Must run before any other init so SW can cache assets on first visit.
// controllerchange listener handles force-reload when new SW takes control.
// ============================================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newSW = reg.installing;
      newSW.addEventListener('statechange', function() {
        if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    });
  });

  var controllerChanging = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!controllerChanging) {
      controllerChanging = true;
      window.location.reload();
    }
  });
}

// ============================================================
// 2. showSplashScreen
// Renders the branded splash screen into #app.
// Shows: logo, app title, CTA button, QR code corner.
// Entry animation: fade-in via .visible class added on next frame.
// Tapping anywhere on the splash (or the CTA button) navigates to catalogue root.
// ============================================================

function showSplashScreen() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen splash-screen fade-in';

  // Logo
  var logo = document.createElement('img');
  logo.className = 'splash-logo';
  logo.src = './assets/logo.svg';
  logo.alt = 'ID Card Factory';
  screen.appendChild(logo);

  // App name
  var title = document.createElement('h1');
  title.className = 'splash-title';
  title.textContent = 'ID Card Factory';
  screen.appendChild(title);

  // CTA button — stops propagation so it doesn't double-fire with the screen click
  var cta = document.createElement('button');
  cta.className = 'splash-cta';
  cta.textContent = 'Browse our collection \u2192';
  cta.addEventListener('click', function(e) {
    e.stopPropagation();
    window.location.hash = '#/';
  });
  screen.appendChild(cta);

  // QR code corner (bottom-right, per UI-SPEC D-09)
  var qrCorner = document.createElement('div');
  qrCorner.className = 'qr-corner';

  var qrImg = document.createElement('img');
  qrImg.src = './assets/qr-code.png';
  qrImg.alt = 'QR code to theidcardfactory.co.uk';
  qrCorner.appendChild(qrImg);

  var qrLabel = document.createElement('span');
  qrLabel.className = 'qr-corner-label';
  qrLabel.textContent = 'Visit our website';
  qrCorner.appendChild(qrLabel);

  screen.appendChild(qrCorner);

  app.appendChild(screen);

  // Tapping anywhere on the splash navigates to catalogue root (per D-10)
  screen.addEventListener('click', function() {
    window.location.hash = '#/';
  });

  // Trigger fade-in animation — add .visible on next frame so CSS transition fires
  requestAnimationFrame(function() {
    screen.classList.add('visible');
  });
}

// ============================================================
// 3. showSyncRequiredScreen
// Renders a blocking "Sync Required" screen when catalogue data is missing.
// No QR code, no sync button (admin panel built in a later phase).
// ============================================================

function showSyncRequiredScreen() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen';

  // Logo (smaller per UI-SPEC: max-width 240px via .sync-required-logo)
  var logo = document.createElement('img');
  logo.className = 'sync-required-logo';
  logo.src = './assets/logo.svg';
  logo.alt = 'ID Card Factory';
  screen.appendChild(logo);

  // Heading in gold accent
  var heading = document.createElement('h1');
  heading.className = 'sync-required-heading';
  heading.textContent = 'Sync Required';
  screen.appendChild(heading);

  // Body copy
  var body = document.createElement('p');
  body.className = 'sync-required-body';
  body.textContent = 'Catalogue data not found. Please sync before the event.';
  screen.appendChild(body);

  // No QR code on sync-required screen (per UI-SPEC Screen 2)
  // No sync button (per D-11 — admin panel not built yet)

  app.appendChild(screen);
}

// ============================================================
// 4. initAdminTrigger — 7 rapid taps on QR chrome element opens admin
// Tap counter resets after 3 seconds of no taps.
// Source: ADMIN-01, RESEARCH.md Pattern 4
// ============================================================

var _adminTapCount = 0;
var _adminTapTimer = null;

function initAdminTrigger() {
  var qrEl = document.getElementById('chrome-qr');
  if (qrEl) {
    qrEl.addEventListener('click', function() {
      _adminTapCount++;
      clearTimeout(_adminTapTimer);
      if (_adminTapCount >= 7) {
        _adminTapCount = 0;
        window.location.hash = '#/admin';
        return;
      }
      _adminTapTimer = setTimeout(function() { _adminTapCount = 0; }, 3000);
    });
  }
}

// ============================================================
// 5. initHomeButton — wires the global chrome home button click handler
// Sets hash to '#/' and resets in-memory filter/search state via catalogue.js.
// Source: D-21
// ============================================================

function initHomeButton() {
  var homeBtn = document.getElementById('chrome-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', function() {
      window.location.hash = '#/';
      resetCatalogueState();
    });
  }
}

// ============================================================
// 6. initEmailButton — wires the global chrome email button click handler
// Navigates to #/email on tap.
// Source: EMAIL-01, D-21
// ============================================================

function initEmailButton() {
  var emailBtn = document.getElementById('chrome-email');
  if (emailBtn) {
    emailBtn.addEventListener('click', function() {
      window.location.hash = '#/email';
    });
  }
}

// ============================================================
// 6b. initChromeTouchRouter — coordinate-based touch routing for iPad Safari
// iPad Safari standalone mode does not deliver touch/click events to position:fixed
// elements overlapping scroll areas, regardless of z-index, pointer-events, or
// compositing layers. This listener intercepts all touches at the document level
// and manually checks if touch coordinates fall within a chrome button's bounding
// rect. If so, it triggers the button's action directly.
// ============================================================

function initChromeTouchRouter() {
  document.addEventListener('touchstart', function(e) {
    var touch = e.touches[0];
    var x = touch.clientX;
    var y = touch.clientY;

    var homeBtn = document.getElementById('chrome-home');
    if (homeBtn && hitTest(homeBtn, x, y)) {
      e.preventDefault();
      window.location.hash = '#/';
      resetCatalogueState();
      return;
    }

    var emailBtn = document.getElementById('chrome-email');
    if (emailBtn && hitTest(emailBtn, x, y)) {
      e.preventDefault();
      window.location.hash = '#/email';
      return;
    }
  }, { passive: false });
}

function hitTest(el, x, y) {
  var r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// ============================================================
// 7. updateChromeEmailState — adds/removes active-screen class on chrome email button
// Dims the button when already on #/email to give visual feedback.
// Called on every hashchange and once on boot.
// ============================================================

function updateChromeEmailState() {
  var emailBtn = document.getElementById('chrome-email');
  if (emailBtn) {
    if (window.location.hash === '#/email') {
      emailBtn.classList.add('active-screen');
    } else {
      emailBtn.classList.remove('active-screen');
    }
  }
}

// ============================================================
// 8. boot — main entry point
// Opens DB at v2 via db.js, checks catalogue health, renders appropriate screen.
// Wires router, idle timer, and chrome home button if catalogue is present.
// ============================================================

async function boot() {
  // Phase 2: open DB at v2 (creates all stores if needed) before health check
  await openDB();

  // Check catalogue health using db.js (v2 schema, replaces the old inline db check)
  var productCount = await dbCount('products');
  var hasCatalogue = productCount > 0;

  if (!hasCatalogue) {
    showSyncRequiredScreen();
    initAdminTrigger();  // Admin must be reachable to perform first sync
    window.addEventListener('hashchange', handleRoute);  // Handle #/admin trigger
    // If page loaded with #/admin already in URL (e.g. after refresh), dispatch immediately
    if (window.location.hash === '#/admin') {
      handleRoute();
    }
    // Do NOT start idle timer on sync-required screen -- admin needs unrestricted time
    return;
  }

  // Phase 4: warm in-memory product array before rendering any catalogue screen
  await initCatalogue();

  // Show splash screen briefly, then init navigation
  showSplashScreen();

  // Wire up global chrome home button click handler
  initHomeButton();

  // Wire up global chrome email button click handler (Phase 5)
  initEmailButton();

  // Wire up coordinate-based touch routing for iPad Safari standalone mode
  initChromeTouchRouter();

  // Wire up hidden admin trigger (7 taps on QR code)
  initAdminTrigger();

  // Init hash-based router -- dispatches to correct screen stub
  initRouter();

  // Wire active-screen state on chrome email button (Phase 5)
  window.addEventListener('hashchange', updateChromeEmailState);
  updateChromeEmailState();

  // Start inactivity timer (60s default, from Config)
  initIdleTimer();
}

// Run boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// app.js — Boot coordinator for ID Card Factory Kiosk PWA
// Registers service worker, checks catalogue health, renders appropriate screen.

// ============================================================
// 1. Service Worker Registration
// Must run before any other init so SW can cache assets on first visit.
// controllerchange listener handles force-reload when new SW takes control.
// ============================================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
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
// 2. checkCatalogueHealth
// Opens IndexedDB kiosk-db and checks whether the products object store
// exists and contains at least one record.
// Returns Promise<boolean> — true if catalogue data is ready.
// ============================================================

function checkCatalogueHealth() {
  return new Promise(function(resolve) {
    var req = indexedDB.open('kiosk-db', 1);

    req.onupgradeneeded = function() {
      // DB did not exist — fresh install or post-eviction
      resolve(false);
    };

    req.onsuccess = function(event) {
      var db = event.target.result;
      if (!db.objectStoreNames.contains('products')) {
        db.close();
        resolve(false);
        return;
      }
      var tx = db.transaction('products', 'readonly');
      var store = tx.objectStore('products');
      var countReq = store.count();
      countReq.onsuccess = function() {
        db.close();
        resolve(countReq.result > 0);
      };
      countReq.onerror = function() {
        db.close();
        resolve(false);
      };
    };

    req.onerror = function() {
      resolve(false);
    };
  });
}

// ============================================================
// 3. showSplashScreen
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
  logo.src = '/assets/logo.svg';
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
  qrImg.src = '/assets/qr-code.png';
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
// 4. showSyncRequiredScreen
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
  logo.src = '/assets/logo.svg';
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
// 5. boot — main entry point
// Checks IndexedDB health and renders the appropriate screen.
// In Phase 1, the products store is never populated, so "Sync Required"
// is always shown. Splash screen will be the default once Phase 3 sync runs.
// ============================================================

async function boot() {
  var hasCatalogue = await checkCatalogueHealth();
  if (hasCatalogue) {
    showSplashScreen();
  } else {
    showSyncRequiredScreen();
  }
}

// Run boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

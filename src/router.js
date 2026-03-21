// router.js — Hash-based navigation dispatcher for ID Card Factory Kiosk PWA
// Dispatches window.location.hash to the correct screen render function.
// Phase 3-5 will replace stub render functions with real implementations.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

// ============================================================
// Route table — exact hash matches to screen render functions
// ============================================================

var ROUTES = {
  '#/':      renderCatalogueStub,
  '#/email': renderEmailStub,
  '#/admin': renderAdmin      // wired to admin.js renderAdmin — was renderAdminStub
};

// ============================================================
// handleRoute — reads current hash and dispatches to correct screen
// Called on hashchange and synchronously on initRouter (Pitfall 4: initial load dispatch)
// ============================================================

function handleRoute() {
  var hash = window.location.hash || '#/';

  // 1. Exact match in ROUTES table
  if (ROUTES[hash]) {
    ROUTES[hash]();
    return;
  }

  // 2. Prefix match: #/category/:id
  if (hash.indexOf('#/category/') === 0) {
    var categoryId = hash.replace('#/category/', '');
    renderCategoryStub(categoryId);
    return;
  }

  // 3. Prefix match: #/card/:id
  if (hash.indexOf('#/card/') === 0) {
    var cardId = hash.replace('#/card/', '');
    renderCardStub(cardId);
    return;
  }

  // 4. Fallback: unknown hash — redirect to home
  window.location.hash = '#/';
}

// ============================================================
// initRouter — wires hashchange listener and dispatches on initial load
// ============================================================

function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Dispatch synchronously on initial load (handles direct URL with hash)
  handleRoute();
}

// ============================================================
// Screen stub render functions
// Phase 3-5 will replace these with real implementations.
// Each stub creates a div.screen with a unique id for testability.
// ============================================================

function renderCatalogueStub() {
  var app = document.getElementById('app');
  app.innerHTML = '';
  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-catalogue';
  var heading = document.createElement('h1');
  heading.className = 'stub-heading';
  heading.textContent = 'Catalogue';
  screen.appendChild(heading);
  app.appendChild(screen);
}

function renderEmailStub() {
  var app = document.getElementById('app');
  app.innerHTML = '';
  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-email';
  var heading = document.createElement('h1');
  heading.className = 'stub-heading';
  heading.textContent = 'Email Sign Up';
  screen.appendChild(heading);
  app.appendChild(screen);
}

function renderCategoryStub(categoryId) {
  var app = document.getElementById('app');
  app.innerHTML = '';
  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-category';
  var heading = document.createElement('h1');
  heading.className = 'stub-heading';
  heading.textContent = 'Category: ' + categoryId;
  screen.appendChild(heading);
  app.appendChild(screen);
}

function renderCardStub(cardId) {
  var app = document.getElementById('app');
  app.innerHTML = '';
  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-card';
  var heading = document.createElement('h1');
  heading.className = 'stub-heading';
  heading.textContent = 'Card: ' + cardId;
  screen.appendChild(heading);
  app.appendChild(screen);
}

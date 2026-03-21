// catalogue.js — Customer browse experience for ID Card Factory Kiosk PWA
// Owns all browse logic: virtual scroll, grid rendering, filter/search, analytics logging.
// Called from router.js (renderCatalogue) and app.js (initCatalogue, resetCatalogueState).
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.
// Source: Phase 4, CAT-01 through CAT-06, ANALYTICS-02, ANALYTICS-03, STATE.md

// ============================================================
// Module-level state
// ============================================================

var _products = [];           // full product array loaded once from IndexedDB at init
var _filtered = [];           // currently filtered/searched subset
var _categories = [];         // unique category names derived from products, sorted alphabetically
var _lastSyncAt = null;       // ISO string from sync_meta, used for NEW badge detection
var _activeCategory = null;   // currently selected category chip (null = no filter)
var _searchQuery = '';        // current search query ('' = no search)
var _windowStart = 0;         // index into _filtered of first rendered card
var _windowSize = 80;         // max DOM card nodes (5 cols x 16 rows)
var _batchSize = 20;          // cards added/removed per scroll event (5 cols x 4 rows)
var _rowHeight = 0;           // measured from live DOM after first render
var _observer = null;         // IntersectionObserver instance for sentinels
var _topSentinel = null;      // sentinel element above visible window
var _bottomSentinel = null;   // sentinel element below visible window
var _gridContainer = null;    // the grid element holding card tiles
var _topSpacer = null;        // spacer div above rendered cards (simulates scroll height)
var _bottomSpacer = null;     // spacer div below rendered cards
var _scrollContainer = null;  // the .catalogue-scroll element (scrolling parent)
var _searchDebounceTimer = null;

// ============================================================
// initCatalogue — called once at app boot
// Loads all products and sync metadata from IndexedDB.
// Returns a Promise so the caller can chain.
// Source: Pattern 1 from RESEARCH.md
// ============================================================

function initCatalogue() {
  return Promise.all([
    dbGetAll('products'),
    dbGet('sync_meta', 'lastSyncAt')
  ]).then(function(results) {
    _products = results[0];
    var syncMeta = results[1];
    _lastSyncAt = syncMeta ? syncMeta.value : null;
    _filtered = _products.slice();
    _categories = deriveCategoriesFromProducts(_products);
  });
}

// ============================================================
// deriveCategoriesFromProducts — builds sorted unique category list
// Source: Pattern 4 from RESEARCH.md, D-09
// ============================================================

function deriveCategoriesFromProducts(products) {
  var seen = {};
  var categories = [];
  products.forEach(function(p) {
    if (p.category && !seen[p.category]) {
      seen[p.category] = true;
      categories.push(p.category);
    }
  });
  return categories.sort();
}

// ============================================================
// isNewCard — returns true if product was added since last sync
// Source: Pattern 5 from RESEARCH.md, D-04, Pitfall 7
// ============================================================

function isNewCard(product) {
  if (!_lastSyncAt) { return false; }
  return product.createdAt > _lastSyncAt;
}

// ============================================================
// createCardTile — builds a single card DOM node
// Source: D-03, D-04, code example from RESEARCH.md
// ============================================================

function createCardTile(product) {
  var tile = document.createElement('div');
  tile.className = 'card-tile';
  tile.dataset.id = product.id;

  var img = document.createElement('img');
  img.className = 'card-tile-image';
  img.alt = product.imageAlt || product.title;
  img.loading = 'lazy';
  img.src = product.imageUrl;
  tile.appendChild(img);

  if (isNewCard(product)) {
    var badge = document.createElement('span');
    badge.className = 'card-tile-badge';
    badge.textContent = 'NEW';
    tile.appendChild(badge);
  }

  var label = document.createElement('div');
  label.className = 'card-tile-label';
  label.textContent = product.title;
  tile.appendChild(label);

  tile.addEventListener('click', function() {
    window.location.hash = '#/card/' + product.id;
  });

  return tile;
}

// ============================================================
// calculateSpacerHeight — height in px for a given item count
// ============================================================

var _colCount = 5;  // must match grid-template-columns repeat() count in main.css

function calculateSpacerHeight(itemCount) {
  if (_rowHeight === 0) { return 0; }
  var rows = Math.ceil(itemCount / _colCount);
  return rows * _rowHeight;
}

// ============================================================
// renderGridWindow — renders the current virtual scroll window into the grid
// Clears the grid and re-populates with cards from _windowStart to _windowStart + _windowSize.
// Updates top and bottom spacer heights.
// ============================================================

function renderGridWindow() {
  if (!_gridContainer) { return; }
  _gridContainer.innerHTML = '';
  var end = Math.min(_windowStart + _windowSize, _filtered.length);
  for (var i = _windowStart; i < end; i++) {
    _gridContainer.appendChild(createCardTile(_filtered[i]));
  }
  _topSpacer.style.height = calculateSpacerHeight(_windowStart) + 'px';
  _bottomSpacer.style.height = calculateSpacerHeight(_filtered.length - end) + 'px';
}

// ============================================================
// appendNextBatch — appends next batch of cards, removes from top
// Source: Pattern 2 from RESEARCH.md
// ============================================================

function appendNextBatch() {
  if (_windowStart + _windowSize >= _filtered.length) { return; }
  var removeCount = Math.min(_batchSize, _filtered.length - _windowStart - _windowSize);
  if (removeCount <= 0) { return; }

  // Remove from top of rendered window
  for (var r = 0; r < _batchSize && _gridContainer.firstChild; r++) {
    _gridContainer.removeChild(_gridContainer.firstChild);
  }

  // Advance the window start
  _windowStart += _batchSize;

  // Append new cards at the bottom
  var end = Math.min(_windowStart + _windowSize, _filtered.length);
  var appendStart = end - _batchSize;
  if (appendStart < _windowStart) { appendStart = _windowStart; }
  for (var i = appendStart; i < end; i++) {
    _gridContainer.appendChild(createCardTile(_filtered[i]));
  }

  // Update spacers
  _topSpacer.style.height = calculateSpacerHeight(_windowStart) + 'px';
  _bottomSpacer.style.height = calculateSpacerHeight(_filtered.length - end) + 'px';
}

// ============================================================
// prependPrevBatch — prepends previous batch of cards, removes from bottom
// Source: Pattern 2 from RESEARCH.md
// ============================================================

function prependPrevBatch() {
  if (_windowStart === 0) { return; }
  var newStart = Math.max(0, _windowStart - _batchSize);
  var prependCount = _windowStart - newStart;

  // Remove from bottom of rendered window
  for (var r = 0; r < prependCount && _gridContainer.lastChild; r++) {
    _gridContainer.removeChild(_gridContainer.lastChild);
  }

  // Prepend new cards at the top
  var refNode = _gridContainer.firstChild;
  for (var i = _windowStart - 1; i >= newStart; i--) {
    var tile = createCardTile(_filtered[i]);
    _gridContainer.insertBefore(tile, refNode);
    refNode = tile;
  }

  _windowStart = newStart;

  // Update spacers
  var end = Math.min(_windowStart + _windowSize, _filtered.length);
  _topSpacer.style.height = calculateSpacerHeight(_windowStart) + 'px';
  _bottomSpacer.style.height = calculateSpacerHeight(_filtered.length - end) + 'px';
}

// ============================================================
// onSentinelIntersect — IntersectionObserver callback
// Batches DOM mutations in requestAnimationFrame to avoid layout thrashing.
// Source: Anti-pattern note from RESEARCH.md, Pitfall 2
// ============================================================

function onSentinelIntersect(entries) {
  requestAnimationFrame(function() {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry.isIntersecting) { continue; }
      if (entry.target === _bottomSentinel) {
        appendNextBatch();
      } else if (entry.target === _topSentinel) {
        prependPrevBatch();
      }
    }
  });
}

// ============================================================
// setupObserver — creates and wires the IntersectionObserver on sentinels
// Source: Pattern 2 from RESEARCH.md, Pitfall 2
// ============================================================

function setupObserver() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  _observer = new IntersectionObserver(onSentinelIntersect, {
    root: _scrollContainer,
    rootMargin: '200px 0px'
  });
  _observer.observe(_topSentinel);
  _observer.observe(_bottomSentinel);
}

// ============================================================
// resetVirtualScroll — resets scroll position and window start index
// ============================================================

function resetVirtualScroll() {
  _windowStart = 0;
  if (_scrollContainer) {
    _scrollContainer.scrollTop = 0;
  }
}

// ============================================================
// renderCatalogue — main screen render function
// Follows the established screen render pattern from router.js.
// Called by router.js when hash is '#/'.
// Source: D-01, D-05, established screen render pattern
// ============================================================

function renderCatalogue() {
  // Clean up existing observer if navigating back to catalogue
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }

  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen screen-catalogue';
  screen.id = 'screen-catalogue';

  // --- Filter bar (header) ---
  var header = document.createElement('div');
  header.className = 'catalogue-header';
  header.id = 'catalogue-header';

  // Search input
  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'catalogue-search';
  searchInput.className = 'catalogue-search';
  searchInput.placeholder = 'Search cards...';
  searchInput.setAttribute('autocomplete', 'off');
  searchInput.setAttribute('autocorrect', 'off');
  searchInput.setAttribute('autocapitalize', 'off');
  searchInput.setAttribute('spellcheck', 'false');
  if (_searchQuery) { searchInput.value = _searchQuery; }
  searchInput.addEventListener('input', onSearchInput);
  header.appendChild(searchInput);

  // Category chips container
  var chipsContainer = document.createElement('div');
  chipsContainer.className = 'catalogue-chips';
  chipsContainer.id = 'catalogue-chips';

  _categories.forEach(function(category) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = _activeCategory === category ? 'chip chip--active' : 'chip';
    chip.textContent = category;
    chip.dataset.category = category;
    chip.addEventListener('click', onChipClick);
    chipsContainer.appendChild(chip);
  });

  header.appendChild(chipsContainer);
  screen.appendChild(header);

  // --- Scrollable grid container ---
  _scrollContainer = document.createElement('div');
  _scrollContainer.className = 'catalogue-scroll';

  _topSentinel = document.createElement('div');
  _topSentinel.className = 'scroll-sentinel scroll-sentinel--top';

  _topSpacer = document.createElement('div');
  _topSpacer.className = 'scroll-spacer scroll-spacer--top';
  _topSpacer.style.height = '0px';

  _gridContainer = document.createElement('div');
  _gridContainer.className = 'catalogue-grid';

  _bottomSpacer = document.createElement('div');
  _bottomSpacer.className = 'scroll-spacer scroll-spacer--bottom';
  _bottomSpacer.style.height = '0px';

  _bottomSentinel = document.createElement('div');
  _bottomSentinel.className = 'scroll-sentinel scroll-sentinel--bottom';

  // Sentinel order: sentinels bracket the RENDERED cards, not the spacers.
  // Bottom sentinel must come BEFORE the bottom spacer so it fires as soon as
  // the user reaches the end of rendered cards — not after scrolling through
  // thousands of px of virtual spacer space.
  _scrollContainer.appendChild(_topSentinel);
  _scrollContainer.appendChild(_topSpacer);
  _scrollContainer.appendChild(_gridContainer);
  _scrollContainer.appendChild(_bottomSentinel);
  _scrollContainer.appendChild(_bottomSpacer);

  screen.appendChild(_scrollContainer);
  app.appendChild(screen);

  // Render initial window of cards
  renderGridWindow();

  // Show empty state if no results on initial render
  if (_filtered.length === 0 && _gridContainer) {
    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'catalogue-empty';
    emptyMsg.textContent = _searchQuery
      ? 'No cards found for "' + _searchQuery + '"'
      : 'No cards available';
    _gridContainer.appendChild(emptyMsg);
  }

  // Defer row height measurement and observer setup until after first paint
  // Source: Pitfall 2 and Pitfall 3 from RESEARCH.md
  requestAnimationFrame(function() {
    var firstCard = _gridContainer.querySelector('.card-tile');
    if (firstCard) {
      _rowHeight = firstCard.offsetHeight;
      // Recompute spacers now that we have a measured row height
      var end = Math.min(_windowStart + _windowSize, _filtered.length);
      _topSpacer.style.height = calculateSpacerHeight(_windowStart) + 'px';
      _bottomSpacer.style.height = calculateSpacerHeight(_filtered.length - end) + 'px';
    }
    setupObserver();
  });
}

// ============================================================
// applyFilters — recomputes _filtered from _products using current state
// Resets virtual scroll and re-renders grid.
// Source: Pattern 3 from RESEARCH.md, D-07, D-08
// ============================================================

function applyFilters() {
  var query = _searchQuery;
  var category = _activeCategory;
  _filtered = _products.filter(function(p) {
    var categoryMatch = !category || p.category === category;
    var searchMatch = !query || p.title.toLowerCase().indexOf(query) !== -1;
    return categoryMatch && searchMatch;
  });
  resetVirtualScroll();
  renderGridWindow();
  // Show empty state if no results
  if (_filtered.length === 0 && _gridContainer) {
    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'catalogue-empty';
    emptyMsg.textContent = query
      ? 'No cards found for "' + query + '"'
      : 'No cards in this category';
    _gridContainer.appendChild(emptyMsg);
  }
}

// ============================================================
// onSearchInput — debounced handler for search input events
// Logs search analytics only after debounce settles.
// Source: Pattern 6 from RESEARCH.md, D-08, D-19, Pitfall 5
// ============================================================

function onSearchInput(event) {
  clearTimeout(_searchDebounceTimer);
  var query = event.target.value.toLowerCase().trim();
  _searchDebounceTimer = setTimeout(function() {
    _searchQuery = query;
    applyFilters();
    // Log search analytics only on debounce settlement (not per keystroke) per D-19
    if (query.length > 0) {
      dbAdd('analytics', {
        type: 'search',
        query: query,
        resultCount: _filtered.length,
        zeroResult: _filtered.length === 0,
        timestamp: new Date().toISOString(),
        eventName: Config.getEventName()
      });
    }
  }, 150);
}

// ============================================================
// onChipClick — handler for category chip button clicks
// Single-select toggle: tapping active chip deselects it.
// Logs category_filter analytics on selection only (not deselection).
// Source: D-06, D-07, D-18, Pitfall 8
// ============================================================

function onChipClick(event) {
  var category = event.currentTarget.dataset.category;

  if (_activeCategory === category) {
    // Tapping active chip deselects it
    _activeCategory = null;
  } else {
    _activeCategory = category;
  }

  // Update chip visual state
  var allChips = document.querySelectorAll('#catalogue-chips .chip');
  for (var i = 0; i < allChips.length; i++) {
    allChips[i].classList.remove('chip--active');
  }
  if (_activeCategory !== null) {
    event.currentTarget.classList.add('chip--active');
  }

  applyFilters();

  // Log analytics only when selecting (not deselecting) per Pitfall 8 and D-18
  if (_activeCategory !== null) {
    dbAdd('analytics', {
      type: 'category_filter',
      category: _activeCategory,
      timestamp: new Date().toISOString(),
      eventName: Config.getEventName()
    });
  }
}

// ============================================================
// renderCard — full-screen card detail view
// Finds product in memory, renders large image, name, fixed pricing.
// Logs card_view analytics on every open.
// Source: Phase 4, CAT-05, D-10, D-11, D-12, D-13, D-14, D-17, ANALYTICS-01
// ============================================================

function renderCard(cardId) {
  // Find product in in-memory array
  var product = null;
  for (var i = 0; i < _products.length; i++) {
    if (_products[i].id === cardId) {
      product = _products[i];
      break;
    }
  }
  if (!product) {
    window.location.hash = '#/';
    return;
  }

  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen screen-card-detail';
  screen.id = 'screen-card';

  // Back button — positioned below chrome home button to avoid overlap
  // Home button is fixed at top:16px left:16px 48x48px — place back at top:72px left:16px
  var backBtn = document.createElement('button');
  backBtn.className = 'detail-back';
  backBtn.type = 'button';
  backBtn.innerHTML = '&#8249; Back to browse';
  backBtn.addEventListener('click', function() {
    window.location.hash = '#/';
  });
  screen.appendChild(backBtn);

  // Card image — large, centred, portrait
  var imgContainer = document.createElement('div');
  imgContainer.className = 'detail-image-container';

  var img = document.createElement('img');
  img.className = 'detail-image';
  img.src = product.imageUrl;
  img.alt = product.imageAlt || product.title;
  imgContainer.appendChild(img);

  // NEW badge on detail view (per D-04 — "in both the grid and detail views")
  if (isNewCard(product)) {
    var badge = document.createElement('span');
    badge.className = 'detail-badge';
    badge.textContent = 'NEW';
    imgContainer.appendChild(badge);
  }

  screen.appendChild(imgContainer);

  // Card name
  var title = document.createElement('h2');
  title.className = 'detail-title';
  title.textContent = product.title;
  screen.appendChild(title);

  // Pricing — read from synced variants (title + price per variant)
  var pricing = document.createElement('div');
  pricing.className = 'detail-pricing';

  var variants = (product.variants && product.variants.length) ? product.variants : null;
  if (variants) {
    variants.forEach(function(v) {
      var line = document.createElement('p');
      line.className = 'detail-price-line';
      var priceStr = '';
      if (v.price !== null && v.price !== undefined) {
        var n = parseFloat(v.price);
        priceStr = ' \u2014 \u00A3' + (isNaN(n) ? v.price : (n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)));
      }
      line.textContent = v.title + priceStr;
      pricing.appendChild(line);
    });
  } else {
    // Fallback for products synced before variant data was added — re-sync to get accurate prices
    var fallback = document.createElement('p');
    fallback.className = 'detail-price-line';
    fallback.textContent = 'Re-sync catalogue to see pricing';
    fallback.style.color = 'var(--color-text-secondary)';
    pricing.appendChild(fallback);
  }

  screen.appendChild(pricing);
  app.appendChild(screen);

  // Log card view analytics (ANALYTICS-01, D-17) — fire and forget
  dbAdd('analytics', {
    type: 'card_view',
    cardId: product.id,
    cardName: product.title,
    timestamp: new Date().toISOString(),
    eventName: Config.getEventName()
  });
}

// ============================================================
// renderCategory — pre-selects a category chip and renders catalogue
// Decodes the category from the URL, sets _activeCategory, then renders
// the catalogue grid. Uses redirect to #/ pattern rather than a separate screen.
// Source: Phase 4, RESEARCH.md recommendation
// ============================================================

function renderCategory(categoryId) {
  // Decode the category ID (it may be URI-encoded in the hash)
  var category = decodeURIComponent(categoryId);
  // Check if this category exists in our derived categories
  var found = false;
  for (var i = 0; i < _categories.length; i++) {
    if (_categories[i] === category) {
      found = true;
      break;
    }
  }
  if (found) {
    _activeCategory = category;
    _searchQuery = '';
    var searchInput = document.getElementById('catalogue-search');
    if (searchInput) { searchInput.value = ''; }
    applyFilters();
  }
  // Render catalogue with the category pre-selected
  renderCatalogue();
  // After render, mark the correct chip as active
  if (found) {
    var chips = document.querySelectorAll('.chip');
    for (var j = 0; j < chips.length; j++) {
      if (chips[j].dataset.category === category) {
        chips[j].classList.add('chip--active');
      }
    }
  }
}

// ============================================================
// resetCatalogueState — called from app.js home button handler
// Clears all filter/search state and re-renders the grid from scratch.
// Source: D-21
// ============================================================

function resetCatalogueState() {
  _activeCategory = null;
  _searchQuery = '';

  // Clear the search input value if it exists on screen
  var searchInput = document.getElementById('catalogue-search');
  if (searchInput) { searchInput.value = ''; }

  // Deselect all category chips
  var activeChips = document.querySelectorAll('.chip.chip--active');
  for (var i = 0; i < activeChips.length; i++) {
    activeChips[i].classList.remove('chip--active');
  }

  // Rebuild filtered array from full product list
  _filtered = _products.slice();
  resetVirtualScroll();
  renderGridWindow();
}

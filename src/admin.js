// admin.js — Admin panel for ID Card Factory Kiosk PWA
// Passcode-gated panel with event configuration, sync trigger, sync status,
// email export, and event analytics summary.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

// ============================================================
// renderAdmin — main entry point called by the router for #/admin
// Pauses idle timer, shows passcode gate, then renders admin panel.
// ============================================================

function renderAdmin() {
  pauseIdleTimer();

  var app = document.getElementById('app');
  app.innerHTML = '';

  var screen = document.createElement('div');
  screen.className = 'screen';
  screen.id = 'screen-admin';

  app.appendChild(screen);

  // Check whether a passcode has been set
  if (Config.getPasscodeHash() === null) {
    // First run: no passcode set — prompt user to create one
    showPasscodeOverlay(true, function() {
      renderAdminPanel(screen);
    });
  } else {
    // Subsequent runs: require entry of existing passcode
    showPasscodeOverlay(false, function() {
      renderAdminPanel(screen);
    });
  }
}

// ============================================================
// showPasscodeOverlay — full-screen gate overlay
// isSetup: true = create passcode (first run), false = enter passcode
// onSuccess: callback invoked after valid passcode entered/created
// ============================================================

function showPasscodeOverlay(isSetup, onSuccess) {
  var app = document.getElementById('app');

  var overlay = document.createElement('div');
  overlay.className = 'passcode-overlay';

  // Title
  var title = document.createElement('h2');
  title.textContent = isSetup ? 'Set Admin Passcode' : 'Enter Passcode';
  overlay.appendChild(title);

  // Passcode input
  var input = document.createElement('input');
  input.type = 'password';
  input.className = 'passcode-input';
  input.placeholder = 'Enter passcode';
  overlay.appendChild(input);

  // Error message (hidden initially)
  var errorMsg = document.createElement('p');
  errorMsg.className = 'passcode-error';
  errorMsg.style.display = 'none';
  overlay.appendChild(errorMsg);

  // Submit button
  var submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'passcode-submit btn-primary';
  submitBtn.textContent = isSetup ? 'Set Passcode' : 'Unlock';
  overlay.appendChild(submitBtn);

  // Cancel/back button
  var backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'passcode-back btn-secondary';
  backBtn.textContent = 'Cancel';
  overlay.appendChild(backBtn);

  app.appendChild(overlay);

  // Focus input after render
  setTimeout(function() { input.focus(); }, 50);

  // Cancel: go home and resume idle timer
  backBtn.addEventListener('click', function() {
    resumeIdleTimer();
    window.location.hash = '#/';
  });

  // Submit handler
  submitBtn.addEventListener('click', function() {
    var value = input.value.trim();
    if (!value) { return; }

    if (isSetup) {
      hashPasscode(value).then(function(hash) {
        Config.setPasscodeHash(hash);
        overlay.parentNode.removeChild(overlay);
        onSuccess();
      });
    } else {
      verifyPasscode(value).then(function(valid) {
        if (valid) {
          overlay.parentNode.removeChild(overlay);
          onSuccess();
        } else {
          input.value = '';
          errorMsg.textContent = 'Incorrect passcode';
          errorMsg.style.display = 'block';
        }
      });
    }
  });

  // Enter key shortcut
  input.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') { submitBtn.click(); }
  });
}

// ============================================================
// renderAdminPanel — builds the full admin panel inside screen div
// Called after passcode is verified/created.
// ============================================================

function renderAdminPanel(screen) {
  // Wrap in scrollable panel container
  var panel = document.createElement('div');
  panel.className = 'admin-panel';

  // ---- Header ----
  var title = document.createElement('h1');
  title.className = 'admin-title';
  title.textContent = 'Admin Panel';
  panel.appendChild(title);

  // ---- Event Configuration Section ----
  var eventSection = document.createElement('div');
  eventSection.className = 'admin-section';

  var eventHeading = document.createElement('h2');
  eventHeading.className = 'admin-section-heading';
  eventHeading.textContent = 'Event Configuration';
  eventSection.appendChild(eventHeading);

  // Event Name
  var nameLabel = document.createElement('label');
  nameLabel.className = 'admin-label';
  nameLabel.textContent = 'Event Name';
  eventSection.appendChild(nameLabel);

  var nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'admin-event-name';
  nameInput.className = 'admin-input';
  nameInput.value = Config.getEventName();
  nameInput.placeholder = 'e.g. MCM London May 2026';
  eventSection.appendChild(nameInput);

  // Event Date
  var dateLabel = document.createElement('label');
  dateLabel.className = 'admin-label';
  dateLabel.textContent = 'Event Date';
  eventSection.appendChild(dateLabel);

  var dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'admin-event-date';
  dateInput.className = 'admin-input';
  dateInput.value = Config.getEventDate();
  eventSection.appendChild(dateInput);

  // Save button + feedback
  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Save';
  eventSection.appendChild(saveBtn);

  var saveConfirm = document.createElement('p');
  saveConfirm.className = 'sync-result-success';
  saveConfirm.style.display = 'none';
  saveConfirm.textContent = 'Saved!';
  eventSection.appendChild(saveConfirm);

  saveBtn.addEventListener('click', function() {
    Config.setEventName(nameInput.value);
    Config.setEventDate(dateInput.value);
    saveConfirm.style.display = 'block';
    setTimeout(function() { saveConfirm.style.display = 'none'; }, 2000);
  });

  panel.appendChild(eventSection);

  // ---- Sync Section ----
  var syncSection = document.createElement('div');
  syncSection.className = 'admin-section';

  var syncHeading = document.createElement('h2');
  syncHeading.className = 'admin-section-heading';
  syncHeading.textContent = 'Catalogue Sync';
  syncSection.appendChild(syncHeading);

  var syncBtn = document.createElement('button');
  syncBtn.type = 'button';
  syncBtn.id = 'admin-sync-btn';
  syncBtn.className = 'btn-primary btn-large';
  syncBtn.textContent = 'Sync Catalogue';
  syncSection.appendChild(syncBtn);

  // Progress area (hidden until sync starts)
  var progressArea = document.createElement('div');
  progressArea.id = 'admin-sync-progress';
  progressArea.className = 'admin-sync-progress';
  progressArea.style.display = 'none';
  syncSection.appendChild(progressArea);

  var progressTrack = document.createElement('div');
  progressTrack.className = 'progress-bar-track';
  progressArea.appendChild(progressTrack);

  var progressFill = document.createElement('div');
  progressFill.id = 'admin-progress-fill';
  progressFill.className = 'progress-bar-fill';
  progressTrack.appendChild(progressFill);

  var progressText = document.createElement('p');
  progressText.id = 'admin-progress-text';
  progressText.className = 'admin-progress-text';
  progressText.textContent = 'Starting sync...';
  progressArea.appendChild(progressText);

  // Result area (hidden until sync completes)
  var resultArea = document.createElement('div');
  resultArea.id = 'admin-sync-result';
  resultArea.className = 'admin-sync-result';
  resultArea.style.display = 'none';
  syncSection.appendChild(resultArea);

  // Sync button click handler
  syncBtn.addEventListener('click', function() {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    progressArea.style.display = 'block';
    resultArea.style.display = 'none';

    syncAll(function(progress) {
      // Estimate total pages: 950 products at 250 per page = ~4 pages
      var estimatedPages = Math.max(4, progress.page);
      var pct = Math.min(100, Math.round((progress.page / estimatedPages) * 100));
      progressFill.style.width = pct + '%';
      progressText.textContent = 'Page ' + progress.page + ' \u2014 ' + progress.products + ' products fetched';
    }).then(function(stats) {
      progressArea.style.display = 'none';
      resultArea.style.display = 'block';
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync Catalogue';

      resultArea.innerHTML = '';

      if (stats.aborted) {
        var errHeading = document.createElement('p');
        errHeading.className = 'sync-result-error';
        errHeading.textContent = 'Sync interrupted: ' + stats.abortReason;
        resultArea.appendChild(errHeading);

        var errDetail = document.createElement('p');
        errDetail.className = 'sync-result-detail';
        errDetail.textContent = stats.total + ' products saved before interruption. Resume by tapping Sync again.';
        resultArea.appendChild(errDetail);
      } else {
        var successHeading = document.createElement('p');
        successHeading.className = 'sync-result-success';
        successHeading.textContent = 'Sync complete!';
        resultArea.appendChild(successHeading);

        var detail = document.createElement('p');
        detail.className = 'sync-result-detail';
        detail.textContent = 'Total: ' + stats.total + ' products | New: ' + stats.newProducts + ' | Errors: ' + stats.errors.length;
        resultArea.appendChild(detail);
      }

      // Refresh sync status display after sync
      loadAndRenderSyncStatus(statusArea);
    }).catch(function(err) {
      progressArea.style.display = 'none';
      resultArea.style.display = 'block';
      syncBtn.disabled = false;
      syncBtn.textContent = 'Sync Catalogue';

      resultArea.innerHTML = '';
      var errHeading = document.createElement('p');
      errHeading.className = 'sync-result-error';
      errHeading.textContent = 'Sync failed: ' + (err.message || 'Unknown error');
      resultArea.appendChild(errHeading);
    });
  });

  panel.appendChild(syncSection);

  // ---- Sync Status Section ----
  var statusArea = document.createElement('div');
  statusArea.id = 'admin-sync-status';
  statusArea.className = 'admin-section';
  panel.appendChild(statusArea);

  // Populate sync status on initial render
  loadAndRenderSyncStatus(statusArea);

  // ---- Email Export Section ----
  renderEmailExportSection(panel);

  // ---- Exit Button ----
  // Appended to panel first so that insertBefore(section, exitBtn) works in
  // renderAnalyticsSummarySection and any future section-insert calls.
  var exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.id = 'admin-exit-btn';
  exitBtn.className = 'btn-secondary btn-large';
  exitBtn.textContent = 'Exit Admin';

  exitBtn.addEventListener('click', function() {
    resumeIdleTimer();
    window.location.hash = '#/';
  });

  panel.appendChild(exitBtn);

  // ---- Analytics Summary Section ----
  // Inserted before exitBtn so it appears between Email Export and Exit.
  renderAnalyticsSummarySection(panel, exitBtn);

  screen.appendChild(panel);
}

// ============================================================
// escapeCsvField — wraps a CSV field value in quotes if it contains
// commas, double-quotes, or newlines (RFC 4180 safe quoting).
// ============================================================

function escapeCsvField(value) {
  if (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ============================================================
// buildCsvFilename — generates a safe CSV filename from event name and date.
// Pattern: emails-{sanitized-event-name}-{event-date}.csv
// ============================================================

function buildCsvFilename(eventName, eventDate) {
  var safeName = eventName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  return 'emails-' + safeName + '-' + eventDate + '.csv';
}

// ============================================================
// renderEmailExportSection — builds the Email Export admin section and
// appends it to the panel. Called by renderAdminPanel() after the Sync Status section,
// before the exit button is created.
// ============================================================

function renderEmailExportSection(panel) {
  var section = document.createElement('div');
  section.className = 'admin-section';

  var heading = document.createElement('h2');
  heading.className = 'admin-section-heading';
  heading.textContent = 'Email Export';
  section.appendChild(heading);

  var exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn-primary btn-large';
  exportBtn.textContent = 'Export / Share Emails (CSV)';
  section.appendChild(exportBtn);

  var statusMsg = document.createElement('p');
  statusMsg.className = 'sync-result-detail';
  statusMsg.style.display = 'none';
  section.appendChild(statusMsg);

  exportBtn.addEventListener('click', function() {
    var eventName = Config.getEventName();
    var eventDate = Config.getEventDate();

    dbGetAll('emails').then(function(allEmails) {
      var filtered = allEmails.filter(function(r) {
        return r.eventName === eventName;
      });

      if (filtered.length === 0) {
        statusMsg.textContent = 'No emails captured for this event yet.';
        statusMsg.style.display = 'block';
        return;
      }

      var csvRows = ['Email Address,TAGS'];
      filtered.forEach(function(r) {
        csvRows.push(escapeCsvField(r.email) + ',' + escapeCsvField(eventName));
      });
      var csvString = csvRows.join('\n');

      var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = buildCsvFilename(eventName, eventDate);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusMsg.textContent = 'Exported ' + filtered.length + ' email(s).';
      statusMsg.style.display = 'block';
    });
  });

  panel.appendChild(section);
}

// ============================================================
// aggregateAnalytics — pure data aggregation over raw analytics records.
// Takes the full analytics array and filters to currentEventName scope.
//
// ANALYTICS-05: Analytics records accumulate across events indefinitely.
// No code path clears the analytics store. Records are scoped by eventName field.
// Filtering by currentEventName provides per-event views; all historical data is preserved.
//
// Returns:
//   {
//     topCards:    [{ id, name, count }]  — top 10 most-viewed cards, descending
//     topSearches: [{ query, count }]     — all unique queries, descending by count
//     zeroResults: [string]               — unique query strings with zero results
//   }
// ============================================================

function aggregateAnalytics(records, currentEventName) {
  var eventRecords = records.filter(function(r) {
    return r.eventName === currentEventName;
  });

  // Top 10 card views — count by cardId, track name, sort descending, take first 10
  var cardViews = {};
  var cardNames = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'card_view') {
      cardViews[r.cardId] = (cardViews[r.cardId] || 0) + 1;
      cardNames[r.cardId] = r.cardName;
    }
  });
  var topCards = Object.keys(cardViews)
    .map(function(id) { return { id: id, name: cardNames[id], count: cardViews[id] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 10);

  // Most-searched terms — count by query, sort descending
  var searchCounts = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'search') {
      searchCounts[r.query] = (searchCounts[r.query] || 0) + 1;
    }
  });
  var topSearches = Object.keys(searchCounts)
    .map(function(q) { return { query: q, count: searchCounts[q] }; })
    .sort(function(a, b) { return b.count - a.count; });

  // Zero-result searches — unique query strings that returned zero results
  var zeroResultSet = {};
  eventRecords.forEach(function(r) {
    if (r.type === 'search' && r.zeroResult === true) {
      zeroResultSet[r.query] = true;
    }
  });
  var zeroResults = Object.keys(zeroResultSet);

  return { topCards: topCards, topSearches: topSearches, zeroResults: zeroResults };
}

// ============================================================
// renderAnalyticsSummarySection — builds the "Event Analytics" admin section
// and inserts it into panel before exitBtn.
// Reads dbGetAll('analytics') and dbGetAll('emails') asynchronously.
// Called by renderAdminPanel() after exitBtn has been appended to panel.
// ============================================================

function renderAnalyticsSummarySection(panel, exitBtn) {
  var section = document.createElement('div');
  section.className = 'admin-section';

  var heading = document.createElement('h2');
  heading.className = 'admin-section-heading';
  heading.textContent = 'Event Analytics';
  section.appendChild(heading);

  var eventName = Config.getEventName();

  // Scope indicator
  var scopeNote = document.createElement('p');
  scopeNote.className = 'sync-result-detail';
  scopeNote.textContent = eventName ? 'Showing data for: ' + eventName : 'No event configured';
  section.appendChild(scopeNote);

  // Loading indicator
  var loading = document.createElement('p');
  loading.className = 'sync-result-detail';
  loading.textContent = 'Loading analytics...';
  section.appendChild(loading);

  // Insert section before exit button
  panel.insertBefore(section, exitBtn);

  Promise.all([
    dbGetAll('analytics'),
    dbGetAll('emails')
  ]).then(function(results) {
    var analyticsRecords = results[0];
    var emailRecords = results[1];

    loading.style.display = 'none';

    // Email count for current event
    var emailCount = emailRecords.filter(function(r) {
      return r.eventName === eventName;
    }).length;

    // Aggregate analytics data
    var agg = aggregateAnalytics(analyticsRecords, eventName);

    // ---- Total Emails ----
    var emailStat = document.createElement('p');
    emailStat.className = 'admin-stat';
    emailStat.textContent = 'Emails captured: ' + emailCount;
    section.appendChild(emailStat);

    // ---- Top 10 Most-Viewed Cards ----
    var topCardsHeading = document.createElement('h3');
    topCardsHeading.textContent = 'Top 10 Most-Viewed Cards';
    section.appendChild(topCardsHeading);

    if (agg.topCards.length === 0) {
      var noCards = document.createElement('p');
      noCards.textContent = 'No card views recorded.';
      section.appendChild(noCards);
    } else {
      var cardsList = document.createElement('ol');
      agg.topCards.forEach(function(item) {
        var li = document.createElement('li');
        li.textContent = item.name + ' \u2014 ' + item.count + ' views';
        cardsList.appendChild(li);
      });
      section.appendChild(cardsList);
    }

    // ---- Most-Searched Terms ----
    var topSearchesHeading = document.createElement('h3');
    topSearchesHeading.textContent = 'Most-Searched Terms';
    section.appendChild(topSearchesHeading);

    if (agg.topSearches.length === 0) {
      var noSearches = document.createElement('p');
      noSearches.textContent = 'No searches recorded.';
      section.appendChild(noSearches);
    } else {
      var searchList = document.createElement('ol');
      agg.topSearches.forEach(function(item) {
        var li = document.createElement('li');
        li.textContent = item.query + ' \u2014 ' + item.count + ' searches';
        searchList.appendChild(li);
      });
      section.appendChild(searchList);
    }

    // ---- Zero-Result Searches ----
    var zeroHeading = document.createElement('h3');
    zeroHeading.textContent = 'Zero-Result Searches';
    section.appendChild(zeroHeading);

    if (agg.zeroResults.length === 0) {
      var noZero = document.createElement('p');
      noZero.textContent = 'No zero-result searches.';
      section.appendChild(noZero);
    } else {
      var zeroList = document.createElement('ul');
      agg.zeroResults.forEach(function(query) {
        var li = document.createElement('li');
        li.textContent = query;
        zeroList.appendChild(li);
      });
      section.appendChild(zeroList);
    }
  });
}

// ============================================================
// loadAndRenderSyncStatus — reads sync_meta from IndexedDB and renders status
// Called on initial admin panel render and after sync completes.
// ============================================================

function loadAndRenderSyncStatus(container) {
  Promise.all([
    dbGet('sync_meta', 'lastSyncAt'),
    dbGet('sync_meta', 'productCount'),
    dbGet('sync_meta', 'currentCursor'),
    dbCount('products')
  ]).then(function(results) {
    var lastSync = results[0] ? results[0].value : null;
    var syncedCount = results[1] ? results[1].value : 0;
    var interrupted = results[2] ? results[2].value : null;
    var liveCount = results[3];

    container.innerHTML = '';

    var heading = document.createElement('h2');
    heading.className = 'admin-section-heading';
    heading.textContent = 'Sync Status';
    container.appendChild(heading);

    var statusList = document.createElement('dl');
    statusList.className = 'admin-status-list';

    // Last Sync row
    var dtSync = document.createElement('dt');
    dtSync.textContent = 'Last Sync';
    var ddSync = document.createElement('dd');
    ddSync.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
    statusList.appendChild(dtSync);
    statusList.appendChild(ddSync);

    // Product Count row
    var dtCount = document.createElement('dt');
    dtCount.textContent = 'Products in Database';
    var ddCount = document.createElement('dd');
    ddCount.textContent = String(liveCount);
    statusList.appendChild(dtCount);
    statusList.appendChild(ddCount);

    // Interrupted indicator (show only if cursor is present — means sync was interrupted)
    if (interrupted) {
      var dtInt = document.createElement('dt');
      dtInt.textContent = 'Status';
      var ddInt = document.createElement('dd');
      ddInt.className = 'sync-status-warning';
      ddInt.textContent = 'Previous sync was interrupted \u2014 tap Sync to resume';
      statusList.appendChild(dtInt);
      statusList.appendChild(ddInt);
    }

    container.appendChild(statusList);
  });
}

// db.js — IndexedDB access module for ID Card Factory Kiosk PWA
// This is the EXCLUSIVE gateway to IndexedDB. No other module opens IDB transactions directly.
// Source: MDN IndexedDB API, STATE.md architecture constraint.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.

var DB_NAME = 'kiosk-db';
var DB_VERSION = 2;  // Bumped from Phase 1's implicit v1 — adds all 4 stores
var _db = null;

// ============================================================
// openDB — returns Promise<IDBDatabase>
// Reuses cached connection if already open.
// onupgradeneeded handles fresh install and v1→v2 upgrade.
// ============================================================

function openDB() {
  return new Promise(function(resolve, reject) {
    if (_db) {
      resolve(_db);
      return;
    }

    var req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = function(event) {
      var db = event.target.result;
      var oldVersion = event.oldVersion;

      // Create all stores when upgrading from any version below 2.
      // Guards with contains() prevent duplicate store errors on partial upgrades.
      if (oldVersion < 2) {
        // products store — keyPath: 'id' (Shopify product ID string)
        // Indexes: 'category' (for filter queries), 'createdAt' (for NEW badge detection)
        if (!db.objectStoreNames.contains('products')) {
          var productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('category', 'category', { unique: false });
          productStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // emails store — autoIncrement PK; fields: email, eventName, eventDate, consentAt
        if (!db.objectStoreNames.contains('emails')) {
          db.createObjectStore('emails', { keyPath: 'id', autoIncrement: true });
        }

        // analytics store — autoIncrement PK; fields: type, data, timestamp, eventName
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        }

        // sync_meta store — keyPath: 'key' (e.g. 'lastSyncAt', 'lastCursor', 'productCount')
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' });
        }
      }
    };

    req.onsuccess = function(event) {
      _db = event.target.result;
      resolve(_db);
    };

    req.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

// ============================================================
// CRUD helpers — all return Promises
// ============================================================

// dbGet — retrieve a single record by primary key
function dbGet(storeName, key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbPut — upsert a record (insert or overwrite by primary key)
function dbPut(storeName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).put(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbAdd — insert a new record (errors if key already exists)
function dbAdd(storeName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).add(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbGetAll — retrieve all records in a store
// Uses IDBObjectStore.getAll() — IndexedDB v2, safe on Safari 10.1+
function dbGetAll(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).getAll();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbCount — count of all records in a store
// Uses IDBObjectStore.count() — safe on Safari 10.1+
function dbCount(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var req = tx.objectStore(storeName).count();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbDelete — delete a single record by primary key
function dbDelete(storeName, key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).delete(key);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbClear — delete all records in a store (e.g. full re-sync)
function dbClear(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var req = tx.objectStore(storeName).clear();
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// dbGetAllByIndex — retrieve all records matching an index value
// Used by Phase 4 category filtering: dbGetAllByIndex('products', 'category', 'Gaming')
function dbGetAllByIndex(storeName, indexName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var index = tx.objectStore(storeName).index(indexName);
      var req = index.getAll(value);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

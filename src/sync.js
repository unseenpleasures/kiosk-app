// sync.js — Shopify catalogue sync engine for ID Card Factory Kiosk PWA
// This is the EXCLUSIVE network access module. No other module makes fetch() calls.
// ES2017 syntax: function keyword throughout, var declarations, no arrow functions.
// Source: STATE.md architecture constraint, 03-RESEARCH.md patterns, Shopify Storefront API 2026-01.

// ============================================================
// Constants
// ============================================================

var SHOPIFY_STORE_DOMAIN = 'theidcardfactory.myshopify.com'; // TODO: confirm exact domain
var STOREFRONT_TOKEN = 'REPLACE_WITH_STOREFRONT_TOKEN';       // TODO: replace with real token
var API_VERSION = '2026-01';
var PRODUCTS_PER_PAGE = 250;
var SYNC_CACHE_NAME = 'kiosk-v3';

// ============================================================
// GraphQL query — cursor-based pagination, featuredImage.url (not src — deprecated)
// Source: https://shopify.dev/docs/api/storefront/2026-01/objects/Product
// Source: https://shopify.dev/docs/api/usage/pagination-graphql
// ============================================================

var PRODUCTS_QUERY = 'query ($cursor: String) { products(first: 250, after: $cursor) { nodes { id title handle productType tags createdAt updatedAt featuredImage { url altText width height } } pageInfo { hasNextPage endCursor } } }';

// ============================================================
// fetchProductPage — POST one page of products from Shopify Storefront API
// cursor: string|null — null = first page, non-null = resume cursor
// Returns: Promise<Object> — raw GraphQL JSON response
// ============================================================

function fetchProductPage(cursor) {
  var url = 'https://' + SHOPIFY_STORE_DOMAIN + '/api/' + API_VERSION + '/graphql.json';
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
    },
    body: JSON.stringify({
      query: PRODUCTS_QUERY,
      variables: { cursor: cursor || null }
    })
  }).then(function(res) {
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    return res.json();
  });
}

// ============================================================
// cacheImagesSequential — fetch and cache product images one at a time
// Sequential execution prevents memory pressure on A9X chip.
// Image failures are non-fatal — errors are pushed to the errors array.
// Source: MDN CacheStorage https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage
// Note: window.caches requires a secure context (HTTPS or localhost).
//       The installed PWA is always a secure context — safe to use from main thread.
// ============================================================

function cacheImagesSequential(urls, errors) {
  return urls.reduce(function(chain, url) {
    return chain.then(function() {
      return caches.open(SYNC_CACHE_NAME).then(function(cache) {
        return fetch(url).then(function(response) {
          if (response.ok) {
            return cache.put(url, response);
          }
        });
      }).catch(function(err) {
        // Image cache failure is non-fatal — log and continue the chain
        errors.push({ url: url, error: err.message });
      });
    });
  }, Promise.resolve());
}

// ============================================================
// syncAll — main sync entry point
// onProgress: function({ page, products, newProducts }) — fired after each page
// Returns: Promise<{ total, newProducts, errors }> on success
// Returns: Promise<{ total, newProducts, errors, aborted, abortReason }> on failure
//
// Cursor checkpoint strategy:
//   - currentCursor written to sync_meta after every page
//   - If sync is interrupted, next call resumes from saved cursor
//   - On full completion, currentCursor is cleared (null)
//   - Products are NEVER cleared — upsert semantics only (SYNC-04)
// ============================================================

function syncAll(onProgress) {
  var cursor = null;
  var pageNum = 0;
  var totalProducts = 0;
  var newProducts = 0;
  var errors = [];

  function fetchNext() {
    return fetchProductPage(cursor).then(function(data) {
      var productsData = data.data.products;
      var nodes = productsData.nodes;
      var pageInfo = productsData.pageInfo;

      pageNum++;

      // Upsert each product into IndexedDB — check if new before upserting
      var upsertPromises = nodes.map(function(product) {
        return dbGet('products', product.id).then(function(existing) {
          if (!existing) {
            newProducts++;
          }
          totalProducts++;
          return dbPut('products', {
            id: product.id,
            title: product.title,
            handle: product.handle,
            category: product.productType,
            tags: product.tags,
            imageUrl: product.featuredImage ? product.featuredImage.url : null,
            imageAlt: product.featuredImage ? product.featuredImage.altText : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
          });
        });
      });

      return Promise.all(upsertPromises).then(function() {
        // Cache images for this page sequentially (best-effort — failures non-fatal)
        var imageUrls = nodes.map(function(p) {
          return p.featuredImage ? p.featuredImage.url : null;
        }).filter(Boolean);
        return cacheImagesSequential(imageUrls, errors);
      }).then(function() {
        // Checkpoint cursor after images cached — preserves resume point on failure
        cursor = pageInfo.endCursor;
        return dbPut('sync_meta', { key: 'currentCursor', value: cursor });
      }).then(function() {
        // Checkpoint page progress
        return dbPut('sync_meta', { key: 'pagesComplete', value: pageNum });
      }).then(function() {
        // Fire progress callback if provided
        if (onProgress) {
          onProgress({ page: pageNum, products: totalProducts, newProducts: newProducts });
        }

        if (pageInfo.hasNextPage) {
          // Recurse to next page
          return fetchNext();
        }

        // All pages done — write final metadata and clear resume checkpoint
        return dbPut('sync_meta', { key: 'lastSyncAt', value: new Date().toISOString() })
          .then(function() {
            return dbPut('sync_meta', { key: 'productCount', value: totalProducts });
          })
          .then(function() {
            // Clear cursor checkpoint — sync completed successfully, no resume needed
            return dbPut('sync_meta', { key: 'currentCursor', value: null });
          })
          .then(function() {
            // Clear page progress checkpoint
            return dbPut('sync_meta', { key: 'pagesComplete', value: null });
          })
          .then(function() {
            return { total: totalProducts, newProducts: newProducts, errors: errors };
          });
      });
    });
  }

  // Check for interrupted sync — resume from saved cursor if present
  return dbGet('sync_meta', 'currentCursor').then(function(saved) {
    cursor = (saved && saved.value) ? saved.value : null;
    return dbGet('sync_meta', 'pagesComplete');
  }).then(function(savedPages) {
    pageNum = (savedPages && savedPages.value) ? savedPages.value : 0;
    return fetchNext();
  }).catch(function(err) {
    // Fatal error — do NOT clear cursor checkpoint (preserves resume point for next attempt)
    return {
      total: totalProducts,
      newProducts: newProducts,
      errors: errors,
      aborted: true,
      abortReason: err.message
    };
  });
}

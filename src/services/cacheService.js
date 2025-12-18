// src/services/cacheService.js
const NodeCache = require('node-cache');

// Default TTL: 5 minutes (300 seconds), check for expired keys every 60 seconds
const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: true
});

/**
 * Get a value from the cache.
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
function get(key) {
    return cache.get(key);
}

/**
 * Set a value in the cache.
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} [ttl] - Optional TTL in seconds (overrides default)
 * @returns {boolean} True if successful
 */
function set(key, value, ttl) {
    if (ttl !== undefined) {
        return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
}

/**
 * Delete a key from the cache.
 * @param {string} key - Cache key
 * @returns {number} Number of deleted keys
 */
function del(key) {
    return cache.del(key);
}

/**
 * Flush all cached data.
 */
function flush() {
    cache.flushAll();
}

/**
 * Get or fetch: Returns cached value if exists, otherwise calls fetchFn, caches result, and returns it.
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to call if cache miss
 * @param {number} [ttl] - Optional TTL in seconds
 * @returns {Promise<*>} Cached or fetched value
 */
async function getOrFetch(key, fetchFn, ttl) {
    let value = cache.get(key);
    if (value !== undefined) {
        return value;
    }
    value = await fetchFn();
    if (ttl !== undefined) {
        cache.set(key, value, ttl);
    } else {
        cache.set(key, value);
    }
    return value;
}

/**
 * Get cache stats.
 * @returns {object} Cache statistics
 */
function getStats() {
    return cache.getStats();
}

module.exports = {
    get,
    set,
    del,
    flush,
    getOrFetch,
    getStats
};

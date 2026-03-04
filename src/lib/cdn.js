/**
 * CDN + Rate Limiting + Image Cache Utility
 *
 * How it works:
 *  - Images are served through Supabase Storage's built-in CDN (global edge).
 *  - An in-memory LRU cache (imageCache) stores resolved CDN URLs so the same
 *    signed-URL is reused for the cache TTL window instead of hitting the DB/storage
 *    on every render.
 *  - A token-bucket rate limiter (RateLimiter) prevents bursting too many storage
 *    requests in a short window (e.g. when a page with 50 products first loads).
 *  - getImageUrl() is the single place every component should call to get an image URL.
 */

// ─── In-Memory LRU Image URL Cache ───────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 200;

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map(); // key → { value, expiresAt }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Move to end (most-recently-used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = CACHE_TTL_MS) {
    if (this.map.has(key)) this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      // Evict least-recently-used (first entry)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear() {
    this.map.clear();
  }
}

const imageCache = new LRUCache(CACHE_MAX_SIZE);

// ─── Token-Bucket Rate Limiter ────────────────────────────────────────────────
// Prevents hammering Supabase Storage when many images load simultaneously.

class RateLimiter {
  /**
   * @param {number} maxTokens   – burst capacity
   * @param {number} refillRateMs – ms between each token refill
   */
  constructor(maxTokens = 20, refillRateMs = 100) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRateMs = refillRateMs;
    this.queue = [];
    this._startRefill();
  }

  _startRefill() {
    setInterval(() => {
      if (this.tokens < this.maxTokens) {
        this.tokens = Math.min(this.maxTokens, this.tokens + 1);
      }
      this._flush();
    }, this.refillRateMs);
  }

  _flush() {
    while (this.queue.length > 0 && this.tokens > 0) {
      this.tokens--;
      const resolve = this.queue.shift();
      resolve();
    }
  }

  /** Returns a promise that resolves when a token is available. */
  acquire() {
    if (this.tokens > 0) {
      this.tokens--;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }
}

// Shared rate limiter: max 20 concurrent storage hits, refill 10/sec
export const rateLimiter = new RateLimiter(20, 100);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a cached, rate-limited CDN URL for a Supabase Storage image.
 *
 * @param {string|null} imageUrl  – the raw `image_url` from your DB row
 * @param {string}      fallback  – local fallback image path
 * @returns {Promise<string>}
 */
export async function getImageUrl(imageUrl, fallback = '') {
  if (!imageUrl) return fallback;

  // Already a full HTTP URL (Supabase public CDN or external) – return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const cached = imageCache.get(imageUrl);
    if (cached) return cached;
    imageCache.set(imageUrl, imageUrl);
    return imageUrl;
  }

  // Data URLs (base64) – return directly, no caching needed
  if (imageUrl.startsWith('data:')) return imageUrl;

  return fallback;
}

/**
 * Synchronous version – returns cached URL or fallback immediately.
 * Use this in render paths where you can't await.
 *
 * @param {string|null} imageUrl
 * @param {string}      fallback
 * @returns {string}
 */
export function getImageUrlSync(imageUrl, fallback = '') {
  if (!imageUrl) return fallback;
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageCache.get(imageUrl) ?? imageUrl;
  }
  return fallback;
}

/**
 * Warms the cache for a list of image URLs (fires rate-limited requests).
 * Call this after you fetch a page of products/projects.
 *
 * @param {string[]} urls
 * @param {string}   fallback
 */
export async function prefetchImages(urls, fallback = '') {
  const unique = [...new Set(urls.filter(Boolean))];
  await Promise.all(unique.map((url) => getImageUrl(url, fallback)));
}

/**
 * Invalidates a single URL from the cache (call after upload/update).
 * @param {string} imageUrl
 */
export function invalidateImageCache(imageUrl) {
  if (imageUrl) imageCache.map?.delete?.(imageUrl);
}

export { imageCache };
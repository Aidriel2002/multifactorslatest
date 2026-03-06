// ─── Cache Utility ────────────────────────────────────────────────────────────
// Save this as: src/utils/taskCache.js

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const cacheGet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const cacheSet = (key, data, ttlMs = CACHE_TTL_MS) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      expiresAt: Date.now() + ttlMs
    }));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
};

export const cacheInvalidate = (...keys) => {
  keys.forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
};

export const cacheInvalidatePrefix = (prefix) => {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
};
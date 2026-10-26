/**
 * Small localStorage cache used for offline PWA fallbacks.
 * Values are namespaced and timestamped; corrupt entries are ignored.
 */

const PREFIX = 'meetcitad:'

export function cacheSet(key, value) {
  try {
    localStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify({ savedAt: Date.now(), value })
    )
    return true
  } catch {
    // Quota errors should never break the UI.
    return false
  }
}

export function cacheGet(key, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null

    const entry = JSON.parse(raw)
    if (!entry || typeof entry !== 'object') return null

    if (maxAgeMs && Date.now() - entry.savedAt > maxAgeMs) {
      localStorage.removeItem(`${PREFIX}${key}`)
      return null
    }

    return entry
  } catch {
    return null
  }
}

export function cacheRemove(key) {
  try {
    localStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    // ignore
  }
}

export function cacheClear() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage may be unavailable; session cleanup must still complete.
  }
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

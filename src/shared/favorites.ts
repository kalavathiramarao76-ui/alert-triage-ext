/**
 * Favorites system — CRUD via chrome.storage.local
 * Max 50 items. Each favorite stores minimal metadata.
 */

export interface FavoriteItem {
  id: string;
  type: "alert" | "incident";
  title: string;
  priority?: string;
  category?: string;
  timestamp: number;
  /** Raw alert text or incident summary for quick reference */
  snippet: string;
}

const STORAGE_KEY = "triageflow-favorites";
const MAX_FAVORITES = 50;

/** Get all favorites */
export async function getFavorites(): Promise<FavoriteItem[]> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(STORAGE_KEY, (data) => {
        resolve(data[STORAGE_KEY] || []);
      });
    } catch {
      // Fallback to localStorage in dev
      const raw = localStorage.getItem(STORAGE_KEY);
      resolve(raw ? JSON.parse(raw) : []);
    }
  });
}

/** Add a favorite (deduplicates by id, enforces max 50) */
export async function addFavorite(item: FavoriteItem): Promise<FavoriteItem[]> {
  const current = await getFavorites();
  // Deduplicate
  const filtered = current.filter((f) => f.id !== item.id);
  // Prepend new item, cap at MAX
  const updated = [item, ...filtered].slice(0, MAX_FAVORITES);
  await saveFavorites(updated);
  return updated;
}

/** Remove a favorite by id */
export async function removeFavorite(id: string): Promise<FavoriteItem[]> {
  const current = await getFavorites();
  const updated = current.filter((f) => f.id !== id);
  await saveFavorites(updated);
  return updated;
}

/** Check if an item is favorited */
export async function isFavorited(id: string): Promise<boolean> {
  const current = await getFavorites();
  return current.some((f) => f.id === id);
}

/** Toggle favorite — returns new state (true = now favorited) */
export async function toggleFavorite(item: FavoriteItem): Promise<boolean> {
  const exists = await isFavorited(item.id);
  if (exists) {
    await removeFavorite(item.id);
    return false;
  } else {
    await addFavorite(item);
    return true;
  }
}

/** Get favorites count */
export async function getFavoritesCount(): Promise<number> {
  const current = await getFavorites();
  return current.length;
}

/** Clear all favorites */
export async function clearFavorites(): Promise<void> {
  await saveFavorites([]);
}

/** Internal: persist to storage */
async function saveFavorites(items: FavoriteItem[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: items }, () => resolve());
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      resolve();
    }
  });
}

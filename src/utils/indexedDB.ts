// Utility helpers for IndexedDB operations used across ryOS

const DB_NAME = "ryOS";
const DB_VERSION = 4;

export const STORES = {
  DOCUMENTS: "documents",
  IMAGES: "images",
  TRASH: "trash",
  CUSTOM_WALLPAPERS: "custom_wallpapers",
} as const;

/**
 * Open (or create) the ryOS IndexedDB database and ensure all required
 * object stores exist.  Returns a ready-to-use IDBDatabase instance.
 */
export const ensureIndexedDBInitialized = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      // Verify stores exist; if any are missing trigger an upgrade
      const missingStores = Object.values(STORES).filter(
        (store) => !db.objectStoreNames.contains(store)
      );
      if (missingStores.length === 0) {
        return resolve(db);
      }
      db.close();

      const upgradeReq = indexedDB.open(DB_NAME, DB_VERSION + 1);
      upgradeReq.onerror = () => reject(upgradeReq.error);
      upgradeReq.onupgradeneeded = (evt) => {
        const upgradeDb = (evt.target as IDBOpenDBRequest).result;
        missingStores.forEach((store) => {
          if (!upgradeDb.objectStoreNames.contains(store)) {
            upgradeDb.createObjectStore(store, { keyPath: "name" });
          }
        });
      };
      upgradeReq.onsuccess = () => resolve(upgradeReq.result);
    };

    request.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "name" });
        }
      });
    };
  });
}; 
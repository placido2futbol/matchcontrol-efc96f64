// Local (per-device) storage for lineup announcement audio: AI cache + manual recordings.
const DB_NAME = 'mc-lineup-audio';
const STORES = ['generated', 'recordings'] as const;
type Store = typeof STORES[number];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => STORES.forEach(s => { if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => { db.close(); resolve(r.result as T); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export const getAudio = (store: Store, key: string) => tx<Blob | undefined>(store, 'readonly', s => s.get(key));
export const putAudio = (store: Store, key: string, blob: Blob) => tx<void>(store, 'readwrite', s => s.put(blob, key));
export const deleteAudio = (store: Store, key: string) => tx<void>(store, 'readwrite', s => s.delete(key));

export async function audioCacheKey(voice: string, style: string, text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${voice}|${style}|${text}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

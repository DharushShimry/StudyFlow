// IndexedDB-backed storage for the Media Player library (videos, audio, & images).
// IndexedDB is used instead of localStorage because media files can be very
// large (hundreds of MB) while localStorage is capped at ~5 MB per origin.
//
// Multi-user: every account gets its own database (`studyflow-media-<user>`)
// so each user's media library stays private to their account.

import { currentUserName, normalizeUser } from './userScope';
import { genId } from './personalStore';

export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  type: string; // MIME type, e.g. "video/mp4"
  size: number;
  addedAt: string;
  kind: MediaKind;
  duration?: number; // seconds, filled in once metadata is known
  favorite?: boolean; // starred in the media library
  order?: number; // playlist position (drag-to-reorder)
  lastPosition?: number; // seconds, for resuming playback
  lastPlayedAt?: string; // ISO timestamp of the most recent play
  plays?: number; // total times played
}

interface MediaRecord extends MediaItem {
  blob: Blob;
}

const DB_PREFIX = 'studyflow-media';
// Old database base name — a one-time migration below copies any existing
// `studyspace-media-*` databases over so no one loses their library.
const LEGACY_DB = 'studyspace-media';
const DB_VERSION = 1;
const STORE = 'media';
const MIGRATED_FLAG = 'ss-media-db-renamed';

export { genId };

function dbNameFor(user: string): string {
  const u = normalizeUser(user);
  return u ? `${DB_PREFIX}-${u}` : DB_PREFIX;
}

function getAllRecords(db: IDBDatabase): Promise<MediaRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as MediaRecord[]);
    req.onerror = () => reject(req.error);
  });
}

function copyDb(fromName: string, toName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    openDb(fromName).then(from => {
      getAllRecords(from)
        .then(records => {
          if (records.length === 0) { from.close(); resolve(); return; }
          openDb(toName).then(to => {
            const tx = to.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            for (const rec of records) store.put(rec);
            tx.oncomplete = () => { to.close(); from.close(); resolve(); };
            tx.onerror = () => { to.close(); from.close(); reject(tx.error); };
          }).catch(err => { from.close(); reject(err); });
        })
        .catch(err => { from.close(); reject(err); });
    }).catch(reject);
  });
}

/** One-time rename of the old `studyspace-media*` databases to `studyflow-media*`. */
async function migrateLegacyDbNames(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        const name = db.name;
        if (!name) continue;
        const m = /^studyspace-media(?:-(.+))?$/.exec(name);
        if (m) await copyDb(name, m[1] ? `${DB_PREFIX}-${m[1]}` : DB_PREFIX);
      }
    } else {
      // Older engines can't enumerate — migrate just this account's database.
      const user = currentUserName();
      await copyDb(`${LEGACY_DB}${user ? '-' + normalizeUser(user) : ''}`, dbNameFor(user));
    }
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    // Best-effort — existing data is left untouched.
  }
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openUserDb(): Promise<IDBDatabase> {
  const user = currentUserName();
  await migrateLegacyDbNames();
  return openDb(dbNameFor(user));
}

export async function listMedia(): Promise<MediaItem[]> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const recs = req.result as MediaRecord[];
      // Strip blobs so callers only deal with metadata.
      resolve(recs.map(({ blob: _blob, ...meta }) => meta));
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function addMedia(item: MediaItem, blob: Blob): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...item, blob } as MediaRecord);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      const rec = req.result as MediaRecord | undefined;
      resolve(rec?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Updates metadata (e.g. duration) of an existing record, keeping its blob. */
export async function updateMedia(item: MediaItem): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(item.id);
    getReq.onsuccess = () => {
      const rec = getReq.result as MediaRecord | undefined;
      if (rec) store.put({ ...rec, ...item });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearMedia(): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

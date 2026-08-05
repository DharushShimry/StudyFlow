// IndexedDB-backed storage for personal items (Logo, Signature, National Identity Card).
// IndexedDB is used instead of localStorage because personal files can be large
// (e.g. a scanned NIC image) and localStorage is capped at ~5 MB per origin.
//
// Multi-user: every account gets its own database (`studyflow-personal-<user>`)
// so each user's documents stay private. A one-time migration copies records
// from the legacy shared database into the account that signs in first, so the
// original owner keeps their uploads while new accounts start fresh.

import { currentUserName, normalizeUser } from './userScope';

export type PersonalSlot = 'logo' | 'signature' | 'nic';

export interface PersonalItem {
  id: string;
  slot: PersonalSlot;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface PersonalRecord extends PersonalItem {
  blob: Blob;
}

const DB_PREFIX = 'studyflow-personal';
// Old database base name — a one-time migration below copies any existing
// `studyspace-personal-*` databases over so no one loses their documents.
const LEGACY_DB = 'studyspace-personal';
const DB_VERSION = 1;
const STORE = 'items';
const MIGRATED_FLAG = 'ss-personal-migrated';
const DB_RENAMED_FLAG = 'ss-personal-db-renamed';

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function dbNameFor(user: string): string {
  const u = normalizeUser(user);
  return u ? `${DB_PREFIX}-${u}` : DB_PREFIX;
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('slot', 'slot', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllRecords(db: IDBDatabase): Promise<PersonalRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PersonalRecord[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
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

/**
 * One-time rename of the old `studyspace-personal*` databases to
 * `studyflow-personal*`. Runs before any read/write so no data is lost.
 */
async function migrateLegacyDbNames(): Promise<void> {
  try {
    if (localStorage.getItem(DB_RENAMED_FLAG)) return;
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        const name = db.name;
        if (!name) continue;
        const m = /^studyspace-personal(?:-(.+))?$/.exec(name);
        if (m) await copyDb(name, m[1] ? `${DB_PREFIX}-${m[1]}` : DB_PREFIX);
      }
    } else {
      // Older engines can't enumerate — migrate just this account's database.
      const user = currentUserName();
      await copyDb(`${LEGACY_DB}${user ? '-' + normalizeUser(user) : ''}`, dbNameFor(user));
    }
    localStorage.setItem(DB_RENAMED_FLAG, '1');
  } catch {
    // Best-effort — existing data is left untouched.
  }
}

/**
 * Copies the legacy shared database into this user's own database once
 * (guarded by a flag) so the original owner keeps their uploads while
 * newly registered accounts start empty.
 */
async function migrateLegacyPersonal(user: string): Promise<void> {
  if (!user) return;
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    const legacyDb = await openDb(LEGACY_DB);
    const records = await getAllRecords(legacyDb);
    if (records.length === 0) {
      // Nothing to migrate — mark it done so we don't re-scan every call.
      localStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }
    const userDb = await openDb(dbNameFor(user));
    await new Promise<void>((resolve, reject) => {
      const tx = userDb.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const rec of records) store.put(rec);
      tx.oncomplete = () => { userDb.close(); resolve(); };
      tx.onerror = () => { userDb.close(); reject(tx.error); };
    });
    localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    // Migration failed — leave data as-is.
  }
}

async function openUserDb(): Promise<IDBDatabase> {
  const user = currentUserName();
  // Copy the legacy SHARED database into this account's database first, then
  // rename any remaining `studyspace-*` databases — order matters, otherwise
  // the shared data would be copied to the no-user database and lost.
  await migrateLegacyPersonal(user);
  await migrateLegacyDbNames();
  return openDb(dbNameFor(user));
}

export async function listItems(slot?: PersonalSlot): Promise<PersonalItem[]> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = slot ? store.index('slot').getAll(slot) : store.getAll();
    req.onsuccess = () => resolve(req.result as PersonalItem[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function addItem(item: PersonalItem, blob: Blob): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...item, blob } as PersonalRecord);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getItemBlob(id: string): Promise<Blob | null> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      const rec = req.result as PersonalRecord | undefined;
      resolve(rec?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteItem(id: string): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearSlot(slot: PersonalSlot): Promise<void> {
  const db = await openUserDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const index = tx.objectStore(STORE).index('slot');
    const req = index.openCursor(slot);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Called when the Personal Space page loads. Runs the one-time legacy migration
 * so the original owner's documents appear in their own database.
 */
export async function ensurePersonalSpace(): Promise<void> {
  await migrateLegacyPersonal(currentUserName());
}

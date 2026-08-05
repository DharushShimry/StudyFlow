// Per-user storage scoping helpers.
//
// Before multi-user support every piece of data was stored under a small set of
// shared keys (ss-notes, ss-class-sessions, ...) and one shared IndexedDB, so
// every visitor saw the same content. Now every account gets its own namespace:
//   localStorage: ss:<username>:<data-key>
//   IndexedDB:    studyflow-personal-<username>
//
// A one-time migration copies the legacy shared data into the namespace of the
// account that is signed in when the app first runs after this update, so the
// original owner keeps all their timetables, notes and files while newly
// registered accounts start completely fresh.

const SESSION_KEY = 'ss-session';
const MIGRATED_FLAG = 'ss-user-data-migrated';

/** Currently signed-in username (from the persisted session), or ''. */
export function currentUserName(): string {
  try {
    return localStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

/** Lowercased, trimmed username — safe for use inside storage keys. */
export function normalizeUser(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Per-user storage key. Falls back to the legacy shared key when no user is
 * signed in, so nothing breaks in edge cases.
 */
export function scopedKey(name: string, user?: string): string {
  const u = (user ?? currentUserName()).trim();
  return u ? `ss:${normalizeUser(u)}:${name}` : `ss-${name}`;
}

// legacy shared key -> scoped key name
const LEGACY_KEYS: Array<[string, string]> = [
  ['ss-class-sessions', 'class-sessions'],
  ['ss-school-periods', 'school-periods'],
  ['ss-notes', 'notes'],
  ['ss-files', 'files'],
  ['ss-pomodoro-sessions', 'pomodoro-sessions'],
  ['ss-revision-plans', 'revision-plans'],
  ['ss-gemini-key', 'gemini-key'],
];

/**
 * One-time copy of the legacy shared keys into this account's namespace.
 * Runs at most once per browser (guarded by a flag) so the original owner
 * keeps their existing data while other accounts stay fresh.
 */
/** Removes every localStorage key belonging to a user (used when deleting an account). */
export function clearUserData(user: string): void {
  try {
    const u = normalizeUser(user);
    const prefix = `ss:${u}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(`ss:welcome-pending:${u}`);
    // IPTV favourites/recents use a different key format — remove them too.
    localStorage.removeItem(`ss-iptv-favs-${u}`);
    localStorage.removeItem(`ss-iptv-recents-${u}`);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/** Best-effort removal of a user's IndexedDB databases (media / personal stores). */
export async function clearUserDatabases(user: string): Promise<void> {
  const suffix = normalizeUser(user);
  if (!suffix) return;
  try {
    if (typeof indexedDB.databases !== 'function') return;
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs
        .filter(d => d.name && d.name.includes(`-${suffix}`))
        .map(d => new Promise<void>(resolve => {
          const req = indexedDB.deleteDatabase(d.name as string);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        })),
    );
  } catch {
    // Ignore — deletion is best-effort.
  }
}

export function migrateLegacyData(user: string): void {
  if (!user) return;
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    let copied = false;
    for (const [legacy, name] of LEGACY_KEYS) {
      const raw = localStorage.getItem(legacy);
      if (raw === null) continue;
      const target = scopedKey(name, user);
      if (localStorage.getItem(target) === null) {
        localStorage.setItem(target, raw);
        copied = true;
      }
    }
    if (copied) localStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    // Storage unavailable — keep data as-is.
  }
}

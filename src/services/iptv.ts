// IPTV service backed by the iptv-org/iptv project (https://github.com/iptv-org/iptv).
// It aggregates publicly available live TV streams and serves CORS-enabled
// M3U playlists + JSON metadata from https://iptv-org.github.io.

export interface IptvChannel {
  id: string; // unique per name+url
  name: string;
  url: string;
  logo: string;
  category: string; // group-title from the playlist
  tvgId: string;
}

export interface IptvCountry {
  name: string;
  code: string;
  flag: string;
}

export interface IptvCategory {
  id: string;
  name: string;
}

const BASE = 'https://iptv-org.github.io';

export const PLAYLIST_URLS = {
  all: `${BASE}/iptv/index.m3u`,
  country: (code: string) => `${BASE}/iptv/countries/${code.toLowerCase()}.m3u`,
  category: (id: string) => `${BASE}/iptv/categories/${id}.m3u`,
};

const COUNTRY_LIST_URL = `${BASE}/api/countries.json`;
const CATEGORY_LIST_URL = `${BASE}/api/categories.json`;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ---------- M3U parsing ----------
export function parseM3U(text: string): IptvChannel[] {
  const lines = text.split(/\r?\n/);
  const channels: IptvChannel[] = [];
  const seen = new Set<string>();
  let pending: { name: string; logo: string; category: string; tvgId: string } | null = null;

  const push = (url: string) => {
    if (!pending) return;
    const name = pending.name.trim();
    if (!name || !/^https?:\/\//i.test(url)) return;
    if (pending.category.toLowerCase() === 'xxx') return; // never surface adult channels
    const key = `${name}\u0000${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    channels.push({ id: key, name, url, logo: pending.logo, category: pending.category, tvgId: pending.tvgId });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const afterColon = line.slice(line.indexOf(':') + 1);
      const comma = afterColon.lastIndexOf(',');
      const attrs = comma >= 0 ? afterColon.slice(0, comma) : afterColon;
      const name = comma >= 0 ? afterColon.slice(comma + 1) : '';
      pending = {
        name,
        logo: /tvg-logo="([^"]*)"/.exec(attrs)?.[1] ?? '',
        category: /group-title="([^"]*)"/.exec(attrs)?.[1] ?? '',
        tvgId: /tvg-id="([^"]*)"/.exec(attrs)?.[1] ?? '',
      };
    } else if (line.startsWith('#')) {
      continue; // other directives (#EXTVLCOPT, #EXTGRP, …)
    } else if (pending) {
      push(line);
      pending = null;
    }
  }
  return channels;
}

// ---------- IndexedDB cache (playlist text only — stream URLs change often) ----------
const DB_NAME = 'studyflow-iptv';
const STORE = 'cache';
const DB_VERSION = 1;

interface CachedDoc {
  key: string;
  text: string;
  fetchedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCached(key: string): Promise<CachedDoc | null> {
  try {
    const db = await openDb();
    return await new Promise<CachedDoc | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CachedDoc | undefined) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function setCached(key: string, text: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, text, fetchedAt: Date.now() } as CachedDoc);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    /* cache is best-effort */
  }
}

async function clearCached(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    /* ignore */
  }
}

// ---------- Fetching ----------
async function fetchTextWithProgress(url: string, onProgress?: (loaded: number, total: number) => void): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Playlist request failed (${res.status})`);
  const total = Number(res.headers.get('Content-Length') ?? 0);
  if (!res.body || !onProgress || total === 0) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    loaded += value.byteLength;
    onProgress(loaded, total);
  }
  text += decoder.decode();
  return text;
}

export interface PlaylistResult {
  channels: IptvChannel[];
  cached: boolean; // true when served from the local IndexedDB cache
}

/** Loads a playlist (index, country or category), cached in IndexedDB for 6 h. */
export async function getPlaylist(
  url: string,
  opts: { force?: boolean; onProgress?: (loaded: number, total: number) => void } = {},
): Promise<PlaylistResult> {
  if (!opts.force) {
    const cached = await getCached(url);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { channels: parseM3U(cached.text), cached: true };
    }
  }
  const text = await fetchTextWithProgress(url, opts.onProgress);
  await setCached(url, text);
  return { channels: parseM3U(text), cached: false };
}

/** Force a refresh by discarding the cached playlist first. */
export async function refreshPlaylist(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PlaylistResult> {
  await clearCached(url);
  return getPlaylist(url, { force: true, onProgress });
}

// ---------- Metadata (countries & categories) ----------
const jsonCache = new Map<string, Promise<unknown>>();

function fetchJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    const p = fetch(url).then(res => {
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json() as T;
    }).catch(err => {
      // Don't cache failures — allow a later retry.
      jsonCache.delete(url);
      throw err;
    });
    jsonCache.set(url, p);
  }
  return jsonCache.get(url) as Promise<T>;
}

export function getCountries(): Promise<IptvCountry[]> {
  return fetchJson<IptvCountry[]>(COUNTRY_LIST_URL);
}

const ADULT_CATEGORY_IDS = new Set(['xxx']);

/** Categories for the browser — adult (XXX) categories are never surfaced. */
export async function getCategories(): Promise<IptvCategory[]> {
  const list = await fetchJson<IptvCategory[]>(CATEGORY_LIST_URL);
  return list.filter(c => !ADULT_CATEGORY_IDS.has(c.id.toLowerCase()) && c.name.toLowerCase() !== 'xxx');
}

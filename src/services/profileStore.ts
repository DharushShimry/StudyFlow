// Per-user profile storage (avatar, fallback color, display name, bio).
// Profiles are kept small — avatars are downscaled to a data URL before saving —
// so everything fits comfortably in localStorage alongside the other app data.
import { useState, useEffect } from 'react';
import { scopedKey, currentUserName } from './userScope';

export interface UserProfile {
  avatar?: string; // small data URL (downscaled image)
  avatarColor?: string; // gradient id used for the initials fallback
  displayName?: string;
  bio?: string;
}

export const AVATAR_GRADIENTS: Array<{ id: string; gradient: string }> = [
  { id: 'violet', gradient: 'from-violet-500 to-indigo-600' },
  { id: 'blue', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'amber', gradient: 'from-amber-500 to-orange-600' },
  { id: 'rose', gradient: 'from-rose-500 to-pink-600' },
  { id: 'fuchsia', gradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'sky', gradient: 'from-sky-500 to-blue-600' },
  { id: 'lime', gradient: 'from-lime-500 to-green-600' },
];

const UPDATED_EVENT = 'ss-profile-updated';

export function profileKey(user?: string): string {
  return scopedKey('profile', user ?? currentUserName());
}

export function getProfile(user?: string): UserProfile {
  try {
    const raw = localStorage.getItem(profileKey(user));
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {
    /* ignore */
  }
  return {};
}

/** Removes the profile for a user entirely (used when deleting an account). */
export function clearProfile(user?: string): void {
  try {
    localStorage.removeItem(profileKey(user));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
}

/** Saves a partial profile update and notifies other components listening via useProfile. */
export function saveProfile(partial: Partial<UserProfile>, user?: string): UserProfile {
  const merged = { ...getProfile(user), ...partial };
  try {
    localStorage.setItem(profileKey(user), JSON.stringify(merged));
  } catch {
    /* storage unavailable or full — keep in-memory value */
  }
  window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
  return merged;
}

/** Deterministically picks a fallback gradient from a name so it stays stable. */
export function avatarColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length].id;
}

export function gradientFor(colorId?: string): string {
  return AVATAR_GRADIENTS.find(g => g.id === colorId)?.gradient ?? AVATAR_GRADIENTS[0].gradient;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = (parts[0][0] ?? '').toUpperCase();
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '').toUpperCase() : '';
  return last || first;
}

/** Reactive hook: re-reads the profile whenever it changes (same tab or another). */
export function useProfile(user?: string): UserProfile {
  const u = user ?? currentUserName();
  const [profile, setProfile] = useState<UserProfile>(() => getProfile(u));

  useEffect(() => {
    const update = () => setProfile(getProfile(u));
    window.addEventListener(UPDATED_EVENT, update);
    window.addEventListener('storage', update);
    // Refresh immediately too — covers login/logout/account switches where the
    // hook stays mounted but the underlying profile key changes.
    update();
    return () => {
      window.removeEventListener(UPDATED_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, [u]);

  return profile;
}

/** Reads an image file and returns a downscaled data URL (max `maxSize` px on the longest side). */
export async function resizeAvatar(file: File, maxSize = 256): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not supported in this browser.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      // Prefer WebP (small + transparency); fall back to JPEG.
      let out = canvas.toDataURL('image/webp', 0.85);
      if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', 0.85);
      resolve(out);
    };
    img.onerror = () => reject(new Error('Could not load that image.'));
    img.src = dataUrl;
  });
}

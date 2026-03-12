/**
 * useMutedUsers — manage a local list of muted pubkeys.
 * Stored in localStorage so it persists across sessions.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'muted-pubkeys';

function getMuted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveMuted(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useMutedUsers() {
  const [mutedPubkeys, setMutedPubkeys] = useState<string[]>(getMuted);

  const mute = useCallback((pubkey: string) => {
    setMutedPubkeys((prev) => {
      if (prev.includes(pubkey)) return prev;
      const next = [...prev, pubkey];
      saveMuted(next);
      return next;
    });
  }, []);

  const unmute = useCallback((pubkey: string) => {
    setMutedPubkeys((prev) => {
      const next = prev.filter((p) => p !== pubkey);
      saveMuted(next);
      return next;
    });
  }, []);

  const isMuted = useCallback(
    (pubkey: string) => mutedPubkeys.includes(pubkey),
    [mutedPubkeys]
  );

  return { mutedPubkeys, mute, unmute, isMuted };
}

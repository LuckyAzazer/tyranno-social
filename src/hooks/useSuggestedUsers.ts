/**
 * useSuggestedUsers — surface active users the current user isn't following yet.
 *
 * Strategy:
 *  1. Fetch recent kind-1 events
 *  2. Count unique posts per author
 *  3. Filter out the current user and anyone they already follow
 *  4. Return top N by post count (a rough proxy for activity)
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export interface SuggestedUser {
  pubkey: string;
  postCount: number;
}

export function useSuggestedUsers(limit = 5) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // Fetch following list for current user
  const followQuery = useQuery({
    queryKey: ['contact-list', user?.pubkey, 'for-suggestions'],
    queryFn: async () => {
      if (!user?.pubkey) return new Set<string>();
      const events = await nostr.query([
        { kinds: [3], authors: [user.pubkey], limit: 1 },
      ]);
      if (!events[0]) return new Set<string>();
      return new Set(
        events[0].tags
          .filter(([t]) => t === 'p')
          .map(([, pk]) => pk)
      );
    },
    enabled: !!user?.pubkey,
    staleTime: 60_000,
  });

  return useQuery({
    queryKey: ['suggested-users', user?.pubkey, limit],
    queryFn: async () => {
      const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 3; // last 3 days

      const events = await nostr.query([
        { kinds: [1], since, limit: 300 },
      ]);

      const following = followQuery.data ?? new Set<string>();

      // Count posts per author
      const counts = new Map<string, number>();
      for (const e of events) {
        if (e.pubkey === user?.pubkey) continue;
        if (following.has(e.pubkey)) continue;
        counts.set(e.pubkey, (counts.get(e.pubkey) ?? 0) + 1);
      }

      const sorted: SuggestedUser[] = Array.from(counts.entries())
        .map(([pubkey, postCount]) => ({ pubkey, postCount }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, limit);

      return sorted;
    },
    enabled: followQuery.isFetched,
    staleTime: 5 * 60_000,
  });
}

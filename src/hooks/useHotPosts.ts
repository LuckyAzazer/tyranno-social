/**
 * useHotPosts — surfaces trending posts ranked by engagement score.
 *
 * Score = reactions + (reposts × 2) + (zaps × 3) in the last 48 hours.
 * Fetches kind-1 posts, then queries reactions/reposts/zaps for those events
 * in a single combined query to minimise relay load.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

export interface HotPost {
  event: NostrEvent;
  score: number;
  reactionCount: number;
  repostCount: number;
  zapCount: number;
}

export function useHotPosts(limit = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['hot-posts', limit],
    queryFn: async (): Promise<HotPost[]> => {
      const since = Math.floor(Date.now() / 1000) - 60 * 60 * 48; // 48 hours

      // 1. Fetch recent kind-1 posts (exclude replies)
      const posts = await nostr.query([{ kinds: [1], since, limit: 200 }]);
      const topPosts = posts.filter(
        (e) => !e.tags.some(([t]) => t === 'e') // not a reply
      );

      if (topPosts.length === 0) return [];

      const eventIds = topPosts.map((e) => e.id);

      // 2. Fetch reactions, reposts and zap receipts in one combined query
      const engagements = await nostr.query([
        { kinds: [7, 6, 16, 9735], '#e': eventIds, since, limit: 2000 },
      ]);

      // 3. Tally per event
      const reactionMap = new Map<string, number>();
      const repostMap = new Map<string, number>();
      const zapMap = new Map<string, number>();

      for (const e of engagements) {
        const eTag = e.tags.find(([t]) => t === 'e')?.[1];
        if (!eTag) continue;
        if (e.kind === 7) reactionMap.set(eTag, (reactionMap.get(eTag) ?? 0) + 1);
        if (e.kind === 6 || e.kind === 16) repostMap.set(eTag, (repostMap.get(eTag) ?? 0) + 1);
        if (e.kind === 9735) zapMap.set(eTag, (zapMap.get(eTag) ?? 0) + 1);
      }

      // 4. Score and sort
      const scored: HotPost[] = topPosts.map((event) => {
        const reactionCount = reactionMap.get(event.id) ?? 0;
        const repostCount = repostMap.get(event.id) ?? 0;
        const zapCount = zapMap.get(event.id) ?? 0;
        const score = reactionCount + repostCount * 2 + zapCount * 3;
        return { event, score, reactionCount, repostCount, zapCount };
      });

      return scored
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

/**
 * useTrendingHashtags — counts 't' tag usage in recent kind-1 events
 * to surface the most popular hashtags right now.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export interface TrendingHashtag {
  tag: string;
  count: number;
}

export function useTrendingHashtags(limit = 15) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['trending-hashtags', limit],
    queryFn: async () => {
      // Fetch recent kind-1 events from the last 24 hours
      const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24;

      const events = await nostr.query([
        {
          kinds: [1],
          since,
          limit: 500,
        },
      ]);

      // Count hashtag usage
      const counts = new Map<string, number>();

      for (const event of events) {
        for (const tag of event.tags) {
          if (tag[0] === 't' && tag[1]) {
            const hashtag = tag[1].toLowerCase().trim();
            // Skip very short or empty tags
            if (hashtag.length < 2) continue;
            counts.set(hashtag, (counts.get(hashtag) ?? 0) + 1);
          }
        }
      }

      // Sort by count descending
      const sorted: TrendingHashtag[] = Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return sorted;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    refetchInterval: 10 * 60 * 1000, // background refresh every 10 min
  });
}

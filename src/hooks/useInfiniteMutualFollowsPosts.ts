/**
 * useInfiniteMutualFollowsPosts
 *
 * An infinite-scroll feed that shows posts only from users who
 * mutually follow the current user (i.e. both sides follow each other).
 *
 * Mirrors the structure of useInfinitePosts but uses the mutual-follows
 * pubkey set as the `authors` filter instead of the full follow list.
 */

import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useMutualFollows } from '@/hooks/useMutualFollows';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { filterNSFWContent } from '@/lib/nsfwDetection';
import { filterEventsByTopic } from '@/lib/topicFilter';
import type { NostrEvent } from '@nostrify/nostrify';

const PAGE_SIZE = 100;

// All the kinds that can appear in the "following" feed
const FEED_KINDS = [1, 6, 16, 30023, 31337, 34235];

export function useInfiniteMutualFollowsPosts() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: mutualPubkeys = [], isLoading: isLoadingMutuals } = useMutualFollows();
  const { shouldFilter } = useNSFWFilter();

  return useInfiniteQuery({
    queryKey: [
      'posts-infinite-mutual-follows',
      user?.pubkey,
      mutualPubkeys.length,
      config.relayMetadata.updatedAt,
      shouldFilter,
      config.topicFilter,
    ],
    queryFn: async ({ pageParam }): Promise<NostrEvent[]> => {
      if (!user?.pubkey || mutualPubkeys.length === 0) {
        return [];
      }

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      const events = await relayGroup.query([
        {
          kinds: FEED_KINDS,
          authors: mutualPubkeys,
          limit: PAGE_SIZE,
          ...(pageParam ? { until: pageParam as number } : {}),
        },
      ]);

      // Strip replies (keep reposts)
      let filtered = events.filter((event) => {
        if (event.kind === 6 || event.kind === 16) return true;
        return !event.tags.some(([name]) => name === 'e');
      });

      // NSFW filter
      if (shouldFilter) {
        filtered = filterNSFWContent(filtered);
      }

      // Topic filter
      if (config.topicFilter) {
        filtered = filterEventsByTopic(filtered, config.topicFilter);
      }

      return filtered;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      return Math.min(...lastPage.map((e: NostrEvent) => e.created_at));
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!user?.pubkey && !isLoadingMutuals,
    staleTime: 60_000,
    gcTime: Infinity,
  });
}

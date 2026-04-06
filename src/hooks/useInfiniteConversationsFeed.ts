/**
 * useInfiniteConversationsFeed
 *
 * Shows posts that the people you follow are *replying to* — i.e. active
 * conversations your network is participating in.
 *
 * Strategy:
 *   1. Query kind 1 events from followed authors that contain an `e` tag
 *      (which marks them as replies). These are the replies your follows
 *      are writing.
 *   2. Keep the full reply event so the thread context (who they replied
 *      to, the content of the reply) is visible in the feed.
 *
 * This intentionally keeps replies rather than stripping them, which is
 * the opposite of the normal feed filter.
 */

import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useFollows } from '@/hooks/useFollows';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { filterNSFWContent } from '@/lib/nsfwDetection';
import { filterEventsByTopic } from '@/lib/topicFilter';
import type { NostrEvent } from '@nostrify/nostrify';

const PAGE_SIZE = 50; // Smaller first page for faster initial render

export function useInfiniteConversationsFeed() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [], isLoading: isLoadingFollows } = useFollows(user?.pubkey);
  const { shouldFilter } = useNSFWFilter();

  return useInfiniteQuery({
    queryKey: [
      'posts-infinite-conversations',
      user?.pubkey,
      followPubkeys.length,
      config.relayMetadata.updatedAt,
      shouldFilter,
      config.topicFilter,
    ],
    queryFn: async ({ pageParam }): Promise<NostrEvent[]> => {
      if (!user?.pubkey || followPubkeys.length === 0) {
        return [];
      }

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      // Query kind 1 replies from followed authors.
      // A reply is a kind 1 event that has at least one `e` tag referencing
      // the event being replied to.
      const events = await relayGroup.query([
        {
          kinds: [1],
          authors: followPubkeys,
          limit: PAGE_SIZE,
          ...(pageParam ? { until: pageParam as number } : {}),
        },
      ]);

      // Keep ONLY replies (events that have an `e` tag)
      let filtered = events.filter((event) =>
        event.tags.some(([name]) => name === 'e'),
      );

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
    enabled: !!user?.pubkey && !isLoadingFollows && followPubkeys.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

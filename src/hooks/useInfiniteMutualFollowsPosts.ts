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
import type { FeedCategory } from './usePosts';

const PAGE_SIZE = 100;

const categoryKinds: Record<FeedCategory, number[]> = {
  following: [1, 6, 16, 30023, 31337, 34235],
  text: [1, 6, 16],
  articles: [30023],
  photos: [1, 6, 16],
  music: [1, 6, 16, 31337],
  videos: [34235],
};

export function useInfiniteMutualFollowsPosts(category: FeedCategory = 'following') {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: mutualPubkeys = [], isLoading: isLoadingMutuals } = useMutualFollows();
  const { shouldFilter } = useNSFWFilter();

  return useInfiniteQuery({
    queryKey: [
      'posts-infinite-mutual-follows',
      category,
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

      const kinds = categoryKinds[category];

      const events = await relayGroup.query([
        {
          kinds,
          authors: mutualPubkeys,
          limit: PAGE_SIZE,
          ...(pageParam ? { until: pageParam as number } : {}),
        },
      ]);

      // For photos, filter kind 1 to only those with image URLs
      let filtered = events;
      if (category === 'photos') {
        filtered = events.filter((event) => {
          if (event.kind !== 1) return true;
          const hasImageUrl = /https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(event.content);
          const hasImetaTag = event.tags.some(([name]) => name === 'imeta');
          return hasImageUrl || hasImetaTag;
        });
      }

      // For music, filter kind 1 to only those with music content
      if (category === 'music') {
        filtered = events.filter((event) => {
          if (event.kind === 31337) return true;
          if (event.kind === 6 || event.kind === 16) return true;
          if (event.kind === 1) {
            const hasAudioUrl = /https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac|opus)/i.test(event.content);
            const hasSpotify = /spotify\.com\/(track|album|playlist|episode|show)/i.test(event.content);
            const hasSoundCloud = /soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/i.test(event.content);
            const hasZapstr = /zapstr\.live\/t\/naddr1[a-z0-9]+/i.test(event.content);
            const hasAudioImeta = event.tags.some(([name, ...values]) => {
              if (name !== 'imeta') return false;
              const mimeTag = values.find(v => v.startsWith('m ') || v.startsWith('type '));
              return mimeTag && /audio\//i.test(mimeTag);
            });
            return hasAudioUrl || hasSpotify || hasSoundCloud || hasZapstr || hasAudioImeta;
          }
          return false;
        });
      }

      // Strip replies (keep reposts)
      filtered = filtered.filter((event) => {
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

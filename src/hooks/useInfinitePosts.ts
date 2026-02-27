import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useFollows } from '@/hooks/useFollows';
import { filterNSFWContent } from '@/lib/nsfwDetection';
import type { NostrEvent } from '@nostrify/nostrify';
import type { FeedCategory } from './usePosts';

const categoryKinds: Record<FeedCategory, number[]> = {
  following: [1, 6, 16, 30023, 31337, 34235],
  text: [1, 6, 16],
  articles: [30023],
  photos: [1, 6, 16],
  music: [1, 6, 16, 31337],
  videos: [34235],
};

const PAGE_SIZE = 100; // Increased to ensure enough posts for all columns

export function useInfinitePosts(category: FeedCategory = 'following') {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);

  return useInfiniteQuery({
    queryKey: ['posts-infinite', category, user?.pubkey, config.relayMetadata.updatedAt, followPubkeys.length],
    queryFn: async ({ pageParam }) => {
      const kinds = categoryKinds[category];
      
      // Get relay URLs from user's configuration
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Create a relay group to query from user's relays
      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // Build the query with pagination
      const query = followPubkeys.length > 0
        ? {
            kinds,
            authors: followPubkeys,
            limit: PAGE_SIZE,
            ...(pageParam ? { until: pageParam } : {}),
          }
        : {
            kinds,
            limit: 20, // Reduced limit when no follows
            ...(pageParam ? { until: pageParam } : {}),
          };

      const events = await relayGroup.query([query]);

      // Filter logic based on category
      let filteredEvents = events;

      // For photos, filter text notes (kind 1) that have image URLs
      if (category === 'photos') {
        filteredEvents = events.filter((event) => {
          // Keep non-kind 1 events
          if (event.kind !== 1) return true;
          
          // Check for image URLs in content or imeta tags
          const hasImageUrl = /https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(event.content);
          const hasImetaTag = event.tags.some(([name]) => name === 'imeta');
          
          return hasImageUrl || hasImetaTag;
        });
      }

      // For music, filter text notes (kind 1) that have music URLs or keep kind 31337
      if (category === 'music') {
        filteredEvents = events.filter((event) => {
          // Keep kind 31337 (music events)
          if (event.kind === 31337) return true;
          
          // Keep reposts
          if (event.kind === 6 || event.kind === 16) return true;
          
          // For kind 1, check for music content
          if (event.kind === 1) {
            // Check for audio file URLs
            const hasAudioUrl = /https?:\/\/.*\.(mp3|wav|ogg|m4a|aac|flac|opus)/i.test(event.content);
            
            // Check for music streaming service URLs
            const hasSpotify = /spotify\.com\/(track|album|playlist|episode|show)/i.test(event.content);
            const hasSoundCloud = /soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/i.test(event.content);
            const hasZapstr = /zapstr\.live\/t\/naddr1[a-z0-9]+/i.test(event.content);
            
            // Check for audio imeta tags
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

      // Filter out replies from all categories (but keep reposts which also have 'e' tags)
      filteredEvents = filteredEvents.filter((event) => {
        // Keep reposts (kind 6 and 16)
        if (event.kind === 6 || event.kind === 16) {
          return true;
        }
        // Filter out replies (events with 'e' tags)
        return !event.tags.some(([name]) => name === 'e');
      });

      // Filter NSFW content for non-logged-in users
      if (!user) {
        filteredEvents = filterNSFWContent(filteredEvents);
      }

      return filteredEvents;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) {
        return undefined;
      }
      
      // Get the oldest timestamp from the last page
      const oldestTimestamp = Math.min(...lastPage.map((event: NostrEvent) => event.created_at));
      
      // Return the timestamp to use as 'until' for the next page
      return oldestTimestamp;
    },
    initialPageParam: undefined as number | undefined,
    staleTime: 60000, // 1 minute
    gcTime: Infinity,
  });
}

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useFollows } from '@/hooks/useFollows';
import type { NostrEvent } from '@nostrify/nostrify';

export type FeedCategory = 'following' | 'text' | 'articles' | 'photos' | 'music' | 'videos';

const categoryKinds: Record<FeedCategory, number[]> = {
  following: [1, 30023, 31337, 34235],
  text: [1],
  articles: [30023],
  photos: [1],
  music: [31337],
  videos: [34235],
};

export function usePosts(category: FeedCategory = 'following', limit: number = 100) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);

  return useQuery({
    queryKey: ['posts', category, limit, user?.pubkey, config.relayMetadata.updatedAt, followPubkeys.length],
    queryFn: async () => {
      const kinds = categoryKinds[category];
      
      // Get relay URLs from user's configuration
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Create a relay group to query from user's relays
      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // All categories now filter by follows - no firehose
      const query = followPubkeys.length > 0
        ? {
            kinds,
            authors: followPubkeys,
            limit,
          }
        : {
            kinds,
            limit: 20, // Reduced limit when no follows
          };

      const events = await relayGroup.query([query]);

      // Filter logic based on category
      let filteredEvents = events;

      // For photos, filter text notes (kind 1) that have image URLs
      if (category === 'photos') {
        filteredEvents = events.filter((event) => {
          if (event.kind !== 1) return false;
          
          // Check for image URLs in content or imeta tags
          const hasImageUrl = /https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(event.content);
          const hasImetaTag = event.tags.some(([name]) => name === 'imeta');
          
          return hasImageUrl || hasImetaTag;
        });
      }

      // Filter out replies from all categories
      filteredEvents = filteredEvents.filter(
        (event) => !event.tags.some(([name]) => name === 'e')
      );

      return filteredEvents;
    },
  });
}

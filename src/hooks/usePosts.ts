import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

export type FeedCategory = 'all' | 'text' | 'articles' | 'photos' | 'music' | 'videos';

const categoryKinds: Record<FeedCategory, number[]> = {
  all: [1, 30023, 31337, 34235],
  text: [1],
  articles: [30023],
  photos: [1],
  music: [31337],
  videos: [34235],
};

export function usePosts(category: FeedCategory = 'all', limit: number = 100) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['posts', category, limit],
    queryFn: async () => {
      const kinds = categoryKinds[category];
      
      const events = await nostr.query([
        {
          kinds,
          limit,
        },
      ]);

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

      // Filter out replies for most categories
      if (category !== 'all') {
        filteredEvents = filteredEvents.filter(
          (event) => !event.tags.some(([name]) => name === 'e')
        );
      } else {
        // For 'all', still filter out replies from kind 1
        filteredEvents = filteredEvents.filter((event) => {
          if (event.kind === 1) {
            return !event.tags.some(([name]) => name === 'e');
          }
          return true;
        });
      }

      return filteredEvents;
    },
  });
}

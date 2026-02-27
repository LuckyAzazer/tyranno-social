import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { useWebOfTrust } from '@/hooks/useWebOfTrust';
import { useWebOfTrustNetwork } from '@/hooks/useWebOfTrustNetwork';
import { filterNSFWContent } from '@/lib/nsfwDetection';
import { filterEventsByTopic } from '@/lib/topicFilter';
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

export function useRelayFirehose(relayUrl: string | null, category: FeedCategory = 'following') {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { shouldFilter } = useNSFWFilter();
  const { isActive: wotActive } = useWebOfTrust();
  const { data: wotNetwork = [] } = useWebOfTrustNetwork();

  return useInfiniteQuery({
    queryKey: ['relay-firehose', relayUrl, category, shouldFilter, config.topicFilter, wotActive, wotNetwork.length],
    queryFn: async ({ pageParam }) => {
      if (!relayUrl) return [];

      const relay = nostr.relay(relayUrl);
      const kinds = categoryKinds[category];
      
      // Fetch latest posts from this specific relay
      const events = await relay.query([
        {
          kinds,
          limit: 100,
          until: pageParam,
        },
      ]);

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

      // Filter NSFW content based on user preference
      if (shouldFilter) {
        filteredEvents = filterNSFWContent(filteredEvents);
      }

      // Apply topic filter
      if (config.topicFilter) {
        filteredEvents = filterEventsByTopic(filteredEvents, config.topicFilter);
      }

      // Apply Web of Trust filter
      if (wotActive && wotNetwork.length > 0) {
        filteredEvents = filteredEvents.filter((event) => {
          // For reposts, check the original author (if available)
          if (event.kind === 6 || event.kind === 16) {
            const originalAuthorTag = event.tags.find(([name]) => name === 'p');
            if (originalAuthorTag && originalAuthorTag[1]) {
              // Check if either the reposter OR the original author is in WoT
              return wotNetwork.includes(event.pubkey) || wotNetwork.includes(originalAuthorTag[1]);
            }
          }
          
          // For regular posts, check the author
          return wotNetwork.includes(event.pubkey);
        });
      }

      return filteredEvents;
    },
    enabled: !!relayUrl,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: NostrEvent[]) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      
      // Use the oldest event's timestamp for pagination
      const oldestEvent = lastPage[lastPage.length - 1];
      return oldestEvent?.created_at;
    },
    staleTime: 30000, // 30 seconds
  });
}

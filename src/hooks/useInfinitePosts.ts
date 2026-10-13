import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useFollows } from '@/hooks/useFollows';
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

const PAGE_SIZE = 100; // Large pages fill all columns without gaps

export function useInfinitePosts(category: FeedCategory = 'following') {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [], isFetched: followsFetched, isLoading: followsLoading } = useFollows(user?.pubkey);
  const { shouldFilter } = useNSFWFilter();
  const { isActive: wotActive } = useWebOfTrust();
  const { data: wotNetwork = [] } = useWebOfTrustNetwork();

  // Don't fire the feed query until we actually have the follow list.
  // - Not logged in → fire immediately (public feed)
  // - Logged in, follows still loading → wait
  // - Logged in, follows fetched with results → ready
  // - Logged in, follows fetched with 0 results → still ready (user has no follows)
  const followsReady = !user || (followsFetched && !followsLoading);

  const query = useInfiniteQuery({
    queryKey: ['posts-infinite', category, user?.pubkey, config.relayMetadata.updatedAt, followPubkeys.length, shouldFilter, config.topicFilter, wotActive, wotNetwork.length],
    enabled: followsReady,
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

      // Build the query — always filter by authors when the user has follows.
      // Never fall back to a global query when logged in; show an empty feed
      // instead so the user isn't shown random content.
      const query = followPubkeys.length > 0
        ? {
            kinds,
            authors: followPubkeys,
            limit: PAGE_SIZE,
            ...(pageParam ? { until: pageParam } : {}),
          }
        : {
            kinds,
            // Logged-out or user has no follows — small public sample only
            limit: 20,
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
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) {
        return undefined;
      }
      
      // Subtract 1 from the oldest timestamp so the next page starts *before*
      // this one, preventing duplicate events at page boundaries when multiple
      // events share the same created_at second.
      const oldestTimestamp = Math.min(...lastPage.map((event: NostrEvent) => event.created_at));
      return oldestTimestamp - 1;
    },
    initialPageParam: undefined as number | undefined,
    staleTime: 1000 * 60 * 5,         // Show cached feed instantly; refresh after 5 min
    gcTime: 1000 * 60 * 60 * 24,      // Keep pages in cache for 24 h
  });

  return {
    ...query,
    // Extra flags so the UI can show a meaningful progress state:
    // - isLoadingFollows: still fetching the contact list
    // - isLoadingFeed: contact list ready, now fetching posts
    isLoadingFollows: !!user && !followsFetched,
    followCount: followPubkeys.length,
  };
}

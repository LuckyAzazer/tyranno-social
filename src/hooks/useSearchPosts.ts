import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollows } from '@/hooks/useFollows';
import { useAppContext } from '@/hooks/useAppContext';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { useWebOfTrust } from '@/hooks/useWebOfTrust';
import { useWebOfTrustNetwork } from '@/hooks/useWebOfTrustNetwork';
import { filterNSFWContent } from '@/lib/nsfwDetection';
import { filterEventsByTopic } from '@/lib/topicFilter';
import type { NostrEvent } from '@nostrify/nostrify';

export function useSearchPosts(searchQuery: string, limit: number = 100) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);
  const { shouldFilter } = useNSFWFilter();
  const { isActive: wotActive } = useWebOfTrust();
  const { data: wotNetwork = [] } = useWebOfTrustNetwork();

  return useQuery({
    queryKey: ['search-posts', searchQuery, limit, user?.pubkey, config.relayMetadata.updatedAt, followPubkeys.length, shouldFilter, config.topicFilter, wotActive, wotNetwork.length],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return [];
      }

      // Get relay URLs from user's configuration
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Create a relay group to query from user's relays
      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // Search within user's follows only
      const query = followPubkeys.length > 0
        ? {
            kinds: [1, 30023],
            authors: followPubkeys,
            search: searchQuery,
            limit,
          }
        : {
            kinds: [1, 30023],
            search: searchQuery,
            limit: 20,
          };

      const events = await relayGroup.query([query]);

      // Client-side filtering as fallback (some relays may not support search)
      const filteredEvents = events.filter((event) => {
        const searchLower = searchQuery.toLowerCase();
        const contentMatch = event.content.toLowerCase().includes(searchLower);
        
        // Check tags for matches
        const tagMatch = event.tags.some(([name, value]) => 
          value && value.toLowerCase().includes(searchLower)
        );

        return contentMatch || tagMatch;
      });

      // Filter out replies
      let results = filteredEvents.filter(
        (event) => !event.tags.some(([name]) => name === 'e')
      );

      // Filter NSFW content based on user preference
      if (shouldFilter) {
        results = filterNSFWContent(results);
      }

      // Apply topic filter
      if (config.topicFilter) {
        results = filterEventsByTopic(results, config.topicFilter);
      }

      // Apply Web of Trust filter
      if (wotActive && wotNetwork.length > 0) {
        results = results.filter((event) => wotNetwork.includes(event.pubkey));
      }

      return results;
    },
    enabled: searchQuery.trim().length > 0,
  });
}

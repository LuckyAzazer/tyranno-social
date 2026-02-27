import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useFollows } from './useFollows';
import { useAppContext } from './useAppContext';

/**
 * Hook to get the user's Web of Trust network
 * 
 * Returns pubkeys of:
 * 1. People the user follows (1st degree)
 * 2. People followed by people the user follows (2nd degree)
 */
export function useWebOfTrustNetwork() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: firstDegreeFollows = [] } = useFollows(user?.pubkey);

  return useQuery({
    queryKey: ['web-of-trust-network', user?.pubkey, config.relayMetadata.updatedAt, firstDegreeFollows.length],
    queryFn: async () => {
      if (!user || firstDegreeFollows.length === 0) {
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

      // Fetch kind 3 (contact lists) for all first-degree follows
      // Use a reasonable limit to avoid overwhelming queries
      const MAX_FOLLOWS_TO_CHECK = 100;
      const followsToCheck = firstDegreeFollows.slice(0, MAX_FOLLOWS_TO_CHECK);

      const contactListEvents = await relayGroup.query([
        {
          kinds: [3],
          authors: followsToCheck,
        }
      ]);

      // Extract second-degree follows (people followed by people you follow)
      const secondDegreeFollows = new Set<string>();
      
      for (const event of contactListEvents) {
        const followedPubkeys = event.tags
          .filter(([name]) => name === 'p')
          .map(([_, pubkey]) => pubkey);
        
        followedPubkeys.forEach(pubkey => secondDegreeFollows.add(pubkey));
      }

      // Combine first and second degree (Web of Trust network)
      const wotNetwork = new Set([
        ...firstDegreeFollows,
        ...Array.from(secondDegreeFollows),
      ]);

      // Always include the user themselves
      wotNetwork.add(user.pubkey);

      return Array.from(wotNetwork);
    },
    enabled: !!user && firstDegreeFollows.length > 0,
    staleTime: 300000, // 5 minutes - WoT network doesn't change frequently
  });
}

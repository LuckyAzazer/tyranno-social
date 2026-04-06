import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export function useFollows(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['follows', pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!pubkey) {
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

      const events = await relayGroup.query([
        {
          kinds: [3], // Contact list
          authors: [pubkey],
          limit: 1,
        },
      ]);

      if (events.length === 0) {
        return [];
      }

      // Extract pubkeys from p tags
      const followPubkeys = events[0].tags
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey);

      return followPubkeys;
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 5,  // 5 minutes — contact list rarely changes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

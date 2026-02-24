import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export function useProfile(pubkey: string) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['profile', pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
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
          kinds: [0],
          authors: [pubkey],
          limit: 1,
        },
      ]);

      if (events.length === 0) {
        return null;
      }

      try {
        const metadata = JSON.parse(events[0].content);
        return { event: events[0], metadata };
      } catch {
        return null;
      }
    },
  });
}

export function useUserPosts(pubkey: string, limit: number = 50) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['user-posts', pubkey, limit, config.relayMetadata.updatedAt],
    queryFn: async () => {
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
          kinds: [1],
          authors: [pubkey],
          limit,
        },
      ]);

      // Filter out replies
      return events.filter(
        (event) => !event.tags.some(([name]) => name === 'e')
      );
    },
  });
}

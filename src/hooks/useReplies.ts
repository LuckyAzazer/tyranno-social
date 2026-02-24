import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export function useReplies(eventId: string) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['replies', eventId, config.relayMetadata.updatedAt],
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
          kinds: [1], // Text note replies
          '#e': [eventId],
          limit: 100,
        },
      ]);

      // Sort by created_at (newest first)
      return events.sort((a, b) => b.created_at - a.created_at);
    },
  });
}

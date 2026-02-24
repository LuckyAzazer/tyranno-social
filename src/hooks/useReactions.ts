import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export function useReactions(eventId: string) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['reactions', eventId, config.relayMetadata.updatedAt],
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
          kinds: [7], // Reaction events
          '#e': [eventId],
          limit: 500,
        },
      ]);

      // Group reactions by emoji
      const reactionCounts: Record<string, { count: number; pubkeys: string[] }> = {};
      
      events.forEach((event) => {
        const emoji = event.content || '❤️';
        if (!reactionCounts[emoji]) {
          reactionCounts[emoji] = { count: 0, pubkeys: [] };
        }
        reactionCounts[emoji].count++;
        reactionCounts[emoji].pubkeys.push(event.pubkey);
      });

      return reactionCounts;
    },
  });
}

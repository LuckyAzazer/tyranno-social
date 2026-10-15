import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getEventTagBatcher } from '@/lib/eventTagBatcher';

export function useReplies(eventId: string, enabled = true) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['replies', eventId, config.relayMetadata.updatedAt],
    enabled,
    queryFn: async () => {
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Route through the shared kind-1 batcher so many posts' replies are
      // fetched in a single relay query instead of one query per post.
      const batcher = getEventTagBatcher(nostr, relayUrls, 1, 30);
      const events = await batcher.fetch(eventId);

      // Sort by created_at (newest first)
      return [...events].sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 1000 * 60 * 2,   // 2 min — avoid constant reply refetches
    gcTime: 1000 * 60 * 30,
  });
}

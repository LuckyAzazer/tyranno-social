import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getEventTagBatcher } from '@/lib/eventTagBatcher';

export function reactionsQueryKey(eventId: string, updatedAt: number) {
  return ['reactions', eventId, updatedAt] as const;
}

export function useReactions(eventId: string, enabled = true) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: reactionsQueryKey(eventId, config.relayMetadata.updatedAt),
    enabled,
    queryFn: async () => {
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Route through the shared kind-7 batcher so many posts' reactions are
      // fetched in a single relay query instead of one query per post.
      const batcher = getEventTagBatcher(nostr, relayUrls, 7, 50);
      const events = await batcher.fetch(eventId);

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
    staleTime: 1000 * 60 * 2,   // 2 min — don't refetch reactions on every render
    gcTime: 1000 * 60 * 30,
  });
}

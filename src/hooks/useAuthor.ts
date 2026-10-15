import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getAuthorBatcher } from '@/lib/authorBatcher';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['nostr', 'author', pubkey ?? '', config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!pubkey) {
        return {};
      }

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      // Route every profile lookup through the shared batcher so that many
      // simultaneous useAuthor() calls collapse into a single relay query.
      const batcher = getAuthorBatcher(nostr, relayUrls);
      return batcher.fetch(pubkey);
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 15,       // 15 min — profiles rarely change
    gcTime: 1000 * 60 * 60 * 24,     // 24 h — keep profiles in cache
    retry: 1,
  });
}

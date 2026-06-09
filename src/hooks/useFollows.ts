import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

// Well-known reliable relays used as a broad fallback when querying the
// contact list — ensures we get a result even if the user's configured
// relay list hasn't synced yet on first load.
const FALLBACK_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

export function useFollows(pubkey: string | undefined) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['follows', pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!pubkey) return [];

      // Merge user's configured read relays with the fallback set so we
      // always query a broad pool — this ensures the contact list is found
      // even if NostrSync hasn't updated config.relayMetadata yet.
      const configuredUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const allRelayUrls = Array.from(new Set([...configuredUrls, ...FALLBACK_RELAYS]));
      const relayGroup = nostr.group(allRelayUrls);

      const events = await relayGroup.query([
        { kinds: [3], authors: [pubkey], limit: 1 },
      ], { signal: AbortSignal.timeout(10_000) });

      if (events.length === 0) return [];

      return events[0].tags
        .filter(([name]) => name === 'p')
        .map(([, pk]) => pk);
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    // Retry once on failure — relay connections can be flaky on first load
    retry: 1,
  });
}

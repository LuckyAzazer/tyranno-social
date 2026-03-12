import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

export function useEventById(eventId: string | null) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      const events = await relayGroup.query([{ ids: [eventId], limit: 1 }]);
      return events[0] ?? null;
    },
    enabled: !!eventId,
    staleTime: Infinity, // events are immutable
  });
}

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export function useRepostedEvent(event: NostrEvent, enabled = true) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Check if this is a repost (kind 6 or kind 16 generic repost)
  const isRepost = event.kind === 6 || event.kind === 16;
  
  // Get the reposted event ID from e tag
  const repostedEventId = isRepost
    ? event.tags.find(([name]) => name === 'e')?.[1]
    : null;

  // For kind 6, the reposted event is in the content field
  const embeddedEvent = event.kind === 6 && event.content
    ? (() => {
        try {
          return JSON.parse(event.content) as NostrEvent;
        } catch {
          return null;
        }
      })()
    : null;

  return useQuery({
    queryKey: ['reposted-event', repostedEventId, config.relayMetadata.updatedAt],
    queryFn: async () => {
      // If we have embedded event (kind 6), use it
      if (embeddedEvent) {
        return embeddedEvent;
      }

      // Otherwise fetch it (kind 16)
      if (!repostedEventId) {
        return null;
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
          ids: [repostedEventId],
          limit: 1,
        },
      ]);

      return events[0] || null;
    },
    enabled: enabled && isRepost && (!!embeddedEvent || !!repostedEventId),
  });
}

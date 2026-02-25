import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

export interface NotificationEvent extends NostrEvent {
  notificationType: 'mention' | 'reply' | 'reaction' | 'repost' | 'zap';
}

export function useNotifications(limit: number = 50) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['notifications', user?.pubkey, limit, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!user?.pubkey) {
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

      // Query for events that reference the user
      const events = await relayGroup.query([
        {
          kinds: [1, 6, 7, 16, 9735], // Text notes, reposts, reactions, generic reposts, zaps
          '#p': [user.pubkey],
          limit,
        },
      ]);

      // Sort by created_at (newest first)
      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);

      // Categorize notifications
      const notifications: NotificationEvent[] = sortedEvents.map((event) => {
        let notificationType: NotificationEvent['notificationType'] = 'mention';

        if (event.kind === 7) {
          notificationType = 'reaction';
        } else if (event.kind === 6 || event.kind === 16) {
          notificationType = 'repost';
        } else if (event.kind === 9735) {
          notificationType = 'zap';
        } else if (event.kind === 1) {
          // Check if it's a reply or mention
          const hasETag = event.tags.some(([name]) => name === 'e');
          notificationType = hasETag ? 'reply' : 'mention';
        }

        return {
          ...event,
          notificationType,
        };
      });

      // Filter out notifications from self
      return notifications.filter(notification => notification.pubkey !== user.pubkey);
    },
    enabled: !!user?.pubkey,
  });
}

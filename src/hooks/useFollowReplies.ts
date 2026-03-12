import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useFollows } from '@/hooks/useFollows';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Fetches replies to an event that were authored by people the current user follows.
 * Returns at most `limit` replies sorted oldest-first so they read naturally.
 */
export function useFollowReplies(eventId: string, limit = 3) {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);

  return useQuery({
    queryKey: ['follow-replies', eventId, user?.pubkey, followPubkeys.length, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!user || followPubkeys.length === 0) return [];

      // Include the user themselves so their own replies show too
      const authors = Array.from(new Set([user.pubkey, ...followPubkeys]));

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      const events = await relayGroup.query([
        {
          kinds: [1],
          '#e': [eventId],
          authors,
          limit: 50,
        },
      ]);

      // Keep only direct replies (have an 'e' tag pointing to this event)
      const replies = events.filter(e =>
        e.tags.some(([name, id]) => name === 'e' && id === eventId)
      );

      // Oldest first so they read like a conversation, cap at limit
      return replies
        .sort((a, b) => a.created_at - b.created_at)
        .slice(0, limit);
    },
    enabled: !!user && followPubkeys.length > 0,
  });
}

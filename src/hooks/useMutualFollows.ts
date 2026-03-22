/**
 * useMutualFollows
 *
 * Returns the set of pubkeys that the current user follows AND that
 * also follow the current user back — i.e. mutual follows.
 *
 * Strategy:
 *   1. Load the user's own contact list (kind 3) — who they follow.
 *   2. Batch-query kind 3 events authored by each of those people.
 *   3. For each person the user follows, check whether that person's
 *      contact list contains the user's pubkey.
 *   4. Return only the intersection.
 *
 * We batch the second query in chunks of 500 to stay within relay limits.
 */

import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollows } from '@/hooks/useFollows';
import { useAppContext } from '@/hooks/useAppContext';

const BATCH_SIZE = 500;

export function useMutualFollows() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: followPubkeys = [], isLoading: isLoadingFollows } = useFollows(user?.pubkey);

  return useQuery({
    queryKey: ['mutual-follows', user?.pubkey, followPubkeys.length, config.relayMetadata.updatedAt],
    queryFn: async (): Promise<string[]> => {
      if (!user?.pubkey || followPubkeys.length === 0) {
        return [];
      }

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      // Batch-fetch contact lists for all the people we follow
      const allContactListEvents = [];

      for (let i = 0; i < followPubkeys.length; i += BATCH_SIZE) {
        const batch = followPubkeys.slice(i, i + BATCH_SIZE);
        const events = await relayGroup.query([
          {
            kinds: [3],
            authors: batch,
            limit: BATCH_SIZE,
          },
        ]);
        allContactListEvents.push(...events);
      }

      // Deduplicate: keep only the latest contact list per author
      const latestByAuthor = new Map<string, typeof allContactListEvents[0]>();
      for (const event of allContactListEvents) {
        const existing = latestByAuthor.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestByAuthor.set(event.pubkey, event);
        }
      }

      // A mutual follow = they follow the current user back
      const mutuals: string[] = [];
      for (const [theirPubkey, contactList] of latestByAuthor.entries()) {
        const theyFollowMe = contactList.tags.some(
          ([name, value]) => name === 'p' && value === user.pubkey,
        );
        if (theyFollowMe) {
          mutuals.push(theirPubkey);
        }
      }

      return mutuals;
    },
    enabled: !!user?.pubkey && !isLoadingFollows && followPubkeys.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes — mutual follows don't change that often
    gcTime: Infinity,
  });
}

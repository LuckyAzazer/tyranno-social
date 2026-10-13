import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect, useRef } from 'react';

interface BookmarkItem {
  type: 'event' | 'article';
  id: string;
  relay?: string;
  isPrivate: boolean;
}

async function parseBookmarkList(
  list: NostrEvent,
  user: { pubkey: string; signer: { nip44?: { decrypt: (pubkey: string, content: string) => Promise<string> } } }
): Promise<BookmarkItem[]> {
  const bookmarkItems: BookmarkItem[] = [];

  // Extract public bookmarks from tags
  for (const tag of list.tags) {
    if (tag[0] === 'e') {
      // Event bookmark
      bookmarkItems.push({
        type: 'event',
        id: tag[1],
        relay: tag[2],
        isPrivate: false,
      });
    } else if (tag[0] === 'a') {
      // Article bookmark
      bookmarkItems.push({
        type: 'article',
        id: tag[1],
        relay: tag[2],
        isPrivate: false,
      });
    }
  }

  // Decrypt private bookmarks if content exists
  if (list.content && user.signer.nip44) {
    try {
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, list.content);
      const privateItems = JSON.parse(decrypted) as string[][];

      for (const tag of privateItems) {
        if (tag[0] === 'e') {
          bookmarkItems.push({
            type: 'event',
            id: tag[1],
            relay: tag[2],
            isPrivate: true,
          });
        } else if (tag[0] === 'a') {
          bookmarkItems.push({
            type: 'article',
            id: tag[1],
            relay: tag[2],
            isPrivate: true,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to decrypt private bookmarks:', error);
    }
  }

  return bookmarkItems;
}

export function useBookmarks() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<{ close: () => void } | null>(null);

  const query = useQuery({
    queryKey: ['bookmarks', user?.pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!user) return { items: [], events: [] };

      // Get relay URLs from user's configuration (read from both read and write relays)
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read || r.write)
        .map(r => r.url);

      // Create a relay group to query from user's relays
      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // Fetch bookmark list (kind 10003) - replaceable event, get latest
      const bookmarkLists = await relayGroup.query([
        {
          kinds: [10003],
          authors: [user.pubkey],
          limit: 10,
        },
      ]);

      // Sort by created_at to get the most recent
      bookmarkLists.sort((a, b) => b.created_at - a.created_at);

      const bookmarkItems: BookmarkItem[] = [];

      if (bookmarkLists.length > 0) {
        const parsedItems = await parseBookmarkList(bookmarkLists[0], user);
        bookmarkItems.push(...parsedItems);
      }

      // Fetch the actual bookmarked events
      const eventIds = bookmarkItems
        .filter(item => item.type === 'event')
        .map(item => item.id);

      const events: NostrEvent[] = [];

      if (eventIds.length > 0) {
        const bookmarkedEvents = await relayGroup.query([
          {
            ids: eventIds,
            limit: eventIds.length,
          },
        ]);
        events.push(...bookmarkedEvents);
      }

      return { items: bookmarkItems, events };
    },
    enabled: !!user,
    staleTime: 0, // Always refetch to get latest bookmarks
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Set up realtime subscription for bookmark updates
  useEffect(() => {
    if (!user) return;

    const relayUrls = config.relayMetadata.relays
      .filter(r => r.read || r.write)
      .map(r => r.url);

    const relayGroup = relayUrls.length > 0 
      ? nostr.group(relayUrls)
      : nostr;

    console.log('Setting up realtime bookmark subscription for user:', user.pubkey);

    // Subscribe to bookmark list updates
    const sub = relayGroup.req(
      [
        {
          kinds: [10003],
          authors: [user.pubkey],
          limit: 1,
        },
      ],
      {
        onevent: async (event: NostrEvent) => {
          // Parse the new bookmark list
          const bookmarkItems = await parseBookmarkList(event, user);

          // Fetch the actual bookmarked events
          const eventIds = bookmarkItems
            .filter(item => item.type === 'event')
            .map(item => item.id);

          const events: NostrEvent[] = [];

          if (eventIds.length > 0) {
            const bookmarkedEvents = await relayGroup.query([
              {
                ids: eventIds,
                limit: eventIds.length,
              },
            ]);
            events.push(...bookmarkedEvents);
          }

          // Update the query cache with the new data
          queryClient.setQueryData(
            ['bookmarks', user.pubkey, config.relayMetadata.updatedAt],
            { items: bookmarkItems, events }
          );
        },
        oneose: () => {},
      }
    );

    subscriptionRef.current = sub;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.close();
        subscriptionRef.current = null;
      }
    };
  }, [user?.pubkey, config.relayMetadata.updatedAt, nostr, queryClient]);

  return query;
}

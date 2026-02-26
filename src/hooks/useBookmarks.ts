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
      if (!user) {
        console.log('No user logged in, skipping bookmark fetch');
        return { items: [], events: [] };
      }

      console.log('Fetching bookmarks for user:', user.pubkey);

      // Get relay URLs from user's configuration (read from both read and write relays)
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read || r.write)
        .map(r => r.url);

      console.log('Querying bookmarks from relays:', relayUrls);

      // Create a relay group to query from user's relays
      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // Fetch bookmark lists (kind 10003) - replaceable event
      const bookmarkLists = await relayGroup.query([
        {
          kinds: [10003],
          authors: [user.pubkey],
          limit: 10, // Fetch more to ensure we get the latest
        },
      ]);

      // Sort by created_at to get the most recent
      bookmarkLists.sort((a, b) => b.created_at - a.created_at);

      const bookmarkItems: BookmarkItem[] = [];

      console.log('Found', bookmarkLists.length, 'bookmark lists');
      if (bookmarkLists.length > 0) {
        console.log('Latest bookmark list created_at:', new Date(bookmarkLists[0].created_at * 1000).toISOString());
        console.log('Latest bookmark list tags count:', bookmarkLists[0].tags.length);
      }

      if (bookmarkLists.length > 0) {
        const list = bookmarkLists[0];
        console.log('Bookmark list:', list);

        const parsedItems = await parseBookmarkList(list, user);
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

      // TODO: Fetch articles (kind 30023) if needed
      // For now, just return events

      console.log('Returning', bookmarkItems.length, 'bookmark items and', events.length, 'events');
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
          console.log('Received realtime bookmark update:', event.id, 'created_at:', event.created_at);

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

          console.log('Updated bookmark cache with', bookmarkItems.length, 'items and', events.length, 'events');
        },
        oneose: () => {
          console.log('Bookmark subscription EOSE received');
        },
      }
    );

    subscriptionRef.current = sub;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('Closing bookmark subscription');
        subscriptionRef.current.close();
        subscriptionRef.current = null;
      }
    };
  }, [user?.pubkey, config.relayMetadata.updatedAt, nostr, queryClient]);

  return query;
}

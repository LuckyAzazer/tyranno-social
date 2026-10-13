import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

export function useBookmarkPost() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if an event is bookmarked
  const useIsBookmarked = (eventId: string) => {
    return useQuery({
      queryKey: ['is-bookmarked', eventId, user?.pubkey, config.relayMetadata.updatedAt],
      queryFn: async () => {
        if (!user) return false;

        const relayUrls = config.relayMetadata.relays
          .filter(r => r.read)
          .map(r => r.url);

        const relayGroup = relayUrls.length > 0 
          ? nostr.group(relayUrls)
          : nostr;

        const bookmarkLists = await relayGroup.query([
          {
            kinds: [10003],
            authors: [user.pubkey],
            limit: 1,
          },
        ]);

        if (bookmarkLists.length === 0) return false;

        const list = bookmarkLists[0];

        // Check public bookmarks
        const isPublicBookmark = list.tags.some(
          tag => tag[0] === 'e' && tag[1] === eventId
        );

        if (isPublicBookmark) return true;

        // Check private bookmarks
        if (list.content && user.signer.nip44) {
          try {
            const decrypted = await user.signer.nip44.decrypt(user.pubkey, list.content);
            const privateItems = JSON.parse(decrypted) as string[][];
            return privateItems.some(tag => tag[0] === 'e' && tag[1] === eventId);
          } catch {
            return false;
          }
        }

        return false;
      },
      enabled: !!user,
    });
  };

  // Toggle bookmark
  const toggleBookmark = useMutation({
    onMutate: async ({ eventId, isPrivate = false }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['is-bookmarked', eventId] });
      await queryClient.cancelQueries({ queryKey: ['bookmarks'] });

      // Snapshot the previous values
      const previousIsBookmarked = queryClient.getQueryData(['is-bookmarked', eventId, user?.pubkey, config.relayMetadata.updatedAt]);
      const previousBookmarks = queryClient.getQueryData(['bookmarks', user?.pubkey, config.relayMetadata.updatedAt]);

      // Determine if adding or removing
      const isCurrentlyBookmarked = previousIsBookmarked === true;
      const newBookmarkState = !isCurrentlyBookmarked;

      // Optimistically update is-bookmarked
      queryClient.setQueryData(['is-bookmarked', eventId, user?.pubkey, config.relayMetadata.updatedAt], newBookmarkState);

      // Optimistically update bookmarks list
      if (user) {
        queryClient.setQueryData(['bookmarks', user.pubkey, config.relayMetadata.updatedAt], (old: any) => {
          if (!old) {
            // If no previous data, create new structure
            return {
              items: newBookmarkState ? [{ type: 'event', id: eventId, isPrivate }] : [],
              events: []
            };
          }

          const newItems = [...(old.items || [])];
          
          if (newBookmarkState) {
            // Adding bookmark - add if not already present
            if (!newItems.some(item => item.id === eventId)) {
              newItems.push({ type: 'event', id: eventId, isPrivate });
            }
          } else {
            // Removing bookmark
            const index = newItems.findIndex(item => item.id === eventId);
            if (index !== -1) {
              newItems.splice(index, 1);
            }
          }

          return {
            ...old,
            items: newItems,
          };
        });
      }

      // Return context for rollback
      return { previousIsBookmarked, previousBookmarks, eventId };
    },
    mutationFn: async ({ eventId, isPrivate = false }: { eventId: string; isPrivate?: boolean }): Promise<{ action: 'added' | 'removed'; event: NostrEvent }> => {
      if (!user) {
        throw new Error('Must be logged in to bookmark');
      }

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      // Fetch current bookmark list
      const bookmarkLists = await relayGroup.query([
        {
          kinds: [10003],
          authors: [user.pubkey],
          limit: 1,
        },
      ]);

      const existingList = bookmarkLists[0];
      let publicTags: string[][] = [];
      let privateTags: string[][] = [];

      // Parse existing bookmarks
      // Preserve non-item tags (e.g. 't', 'title') so they aren't stripped on update
      let metaTags: string[][] = [];
      if (existingList) {
        metaTags = existingList.tags.filter(tag => tag[0] !== 'e' && tag[0] !== 'a');
        publicTags = existingList.tags.filter(tag => tag[0] === 'e' || tag[0] === 'a');
        
        if (existingList.content && user.signer.nip44) {
          try {
            const decrypted = await user.signer.nip44.decrypt(user.pubkey, existingList.content);
            privateTags = JSON.parse(decrypted) as string[][];
          } catch (error) {
            console.warn('Failed to decrypt existing private bookmarks:', error);
          }
        }
      }

      // Check if already bookmarked
      const isInPublic = publicTags.some(tag => tag[0] === 'e' && tag[1] === eventId);
      const isInPrivate = privateTags.some(tag => tag[0] === 'e' && tag[1] === eventId);

      let action: 'added' | 'removed';

      if (isInPublic || isInPrivate) {
        // Remove from bookmarks
        publicTags = publicTags.filter(tag => !(tag[0] === 'e' && tag[1] === eventId));
        privateTags = privateTags.filter(tag => !(tag[0] === 'e' && tag[1] === eventId));
        action = 'removed';
      } else {
        // Add to bookmarks
        const newTag = ['e', eventId];
        if (isPrivate) {
          privateTags.push(newTag);
        } else {
          publicTags.push(newTag);
        }
        action = 'added';
      }

      // Encrypt private tags if any exist
      let encryptedContent = '';
      if (privateTags.length > 0 && user.signer.nip44) {
        encryptedContent = await user.signer.nip44.encrypt(
          user.pubkey,
          JSON.stringify(privateTags)
        );
      }

      const writeRelayUrls = config.relayMetadata.relays
        .filter(r => r.write)
        .map(r => r.url);

      const writeRelayGroup = writeRelayUrls.length > 0
        ? nostr.group(writeRelayUrls)
        : nostr;

      // Sign the event before publishing
      const unsignedEvent = {
        kind: 10003 as const,
        content: encryptedContent,
        // Restore preserved meta tags alongside the updated bookmark item tags
        tags: [...metaTags, ...publicTags],
        created_at: Math.floor(Date.now() / 1000),
      };
      const signedEvent = await user.signer.signEvent(unsignedEvent);
      const publishedEvent = await writeRelayGroup.event(signedEvent);

      return { action, event: publishedEvent };
    },
    onSuccess: async (result, variables) => {
      const { action } = result;

      // Wait a bit for relay to propagate the event
      await new Promise(resolve => setTimeout(resolve, 800));

      // Invalidate and refetch bookmark queries
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      await queryClient.invalidateQueries({ queryKey: ['is-bookmarked', variables.eventId] });
      
      // Force refetch bookmarks
      await queryClient.refetchQueries({ queryKey: ['bookmarks'] });

      toast({
        title: action === 'added' ? 'Bookmarked!' : 'Removed from bookmarks',
        description: action === 'added' 
          ? 'Post saved to your bookmarks' 
          : 'Post removed from bookmarks',
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousIsBookmarked !== undefined && user) {
        queryClient.setQueryData(
          ['is-bookmarked', context.eventId, user.pubkey, config.relayMetadata.updatedAt], 
          context.previousIsBookmarked
        );
      }
      if (context?.previousBookmarks && user) {
        queryClient.setQueryData(
          ['bookmarks', user.pubkey, config.relayMetadata.updatedAt], 
          context.previousBookmarks
        );
      }

      console.error('Failed to toggle bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bookmark. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    toggleBookmark,
    useIsBookmarked,
  };
}

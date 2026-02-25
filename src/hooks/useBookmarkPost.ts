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
    mutationFn: async ({ eventId, isPrivate = false }: { eventId: string; isPrivate?: boolean }): Promise<{ action: 'added' | 'removed'; event: NostrEvent }> => {
      if (!user) {
        throw new Error('Must be logged in to bookmark');
      }

      console.log('Toggling bookmark for event:', eventId, 'isPrivate:', isPrivate);

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
      if (existingList) {
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

      // Publish updated bookmark list to all write relays
      console.log('Publishing bookmark list with', publicTags.length, 'public tags and', privateTags.length, 'private tags');
      console.log('Write relays:', config.relayMetadata.relays.filter(r => r.write).map(r => r.url));
      
      const writeRelayUrls = config.relayMetadata.relays
        .filter(r => r.write)
        .map(r => r.url);

      const writeRelayGroup = writeRelayUrls.length > 0
        ? nostr.group(writeRelayUrls)
        : nostr;

      const publishedEvent = await writeRelayGroup.event({
        kind: 10003,
        content: encryptedContent,
        tags: publicTags,
      });

      console.log('Bookmark event published:', publishedEvent.id, 'created_at:', publishedEvent.created_at);
      console.log('Action:', action);
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
    onError: (error) => {
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

import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { NostrEvent } from '@nostrify/nostrify';
import { useEffect } from 'react';

export interface BookmarkSet {
  id: string; // d tag value
  event?: NostrEvent; // Optional - local-only sets won't have this
  title: string;
  description?: string;
  image?: string;
  publicItems: string[][]; // Public bookmark tags
  privateItems: string[][]; // Private bookmark tags (decrypted)
  itemCount: number;
  isLocal?: boolean; // True if only saved locally, not yet synced to Nostr
  syncStatus?: 'synced' | 'pending' | 'failed'; // Sync status
  createdAt: number; // Timestamp for sorting
}

interface LocalBookmarkSet {
  id: string;
  title: string;
  description?: string;
  image?: string;
  publicItems: string[][];
  privateItems: string[][];
  createdAt: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

async function parseBookmarkSet(
  event: NostrEvent,
  user: { pubkey: string; signer: { nip44?: { decrypt: (pubkey: string, content: string) => Promise<string> } } }
): Promise<BookmarkSet> {
  const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';
  const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';
  const description = event.tags.find(([name]) => name === 'description')?.[1];
  const image = event.tags.find(([name]) => name === 'image')?.[1];

  // Get public items (e and a tags)
  const publicItems = event.tags.filter(([name]) => name === 'e' || name === 'a');

  // Decrypt private items if content exists
  let privateItems: string[][] = [];
  if (event.content && user.signer.nip44) {
    try {
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
      privateItems = JSON.parse(decrypted) as string[][];
    } catch (error) {
      console.warn('Failed to decrypt private items in bookmark set:', error);
    }
  }

  return {
    id: dTag,
    event,
    title,
    description,
    image,
    publicItems,
    privateItems,
    itemCount: publicItems.length + privateItems.length,
    syncStatus: 'synced',
    createdAt: event.created_at,
  };
}

function getLocalStorageKey(pubkey: string): string {
  return `nostr:bookmark-sets:${pubkey}`;
}

export function useBookmarkSets() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useQuery({
    queryKey: ['bookmark-sets', user?.pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      // Get local bookmark sets from localStorage directly (not via hook to avoid stale closure)
      const localSetsRaw = localStorage.getItem(getLocalStorageKey(user.pubkey));
      const localSets: Record<string, LocalBookmarkSet> = localSetsRaw ? JSON.parse(localSetsRaw) : {};

      // Get remote bookmark sets from Nostr
      let remoteSets: BookmarkSet[] = [];
      
      try {
        const relayUrls = config.relayMetadata.relays
          .filter(r => r.read || r.write)
          .map(r => r.url);

        if (relayUrls.length > 0) {
          const relayGroup = nostr.group(relayUrls);

          // Fetch all bookmark sets (kind 30003) with timeout
          const queryPromise = relayGroup.query([
            {
              kinds: [30003],
              authors: [user.pubkey],
            },
          ]);

          const timeoutPromise = new Promise<NostrEvent[]>((resolve) => {
            setTimeout(() => resolve([]), 5000); // 5 second timeout for queries
          });

          const events = await Promise.race([queryPromise, timeoutPromise]);

          // Parse all bookmark sets
          remoteSets = await Promise.all(
            events.map(event => parseBookmarkSet(event, user))
          );
        }
      } catch (error) {
        console.warn('Failed to fetch remote bookmark sets:', error);
      }

      // Merge local and remote sets
      const mergedSetsMap = new Map<string, BookmarkSet>();

      // Add remote sets first
      for (const set of remoteSets) {
        mergedSetsMap.set(set.id, set);
      }

      // Add or update with local sets
      for (const [id, localSet] of Object.entries(localSets)) {
        const existingSet = mergedSetsMap.get(id);
        
        if (!existingSet || localSet.syncStatus === 'pending' || localSet.syncStatus === 'failed') {
          // Use local version if it doesn't exist remotely or if it's pending/failed sync
          mergedSetsMap.set(id, {
            id,
            title: localSet.title,
            description: localSet.description,
            image: localSet.image,
            publicItems: localSet.publicItems,
            privateItems: localSet.privateItems,
            itemCount: localSet.publicItems.length + localSet.privateItems.length,
            isLocal: localSet.syncStatus !== 'synced',
            syncStatus: localSet.syncStatus,
            createdAt: localSet.createdAt,
          });
        }
      }

      const allSets = Array.from(mergedSetsMap.values());

      // Sort by most recent
      allSets.sort((a, b) => b.createdAt - a.createdAt);

      return allSets;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function useBookmarkSetItems(setId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { data: sets } = useBookmarkSets();

  return useQuery({
    queryKey: ['bookmark-set-items', setId, user?.pubkey, config.relayMetadata.updatedAt],
    queryFn: async () => {
      if (!user || !sets) return [];

      const set = sets.find(s => s.id === setId);
      if (!set) return [];

      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read || r.write)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 ? nostr.group(relayUrls) : nostr;

      // Get all event IDs from both public and private items
      const eventIds = [...set.publicItems, ...set.privateItems]
        .filter(([tag]) => tag === 'e')
        .map(([, id]) => id);

      if (eventIds.length === 0) return [];

      // Fetch the actual events
      const events = await relayGroup.query([
        {
          ids: eventIds,
        },
      ]);

      return events;
    },
    enabled: !!user && !!sets,
  });
}

export function useCreateBookmarkSet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [localSets, setLocalSets] = useLocalStorage<Record<string, LocalBookmarkSet>>(
    user ? getLocalStorageKey(user.pubkey) : 'nostr:bookmark-sets:default',
    {}
  );

  return useMutation({
    mutationFn: async ({ title, description, image }: { title: string; description?: string; image?: string }) => {
      if (!user) throw new Error('Must be logged in');

      // Generate a random d tag
      const dTag = Date.now().toString(36) + Math.random().toString(36).substring(2);

      // Save to localStorage immediately
      const newLocalSet: LocalBookmarkSet = {
        id: dTag,
        title,
        description,
        image,
        publicItems: [],
        privateItems: [],
        createdAt: Math.floor(Date.now() / 1000),
        syncStatus: 'pending',
      };

      setLocalSets({
        ...localSets,
        [dTag]: newLocalSet,
      });

      // Try to publish to Nostr in the background (non-blocking)
      setTimeout(async () => {
        try {
          const writeRelayUrls = config.relayMetadata.relays
            .filter(r => r.write)
            .map(r => r.url);

          if (writeRelayUrls.length === 0) {
            return;
          }

          const writeRelayGroup = nostr.group(writeRelayUrls);

          const tags: string[][] = [
            ['d', dTag],
            ['title', title],
          ];

          if (description) tags.push(['description', description]);
          if (image) tags.push(['image', image]);

          // Add timeout to prevent hanging
          const publishPromise = writeRelayGroup.event({
            kind: 30003,
            content: '',
            tags,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Publishing timeout')), 15000);
          });

          await Promise.race([publishPromise, timeoutPromise]);

          // Update local storage to mark as synced
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[dTag]) {
            currentSets[dTag].syncStatus = 'synced';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        } catch (error) {
          console.error('Background sync failed:', error);
          
          // Update local storage to mark as failed
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[dTag]) {
            currentSets[dTag].syncStatus = 'failed';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        }
      }, 100);

      return { id: dTag };
    },
    onSuccess: (data) => {
      // Force immediate refetch of bookmark sets
      queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
      queryClient.refetchQueries({ queryKey: ['bookmark-sets'] });
      
      toast({
        title: 'List created!',
        description: 'Your bookmark list has been saved locally',
      });
    },
    onError: (error) => {
      console.error('Failed to create bookmark set:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create bookmark list',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteBookmarkSet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [localSets, setLocalSets] = useLocalStorage<Record<string, LocalBookmarkSet>>(
    user ? getLocalStorageKey(user.pubkey) : 'nostr:bookmark-sets:default',
    {}
  );

  return useMutation({
    mutationFn: async (setId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Delete from localStorage immediately
      const updatedSets = { ...localSets };
      delete updatedSets[setId];
      setLocalSets(updatedSets);

      // Try to publish deletion to Nostr in the background
      setTimeout(async () => {
        try {
          const writeRelayUrls = config.relayMetadata.relays
            .filter(r => r.write)
            .map(r => r.url);

          if (writeRelayUrls.length === 0) {
            console.warn('No write relays configured, deletion only local');
            return;
          }

          const writeRelayGroup = nostr.group(writeRelayUrls);

          const publishPromise = writeRelayGroup.event({
            kind: 5,
            content: 'Deleted bookmark list',
            tags: [
              ['a', `30003:${user.pubkey}:${setId}`],
            ],
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Publishing timeout')), 15000);
          });

          await Promise.race([publishPromise, timeoutPromise]);
        } catch (error) {
          console.error('Background sync (deletion) failed:', error);
        }
      }, 100);

      return setId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
      queryClient.refetchQueries({ queryKey: ['bookmark-sets'] });
      toast({
        title: 'List deleted',
        description: 'Bookmark list has been deleted',
      });
    },
    onError: (error) => {
      console.error('Failed to delete bookmark set:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete bookmark list',
        variant: 'destructive',
      });
    },
  });
}

export function useAddToBookmarkSet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sets } = useBookmarkSets();

  const [localSets, setLocalSets] = useLocalStorage<Record<string, LocalBookmarkSet>>(
    user ? getLocalStorageKey(user.pubkey) : 'nostr:bookmark-sets:default',
    {}
  );

  return useMutation({
    mutationFn: async ({ setId, eventId, isPrivate = false }: { setId: string; eventId: string; isPrivate?: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      const set = sets?.find(s => s.id === setId);
      if (!set) throw new Error('Bookmark set not found');

      // Prepare new tags
      const newTag = ['e', eventId];
      let publicItems = [...set.publicItems];
      let privateItems = [...set.privateItems];

      // Check if already exists
      const existsInPublic = publicItems.some(([t, id]) => t === 'e' && id === eventId);
      const existsInPrivate = privateItems.some(([t, id]) => t === 'e' && id === eventId);

      if (existsInPublic || existsInPrivate) {
        throw new Error('Already in this list');
      }

      // Add to appropriate list
      if (isPrivate) {
        privateItems.push(newTag);
      } else {
        publicItems.push(newTag);
      }

      // Save to localStorage immediately
      const updatedLocalSet: LocalBookmarkSet = {
        id: set.id,
        title: set.title,
        description: set.description,
        image: set.image,
        publicItems,
        privateItems,
        createdAt: set.createdAt,
        syncStatus: 'pending',
      };

      setLocalSets({
        ...localSets,
        [set.id]: updatedLocalSet,
      });

      // Try to publish to Nostr in the background
      setTimeout(async () => {
        try {
          const writeRelayUrls = config.relayMetadata.relays
            .filter(r => r.write)
            .map(r => r.url);

          if (writeRelayUrls.length === 0) {
            return;
          }

          const writeRelayGroup = nostr.group(writeRelayUrls);

          // Prepare tags for the event (metadata + public items)
          const tags: string[][] = [
            ['d', set.id],
            ['title', set.title],
          ];

          if (set.description) tags.push(['description', set.description]);
          if (set.image) tags.push(['image', set.image]);

          tags.push(...publicItems);

          // Encrypt private items if any
          let content = '';
          if (privateItems.length > 0 && user.signer.nip44) {
            content = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(privateItems));
          }

          const publishPromise = writeRelayGroup.event({
            kind: 30003,
            content,
            tags,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Publishing timeout')), 15000);
          });

          await Promise.race([publishPromise, timeoutPromise]);

          // Update local storage to mark as synced
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[set.id]) {
            currentSets[set.id].syncStatus = 'synced';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        } catch (error) {
          console.error('Background sync (add to set) failed:', error);

          // Update local storage to mark as failed
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[set.id]) {
            currentSets[set.id].syncStatus = 'failed';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        }
      }, 100);

      return { setId, eventId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
      queryClient.refetchQueries({ queryKey: ['bookmark-sets'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-set-items'] });
      toast({
        title: 'Added to list!',
        description: 'Post added to bookmark list',
      });
    },
    onError: (error) => {
      console.error('Failed to add to bookmark set:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add to list',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveFromBookmarkSet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sets } = useBookmarkSets();

  const [localSets, setLocalSets] = useLocalStorage<Record<string, LocalBookmarkSet>>(
    user ? getLocalStorageKey(user.pubkey) : 'nostr:bookmark-sets:default',
    {}
  );

  return useMutation({
    mutationFn: async ({ setId, eventId }: { setId: string; eventId: string }) => {
      if (!user) throw new Error('Must be logged in');

      const set = sets?.find(s => s.id === setId);
      if (!set) throw new Error('Bookmark set not found');

      // Remove from both lists
      const publicItems = set.publicItems.filter(([t, id]) => !(t === 'e' && id === eventId));
      const privateItems = set.privateItems.filter(([t, id]) => !(t === 'e' && id === eventId));

      // Save to localStorage immediately
      const updatedLocalSet: LocalBookmarkSet = {
        id: set.id,
        title: set.title,
        description: set.description,
        image: set.image,
        publicItems,
        privateItems,
        createdAt: set.createdAt,
        syncStatus: 'pending',
      };

      setLocalSets({
        ...localSets,
        [set.id]: updatedLocalSet,
      });

      // Try to publish to Nostr in the background
      setTimeout(async () => {
        try {
          const writeRelayUrls = config.relayMetadata.relays
            .filter(r => r.write)
            .map(r => r.url);

          if (writeRelayUrls.length === 0) {
            console.warn('No write relays configured, keeping local only');
            return;
          }

          const writeRelayGroup = nostr.group(writeRelayUrls);

          // Prepare tags
          const tags: string[][] = [
            ['d', set.id],
            ['title', set.title],
          ];

          if (set.description) tags.push(['description', set.description]);
          if (set.image) tags.push(['image', set.image]);

          tags.push(...publicItems);

          // Encrypt private items
          let content = '';
          if (privateItems.length > 0 && user.signer.nip44) {
            content = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(privateItems));
          }

          const publishPromise = writeRelayGroup.event({
            kind: 30003,
            content,
            tags,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Publishing timeout')), 15000);
          });

          await Promise.race([publishPromise, timeoutPromise]);

          // Update local storage to mark as synced
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[set.id]) {
            currentSets[set.id].syncStatus = 'synced';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        } catch (error) {
          console.error('Background sync (remove from set) failed:', error);

          // Update local storage to mark as failed
          const currentSets = JSON.parse(localStorage.getItem(getLocalStorageKey(user.pubkey)) || '{}');
          if (currentSets[set.id]) {
            currentSets[set.id].syncStatus = 'failed';
            localStorage.setItem(getLocalStorageKey(user.pubkey), JSON.stringify(currentSets));
          }

          queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
        }
      }, 100);

      return { setId, eventId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-sets'] });
      queryClient.refetchQueries({ queryKey: ['bookmark-sets'] });
      queryClient.invalidateQueries({ queryKey: ['bookmark-set-items'] });
      toast({
        title: 'Removed from list',
        description: 'Post removed from bookmark list',
      });
    },
    onError: (error) => {
      console.error('Failed to remove from bookmark set:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove from list',
        variant: 'destructive',
      });
    },
  });
}

// Hook to retry failed syncs (disabled by default to prevent spam)
// This can be manually triggered when needed
export function useRetryFailedSyncs() {
  // Disabled for now - automatic retries were causing infinite loops
  // Users can manually retry by refreshing the page or we can add a manual retry button
}

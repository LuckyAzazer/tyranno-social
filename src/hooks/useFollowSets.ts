/**
 * useFollowSets — manages NIP-51 follow sets (kind 30000, addressable).
 *
 * A "Circle" is a named list of pubkeys. Each is a kind-30000 event where:
 *   - d tag = unique identifier (slug)
 *   - title tag = display name
 *   - p tags = followed pubkeys
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/51.md
 */

import { useNostr } from '@nostrify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

export interface FollowSet {
  id: string;         // event id
  dTag: string;       // unique slug (d tag)
  title: string;      // display name
  pubkeys: string[];  // members
  createdAt: number;
}

export function useFollowSets() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all follow sets for the current user
  const { data: followSets, isLoading } = useQuery({
    queryKey: ['follow-sets', user?.pubkey],
    queryFn: async (): Promise<FollowSet[]> => {
      if (!user?.pubkey) return [];
      const events = await nostr.query([
        { kinds: [30000], authors: [user.pubkey], limit: 50 },
      ]);
      return events.map((e) => ({
        id: e.id,
        dTag: e.tags.find(([t]) => t === 'd')?.[1] ?? e.id,
        title: e.tags.find(([t]) => t === 'title')?.[1] ?? 'Unnamed Circle',
        pubkeys: e.tags.filter(([t]) => t === 'p').map(([, pk]) => pk),
        createdAt: e.created_at,
      }));
    },
    enabled: !!user?.pubkey,
    staleTime: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['follow-sets', user?.pubkey] });

  // Create a new circle
  const { mutate: createCircle, isPending: isCreating } = useMutation({
    mutationFn: async ({ title, dTag }: { title: string; dTag: string }) => {
      if (!user) throw new Error('Not logged in');
      const event = await user.signer.signEvent({
        kind: 30000,
        content: '',
        tags: [['d', dTag], ['title', title]],
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      toast({ title: 'Circle created!' });
      invalidate();
    },
    onError: () => toast({ title: 'Error', description: 'Could not create circle.', variant: 'destructive' }),
  });

  // Delete a circle
  const { mutate: deleteCircle } = useMutation({
    mutationFn: async (dTag: string) => {
      if (!user) throw new Error('Not logged in');
      // Publish a deletion event (NIP-09) for the addressable event
      const event = await user.signer.signEvent({
        kind: 5,
        content: 'Deleting circle',
        tags: [['a', `30000:${user.pubkey}:${dTag}`]],
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      toast({ title: 'Circle deleted' });
      invalidate();
    },
  });

  // Add pubkey to a circle
  const { mutate: addToCircle } = useMutation({
    mutationFn: async ({ dTag, pubkey }: { dTag: string; pubkey: string }) => {
      if (!user) throw new Error('Not logged in');
      const existing = followSets?.find((s) => s.dTag === dTag);
      if (!existing) throw new Error('Circle not found');
      if (existing.pubkeys.includes(pubkey)) return; // already there
      const newTags: string[][] = [
        ['d', dTag],
        ['title', existing.title],
        ...existing.pubkeys.map((pk) => ['p', pk]),
        ['p', pubkey],
      ];
      const event = await user.signer.signEvent({
        kind: 30000,
        content: '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
    },
    onSuccess: () => { toast({ title: 'Added to circle' }); invalidate(); },
    onError: () => toast({ title: 'Error', description: 'Could not add to circle.', variant: 'destructive' }),
  });

  // Remove pubkey from a circle
  const { mutate: removeFromCircle } = useMutation({
    mutationFn: async ({ dTag, pubkey }: { dTag: string; pubkey: string }) => {
      if (!user) throw new Error('Not logged in');
      const existing = followSets?.find((s) => s.dTag === dTag);
      if (!existing) throw new Error('Circle not found');
      const newTags: string[][] = [
        ['d', dTag],
        ['title', existing.title],
        ...existing.pubkeys.filter((pk) => pk !== pubkey).map((pk) => ['p', pk]),
      ];
      const event = await user.signer.signEvent({
        kind: 30000,
        content: '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
    },
    onSuccess: () => { toast({ title: 'Removed from circle' }); invalidate(); },
  });

  // Rename a circle
  const { mutate: renameCircle } = useMutation({
    mutationFn: async ({ dTag, newTitle }: { dTag: string; newTitle: string }) => {
      if (!user) throw new Error('Not logged in');
      const existing = followSets?.find((s) => s.dTag === dTag);
      if (!existing) throw new Error('Circle not found');
      const newTags: string[][] = [
        ['d', dTag],
        ['title', newTitle],
        ...existing.pubkeys.map((pk) => ['p', pk]),
      ];
      const event = await user.signer.signEvent({
        kind: 30000,
        content: '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
    },
    onSuccess: () => { toast({ title: 'Circle renamed' }); invalidate(); },
  });

  return {
    followSets: followSets ?? [],
    isLoading,
    isCreating,
    createCircle,
    deleteCircle,
    addToCircle,
    removeFromCircle,
    renameCircle,
  };
}

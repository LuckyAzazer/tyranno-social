/**
 * usePinnedPost — get and set a user's pinned note (NIP-51 kind 10001).
 *
 * Kind 10001 is a replaceable "pin" list. The first 'e' tag is the pinned note ID.
 */

import { useNostr } from '@nostrify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

export function usePinnedPost(pubkey: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pinnedEventId, isLoading } = useQuery({
    queryKey: ['pinned-post', pubkey],
    queryFn: async () => {
      const events = await nostr.query([
        { kinds: [10001], authors: [pubkey], limit: 1 },
      ]);
      if (!events[0]) return null;
      const eTag = events[0].tags.find(([t]) => t === 'e');
      return eTag?.[1] ?? null;
    },
    staleTime: 60_000,
  });

  const { mutate: pinPost, isPending: isPinning } = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not logged in');
      const event = await user.signer.signEvent({
        kind: 10001,
        content: '',
        tags: [['e', eventId, '', 'mention']],
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-post', pubkey] });
      toast({ title: 'Post pinned!', description: 'This post is now pinned to your profile.' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not pin post.', variant: 'destructive' }),
  });

  const { mutate: unpinPost, isPending: isUnpinning } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      // Publish empty kind 10001 to clear the pin
      const event = await user.signer.signEvent({
        kind: 10001,
        content: '',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinned-post', pubkey] });
      toast({ title: 'Post unpinned' });
    },
  });

  return {
    pinnedEventId,
    isLoading,
    pinPost,
    unpinPost,
    isPending: isPinning || isUnpinning,
  };
}

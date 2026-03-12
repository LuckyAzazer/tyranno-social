/**
 * useFollowUser — follow / unfollow a pubkey by updating the kind-3 contact list.
 *
 * Returns:
 *   isFollowing  — whether the current user already follows `targetPubkey`
 *   follow()     — add them to the contact list
 *   unfollow()   — remove them from the contact list
 *   isPending    — mutation in-flight
 */

import { useNostr } from '@nostrify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

export function useFollowUser(targetPubkey: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the current user's contact list (kind 3)
  const { data: contactList } = useQuery({
    queryKey: ['contact-list', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) return null;
      const events = await nostr.query([
        { kinds: [3], authors: [user.pubkey], limit: 1 },
      ]);
      return events[0] ?? null;
    },
    enabled: !!user?.pubkey,
    staleTime: 30_000,
  });

  const followedPubkeys: string[] = contactList
    ? contactList.tags.filter(([t]) => t === 'p').map(([, pk]) => pk)
    : [];

  const isFollowing = followedPubkeys.includes(targetPubkey);

  const { mutate: follow, isPending: isFollowPending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      const existingTags = contactList?.tags ?? [];
      // Keep all existing tags, add new p tag if not already there
      const alreadyFollowing = existingTags.some(
        ([t, pk]) => t === 'p' && pk === targetPubkey
      );
      if (alreadyFollowing) return;

      const newTags = [...existingTags, ['p', targetPubkey]];
      const event = await user.signer.signEvent({
        kind: 3,
        content: contactList?.content ?? '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-list', user?.pubkey] });
      queryClient.invalidateQueries({ queryKey: ['follows', user?.pubkey] });
      toast({ title: 'Followed!', description: 'You are now following this person.' });
    },
    onError: (err) => {
      console.error('Follow failed:', err);
      toast({ title: 'Error', description: 'Could not follow. Please try again.', variant: 'destructive' });
    },
  });

  const { mutate: unfollow, isPending: isUnfollowPending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      const existingTags = contactList?.tags ?? [];
      const newTags = existingTags.filter(
        ([t, pk]) => !(t === 'p' && pk === targetPubkey)
      );
      const event = await user.signer.signEvent({
        kind: 3,
        content: contactList?.content ?? '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000),
      });
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-list', user?.pubkey] });
      queryClient.invalidateQueries({ queryKey: ['follows', user?.pubkey] });
      toast({ title: 'Unfollowed', description: 'You have unfollowed this person.' });
    },
    onError: (err) => {
      console.error('Unfollow failed:', err);
      toast({ title: 'Error', description: 'Could not unfollow. Please try again.', variant: 'destructive' });
    },
  });

  return {
    isFollowing,
    follow,
    unfollow,
    isPending: isFollowPending || isUnfollowPending,
  };
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { reactionsQueryKey } from '@/hooks/useReactions';

interface EmojiReactionPickerProps {
  eventId: string;
  className?: string;
}

const COMMON_EMOJIS = ['❤️', '👍', '🔥', '😂', '🎉', '🤔', '👏', '⚡'];

export function EmojiReactionPicker({ eventId, className }: EmojiReactionPickerProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { config } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleReaction = (emoji: string) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to react to posts.',
        variant: 'destructive',
      });
      return;
    }

    // Use the same query key as useReactions to ensure cache hits
    const qKey = reactionsQueryKey(eventId, config.relayMetadata.updatedAt);

    // Optimistically update the UI before publishing
    const previousData = queryClient.getQueryData(qKey);
    
    // Optimistic update
    queryClient.setQueryData(qKey, (old: any) => {
      if (!old) {
        return { [emoji]: { count: 1, pubkeys: [user.pubkey] } };
      }
      
      const newData = { ...old };
      if (newData[emoji]) {
        // Check if user already reacted with this emoji
        if (!newData[emoji].pubkeys.includes(user.pubkey)) {
          newData[emoji] = {
            count: newData[emoji].count + 1,
            pubkeys: [...newData[emoji].pubkeys, user.pubkey]
          };
        }
      } else {
        newData[emoji] = { count: 1, pubkeys: [user.pubkey] };
      }
      
      return newData;
    });

    publishEvent(
      {
        kind: 7,
        content: emoji,
        tags: [['e', eventId]],
      },
      {
        onSuccess: () => {
          setOpen(false);
          
          // Invalidate reactions query to trigger refetch and confirm the optimistic update
          queryClient.invalidateQueries({ queryKey: ['reactions', eventId] });
          
          toast({
            title: 'Reaction added!',
            description: `You reacted with ${emoji}`,
          });
        },
        onError: () => {
          // Rollback optimistic update on error
          queryClient.setQueryData(qKey, previousData);
          
          toast({
            title: 'Failed to react',
            description: 'There was an error adding your reaction.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
        >
          <SmilePlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-xl hover:scale-125 transition-transform"
              onClick={() => handleReaction(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

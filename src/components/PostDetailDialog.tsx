import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { genUserName } from '@/lib/genUserName';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { MessageCircle, Repeat2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import { useState } from 'react';

interface PostDetailDialogProps {
  event: NostrEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReplyItem({ reply }: { reply: NostrEvent }) {
  const author = useAuthor(reply.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || genUserName(reply.pubkey);
  const username = metadata?.name || genUserName(reply.pubkey);
  const profileImage = metadata?.picture;
  const npub = nip19.npubEncode(reply.pubkey);

  const timeAgo = formatDistanceToNow(new Date(reply.created_at * 1000), {
    addSuffix: true,
  });

  return (
    <div className="flex gap-3 py-3">
      <a href={`/${npub}`} className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </a>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <a href={`/${npub}`} className="font-semibold text-sm hover:text-primary transition-colors">
            {displayName}
          </a>
          <span className="text-xs text-muted-foreground">@{username}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <div className="text-sm whitespace-pre-wrap break-words">
          <NoteContent event={reply} />
        </div>
      </div>
    </div>
  );
}

export function PostDetailDialog({ event, open, onOpenChange }: PostDetailDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const [replyContent, setReplyContent] = useState('');

  const author = useAuthor(event?.pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions, isLoading: isLoadingReactions } = useReactions(event?.id || '');
  const { data: replies, isLoading: isLoadingReplies } = useReplies(event?.id || '');

  if (!event) return null;

  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const username = metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const handleReply = () => {
    if (!replyContent.trim()) return;

    publishEvent(
      {
        kind: 1,
        content: replyContent.trim(),
        tags: [
          ['e', event.id, '', 'reply'],
          ['p', event.pubkey],
        ],
      },
      {
        onSuccess: () => {
          setReplyContent('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="sr-only">Post Details</DialogTitle>
            </DialogHeader>

            {/* Original Post */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <a href={`/${npub}`} className="shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-background">
                    <AvatarImage src={profileImage} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={`/${npub}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {displayName}
                    </a>
                    <span className="text-sm text-muted-foreground">@{username}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </div>

              <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
                <NoteContent event={event} />
              </div>

              {/* Reactions */}
              {!isLoadingReactions && reactions && Object.keys(reactions).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(reactions).map(([emoji, data]) => (
                    <Badge
                      key={emoji}
                      variant="secondary"
                      className="text-base px-3 py-1 cursor-default"
                    >
                      {emoji} {data.count}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {replies?.length || 0}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                >
                  <Repeat2 className="h-4 w-4" />
                </Button>
                <EmojiReactionPicker
                  eventId={event.id}
                  className="h-8 px-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Reply Form */}
            {user && (
              <div className="space-y-3 mb-6">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                  disabled={isPending}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleReply}
                    disabled={isPending || !replyContent.trim()}
                    size="sm"
                  >
                    {isPending ? (
                      <>Posting...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Replies Thread */}
            <div className="space-y-1">
              <h3 className="font-semibold mb-3">
                Replies {replies && replies.length > 0 && `(${replies.length})`}
              </h3>

              {isLoadingReplies ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : replies && replies.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {replies.map((reply) => (
                    <ReplyItem key={reply.id} reply={reply} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No replies yet. Be the first to reply!
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

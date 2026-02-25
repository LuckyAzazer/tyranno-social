import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useRepostedEvent } from '@/hooks/useRepostedEvent';
import { useFollows } from '@/hooks/useFollows';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { MediaContent } from '@/components/MediaContent';
import { ZapButton } from '@/components/ZapButton';
import { BookmarkDialog } from '@/components/BookmarkDialog';
import { MessageCircle, Repeat2, Send, Bookmark, MoreHorizontal, Copy, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import { useState } from 'react';

interface PostDetailDialogProps {
  event: NostrEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReplyItem({ reply, isFollowing }: { reply: NostrEvent; isFollowing?: boolean }) {
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
    <div className={`flex gap-3 py-3 ${isFollowing ? 'bg-primary/5 -mx-4 px-4 rounded-lg' : ''}`}>
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
        <div className="space-y-2">
          <div className="text-sm whitespace-pre-wrap break-words">
            <NoteContent event={reply} />
          </div>
          <MediaContent event={reply} />
        </div>
      </div>
    </div>
  );
}

export function PostDetailDialog({ event, open, onOpenChange }: PostDetailDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState('');
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  // Check if this is a repost
  const isRepost = event && (event.kind === 6 || event.kind === 16);
  const { data: repostedEvent } = useRepostedEvent(event || {} as NostrEvent);
  
  // Use reposted event for display if available, otherwise use original
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const reposter = useAuthor(event?.pubkey || '');

  const author = useAuthor(displayEvent?.pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions, isLoading: isLoadingReactions } = useReactions(displayEvent?.id || '');
  const { data: replies, isLoading: isLoadingReplies } = useReplies(displayEvent?.id || '');
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);

  // Bookmarks
  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(displayEvent?.id || '');

  if (!event || !displayEvent) return null;

  // Sort replies to prioritize follows
  const sortedReplies = replies?.slice().sort((a, b) => {
    const aIsFollow = followPubkeys.includes(a.pubkey);
    const bIsFollow = followPubkeys.includes(b.pubkey);
    
    // Follows come first
    if (aIsFollow && !bIsFollow) return -1;
    if (!aIsFollow && bIsFollow) return 1;
    
    // Then sort by time (newest first)
    return b.created_at - a.created_at;
  });

  const displayName = metadata?.display_name || metadata?.name || genUserName(displayEvent.pubkey);
  const username = metadata?.name || genUserName(displayEvent.pubkey);
  const profileImage = metadata?.picture;
  const npub = nip19.npubEncode(displayEvent.pubkey);

  // Reposter info
  const reposterMetadata: NostrMetadata | undefined = reposter.data?.metadata;
  const reposterName = reposterMetadata?.display_name || reposterMetadata?.name || genUserName(event?.pubkey || '');

  const timeAgo = formatDistanceToNow(new Date(displayEvent.created_at * 1000), {
    addSuffix: true,
  });

  const handleReply = () => {
    if (!replyContent.trim()) return;

    publishEvent(
      {
        kind: 1,
        content: replyContent.trim(),
        tags: [
          ['e', displayEvent.id, '', 'reply'],
          ['p', displayEvent.pubkey],
        ],
      },
      {
        onSuccess: () => {
          setReplyContent('');
        },
      }
    );
  };

  const handleBookmarkClick = () => {
    if (isBookmarked) {
      // If already bookmarked, remove it directly
      toggleBookmark.mutate({ eventId: displayEvent.id, isPrivate: false });
    } else {
      // If not bookmarked, show dialog to choose public/private
      setBookmarkDialogOpen(true);
    }
  };

  const handleBookmarkConfirm = (isPrivate: boolean) => {
    toggleBookmark.mutate({ eventId: displayEvent.id, isPrivate });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
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
              {isRepost && repostedEvent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b border-border/50">
                  <Repeat2 className="h-4 w-4" />
                  <span>{reposterName} reposted</span>
                </div>
              )}
              
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

              <div className="space-y-4">
                <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  <NoteContent event={displayEvent} />
                </div>
                
                {/* Media Content */}
                <MediaContent event={displayEvent} />
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
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1">
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
                  <ZapButton
                    target={displayEvent as any}
                    className="h-8 px-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center gap-1"
                    showCount={true}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 transition-colors ${
                      isBookmarked 
                        ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10' 
                        : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                    }`}
                    onClick={handleBookmarkClick}
                    title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </Button>
                  <EmojiReactionPicker
                    eventId={displayEvent.id}
                    className="h-8 px-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                  />
                </div>

                {/* More options menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(displayEvent.id, 'Event ID')}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Event ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(displayEvent.pubkey, 'User ID')}
                      className="gap-2 cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      Copy User ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(nip19.noteEncode(displayEvent.id), 'Note ID (note1)')}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Note ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(npub, 'User npub')}
                      className="gap-2 cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      Copy User npub
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              ) : sortedReplies && sortedReplies.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {sortedReplies.map((reply) => {
                    const isFollowing = followPubkeys.includes(reply.pubkey);
                    return (
                      <ReplyItem key={reply.id} reply={reply} isFollowing={isFollowing} />
                    );
                  })}
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

      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onConfirm={handleBookmarkConfirm}
        isBookmarked={!!isBookmarked}
      />
    </Dialog>
  );
}

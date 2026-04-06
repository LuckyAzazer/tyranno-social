import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useRepostedEvent } from '@/hooks/useRepostedEvent';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useMutedUsers } from '@/hooks/useMutedUsers';
import { genUserName } from '@/lib/genUserName';
import { formatEventTime } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { MediaContent } from '@/components/MediaContent';
import { ZapButton } from '@/components/ZapButton';
import { BookmarkListsDialog } from '@/components/BookmarkListsDialog';
import { ContentWarningWrapper } from '@/components/ContentWarningWrapper';
import { nip19 } from 'nostr-tools';
import { MessageCircle, Repeat2, Bookmark, MoreHorizontal, Copy, User, VolumeX, Pin, PinOff, Send, X } from 'lucide-react';
import { usePinnedPost } from '@/hooks/usePinnedPost';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { FollowButton } from '@/components/FollowButton';
import { FollowRepliesPreview } from '@/components/FollowRepliesPreview';
import { RepostDialog } from '@/components/RepostDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  event: NostrEvent;
  onClick?: (displayEvent: NostrEvent) => void;
}

export function PostCard({ event, onClick }: PostCardProps) {
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { user, metadata: currentUserMeta } = useCurrentUser();
  const { mutate: publish, isPending: isReplying } = useNostrPublish();
  const { mute, unmute, isMuted } = useMutedUsers();
  const { pinnedEventId, pinPost, unpinPost } = usePinnedPost(user?.pubkey ?? '');
  
  const isRepost = event.kind === 6 || event.kind === 16;
  const { data: repostedEvent } = useRepostedEvent(event);
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const reposter = useAuthor(event.pubkey);
  
  const author = useAuthor(displayEvent.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions } = useReactions(displayEvent.id);
  const { data: replies } = useReplies(displayEvent.id);

  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(displayEvent.id);
  const { toast } = useToast();

  const displayName = metadata?.display_name || metadata?.name || genUserName(displayEvent.pubkey);
  const username = metadata?.name || genUserName(displayEvent.pubkey);
  const profileImage = metadata?.picture;

  const npub = nip19.npubEncode(displayEvent.pubkey);
  const noteId = nip19.noteEncode(displayEvent.id);
  const timeAgo = formatEventTime(displayEvent.created_at);

  const reposterMetadata: NostrMetadata | undefined = reposter.data?.metadata;
  const reposterName = reposterMetadata?.display_name || reposterMetadata?.name || genUserName(event.pubkey);

  const replyCount = replies?.length || 0;
  
  const userReaction = reactions && user
    ? Object.entries(reactions).find(([, data]) => data.pubkeys.includes(user.pubkey))
    : null;

  const topReactions = reactions
    ? (() => {
        const sorted = Object.entries(reactions).sort((a, b) => b[1].count - a[1].count);
        if (userReaction) {
          const userReactionInTop = sorted.slice(0, 3).some(([emoji]) => emoji === userReaction[0]);
          if (!userReactionInTop) {
            return [sorted[0], sorted[1], userReaction].filter(Boolean);
          }
        }
        return sorted.slice(0, 3);
      })()
    : [];

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to bookmark posts',
        variant: 'destructive',
      });
      return;
    }
    setBookmarkDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy to clipboard', variant: 'destructive' });
    }
  };

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/20 dark:border-transparent cursor-pointer bg-gradient-to-br from-card via-card to-rose-50/20 dark:from-card dark:via-card dark:to-card"
      onClick={() => onClick?.(displayEvent)}
    >
      {isRepost && repostedEvent && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Repeat2 className="h-3 w-3" />
            <span>{reposterName} reposted</span>
          </div>
        </div>
      )}

      <CardHeader className={isRepost && repostedEvent ? "pb-3 pt-2" : "pb-3"}>
        <div className="flex items-start gap-3">
          <Link
            to={`/${npub}`}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-10 w-10 ring-2 ring-background transition-all group-hover:ring-primary/20">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/${npub}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayName}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">@{username}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div onClick={(e) => e.stopPropagation()}>
                  <FollowButton pubkey={displayEvent.pubkey} iconOnly />
                </div>
                <Link
                  to={`/${noteId}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {timeAgo}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {/* Post text — clicking here opens the dialog */}
        <div className="mb-4 break-words whitespace-pre-wrap">
          <NoteContent event={displayEvent} className="text-sm leading-relaxed" />
        </div>

        {/* Media */}
        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
          <ContentWarningWrapper event={displayEvent} mediaOnly={true}>
            <MediaContent event={displayEvent} />
          </ContentWarningWrapper>
        </div>

        {/* Reactions */}
        {topReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topReactions.map(([emoji, data]) => {
              const isUserReaction = user && data.pubkeys.includes(user.pubkey);
              return (
                <Badge
                  key={emoji}
                  variant={isUserReaction ? "default" : "secondary"}
                  className={`text-xs px-2 py-0.5 cursor-default dark:bg-card dark:text-foreground dark:border dark:border-border/30 ${
                    isUserReaction ? 'ring-2 ring-primary/50' : ''
                  }`}
                >
                  {emoji} {data.count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Action bar */}
        <div
          className="flex items-center justify-between pt-2 border-t border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-1.5 flex items-center justify-center gap-1 transition-colors ${
                replyOpen
                  ? 'text-blue-500 bg-blue-500/10'
                  : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) {
                  onClick?.(displayEvent);
                  return;
                }
                setReplyOpen((prev) => !prev);
              }}
              title="Reply"
            >
              <MessageCircle className="h-4 w-4" />
              {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
              onClick={() => {
                if (!user) {
                  toast({ title: 'Login required', description: 'Please log in to repost.', variant: 'destructive' });
                  return;
                }
                setRepostDialogOpen(true);
              }}
              title="Repost or Quote Post"
            >
              <Repeat2 className="h-4 w-4" />
            </Button>
            <ZapButton
              target={displayEvent as any}
              className="h-8 px-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center justify-center gap-1"
              showCount={true}
            />
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 flex items-center justify-center transition-colors ${
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
              className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
                onClick={() => copyToClipboard(noteId, 'Note ID (note1)')}
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
              {/* Pin option — only for own posts */}
              {user && user.pubkey === displayEvent.pubkey && (
                <>
                  <DropdownMenuSeparator />
                  {pinnedEventId === displayEvent.id ? (
                    <DropdownMenuItem
                      onClick={() => unpinPost()}
                      className="gap-2 cursor-pointer text-primary focus:text-primary focus:bg-primary/5"
                    >
                      <PinOff className="h-4 w-4" />
                      Unpin from Profile
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => pinPost(displayEvent.id)}
                      className="gap-2 cursor-pointer text-primary focus:text-primary focus:bg-primary/5"
                    >
                      <Pin className="h-4 w-4" />
                      Pin to Profile
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              {isMuted(displayEvent.pubkey) ? (
                <DropdownMenuItem
                  onClick={() => {
                    unmute(displayEvent.pubkey);
                    toast({ title: 'Unmuted', description: 'You will see posts from this user again.' });
                  }}
                  className="gap-2 cursor-pointer text-blue-600 dark:text-blue-400 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30"
                >
                  <VolumeX className="h-4 w-4" />
                  Unmute User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    mute(displayEvent.pubkey);
                    toast({ title: 'User muted', description: 'You will no longer see posts from this user.' });
                  }}
                  className="gap-2 cursor-pointer text-orange-600 dark:text-orange-400 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/30"
                >
                  <VolumeX className="h-4 w-4" />
                  Mute User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Inline reply composer — shown when reply button is toggled */}
        {replyOpen && user && (
          <div
            className="mt-3 pt-3 border-t border-border/40 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 items-start">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={currentUserMeta?.picture} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(currentUserMeta?.name ?? currentUserMeta?.display_name ?? '?')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={`Reply to ${displayName}…`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="resize-none text-sm min-h-0 py-2"
                  disabled={isReplying}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
                  }}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground gap-1"
                    onClick={() => { setReplyOpen(false); setReplyText(''); }}
                    disabled={isReplying}
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs gap-1.5"
                    disabled={isReplying || !replyText.trim()}
                    onClick={() => {
                      publish(
                        {
                          kind: 1,
                          content: replyText.trim(),
                          tags: [
                            ['e', displayEvent.id, '', 'reply'],
                            ['p', displayEvent.pubkey],
                          ],
                        },
                        {
                          onSuccess: () => {
                            setReplyText('');
                            setReplyOpen(false);
                            toast({ title: 'Reply posted!' });
                          },
                        }
                      );
                    }}
                  >
                    <Send className="h-3 w-3" />
                    {isReplying ? 'Posting…' : 'Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replies from people you follow */}
        <div onClick={(e) => e.stopPropagation()}>
          <FollowRepliesPreview
            event={displayEvent}
            onReplyClick={(reply) => onClick?.(reply)}
          />
        </div>
      </CardContent>

      <BookmarkListsDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        eventId={event.id}
      />
      <RepostDialog
        event={displayEvent}
        open={repostDialogOpen}
        onOpenChange={setRepostDialogOpen}
      />
    </Card>
  );
}

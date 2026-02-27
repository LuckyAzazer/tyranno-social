import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useRepostedEvent } from '@/hooks/useRepostedEvent';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
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
import { MessageCircle, Repeat2, Bookmark, MoreHorizontal, Copy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onClick?: () => void;
}

export function PostCard({ event, onClick }: PostCardProps) {
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const { user } = useCurrentUser();
  
  // Check if this is a repost
  const isRepost = event.kind === 6 || event.kind === 16;
  const { data: repostedEvent } = useRepostedEvent(event);

  // Use reposted event for display if available, otherwise use original
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const reposter = useAuthor(event.pubkey);
  
  const author = useAuthor(displayEvent.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions } = useReactions(displayEvent.id);
  const { data: replies } = useReplies(displayEvent.id);

  // Bookmarks
  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(displayEvent.id);
  const { toast } = useToast();

  const displayName = metadata?.display_name || metadata?.name || genUserName(displayEvent.pubkey);
  const username = metadata?.name || genUserName(displayEvent.pubkey);
  const profileImage = metadata?.picture;

  const npub = nip19.npubEncode(displayEvent.pubkey);
  const noteId = nip19.noteEncode(displayEvent.id);

  const timeAgo = formatEventTime(displayEvent.created_at);

  // Reposter info
  const reposterMetadata: NostrMetadata | undefined = reposter.data?.metadata;
  const reposterName = reposterMetadata?.display_name || reposterMetadata?.name || genUserName(event.pubkey);

  const replyCount = replies?.length || 0;
  
  // Get user's reaction if they reacted
  const userReaction = reactions && user
    ? Object.entries(reactions).find(([emoji, data]) => data.pubkeys.includes(user.pubkey))
    : null;

  // Get top reactions, ensuring user's reaction is included
  const topReactions = reactions
    ? (() => {
        const sorted = Object.entries(reactions).sort((a, b) => b[1].count - a[1].count);
        
        // If user reacted and their reaction isn't in top 3, include it
        if (userReaction) {
          const userReactionInTop = sorted.slice(0, 3).some(([emoji]) => emoji === userReaction[0]);
          if (!userReactionInTop) {
            // Replace the 3rd reaction with user's reaction
            return [sorted[0], sorted[1], userReaction].filter(Boolean);
          }
        }
        
        return sorted.slice(0, 3);
      })()
    : [];

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on links, buttons, or images
    const target = e.target as HTMLElement;
    if (target.closest('a, button') || target.tagName === 'IMG') {
      return;
    }
    onClick?.();
  };

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

    // Always show the lists dialog to choose which list to add to
    setBookmarkDialogOpen(true);
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
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/20 dark:border-transparent cursor-pointer bg-gradient-to-br from-card via-card to-rose-50/20 dark:from-card dark:via-card dark:to-card"
      onClick={handleCardClick}
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
          <Link to={`/${npub}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
              <Link
                to={`/${noteId}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {timeAgo}
              </Link>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mb-4 break-words whitespace-pre-wrap">
          <NoteContent event={displayEvent} className="text-sm leading-relaxed" />
        </div>

        {/* Media Display (images, videos, link previews) */}
        <div className="mb-4">
          <ContentWarningWrapper event={displayEvent} mediaOnly={true}>
            <MediaContent event={displayEvent} />
          </ContentWarningWrapper>
        </div>

        {/* Reactions Display */}
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

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {replyCount > 0 && <span className="text-xs">{replyCount}</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Add repost functionality if needed
              }}
            >
              <Repeat2 className="h-4 w-4" />
            </Button>
            <div onClick={(e) => e.stopPropagation()}>
              <ZapButton
                target={displayEvent as any}
                className="h-8 px-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center gap-1"
                showCount={true}
              />
            </div>
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
              className="h-8 px-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            />
          </div>

          {/* More options menu */}
          <div onClick={(e) => e.stopPropagation()}>
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
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(displayEvent.id, 'Event ID');
                }}
                className="gap-2 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Copy Event ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(displayEvent.pubkey, 'User ID');
                }}
                className="gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                Copy User ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(noteId, 'Note ID (note1)');
                }}
                className="gap-2 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Copy Note ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(npub, 'User npub');
                }}
                className="gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                Copy User npub
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      {/* Bookmark Dialog */}
      <BookmarkListsDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        eventId={event.id}
      />
    </Card>
  );
}

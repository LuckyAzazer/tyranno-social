import { useSeoMeta } from '@unhead/react';
import { useNote } from '@/hooks/useNote';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { ZapButton } from '@/components/ZapButton';
import { BookmarkListsDialog } from '@/components/BookmarkListsDialog';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ContentWarningWrapper } from '@/components/ContentWarningWrapper';
import { genUserName } from '@/lib/genUserName';
import { ArrowLeft, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import { useState } from 'react';
import type { NostrMetadata } from '@nostrify/nostrify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotePageProps {
  eventId: string;
}

export function NotePage({ eventId }: NotePageProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { data: event, isLoading: isLoadingNote } = useNote(eventId);
  const author = useAuthor(event?.pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions } = useReactions(event?.id || '');
  const { data: replies } = useReplies(event?.id || '');

  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(event?.id || '');

  const displayName = metadata?.display_name || metadata?.name || genUserName(event?.pubkey || '');
  const username = metadata?.name || genUserName(event?.pubkey || '');
  const profileImage = metadata?.picture;

  useSeoMeta({
    title: event ? `${displayName} on Tyrannosocial` : 'Loading...',
    description: event?.content.slice(0, 160) || 'View this post on Tyrannosocial',
  });

  if (isLoadingNote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-24 mb-6" />
            <Card className="dark:border-transparent">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="dark:border-transparent">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">Post not found.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const npub = nip19.npubEncode(event.pubkey);
  const noteId = nip19.noteEncode(event.id);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

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

  const handleBookmarkClick = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="shadow-lg border-border/50 dark:border-transparent mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <a href={`/${npub}`} className="shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-background transition-all hover:ring-primary/20">
                    <AvatarImage src={profileImage} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </a>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/${npub}`}
                    className="font-semibold text-lg hover:text-primary transition-colors"
                  >
                    {displayName}
                  </a>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
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
                      onClick={() => copyToClipboard(event.id, 'Event ID')}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Event ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(noteId, 'Note ID')}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Note ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => copyToClipboard(event.pubkey, 'Author Pubkey')}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Author Pubkey
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
                <NoteContent event={event} />
              </div>

              {/* Media content */}
              <ContentWarningWrapper event={event} mediaOnly={true}>
                <MediaContent event={event} />
              </ContentWarningWrapper>

              {/* Reaction badges */}
              {topReactions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topReactions.map(([emoji, data]) => {
                    const isUserReaction = userReaction && userReaction[0] === emoji;
                    
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

              <Separator />

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Reply
                    {replyCount > 0 && <span className="ml-1 text-xs">({replyCount})</span>}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <Repeat2 className="h-4 w-4 mr-2" />
                    Repost
                  </Button>
                  <ZapButton
                    target={event as any}
                    className="h-9 px-3 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors flex items-center gap-2"
                    showCount={true}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-9 px-3 transition-colors ${
                      isBookmarked 
                        ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10' 
                        : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                    }`}
                    onClick={handleBookmarkClick}
                    title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                    {isBookmarked ? 'Saved' : 'Save'}
                  </Button>
                  <EmojiReactionPicker
                    eventId={event.id}
                    className="h-9 px-3 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <div className="mt-6">
            <CommentsSection root={event} />
          </div>
        </div>
      </div>

      {/* Bookmark Dialog */}
      <BookmarkListsDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        eventId={event.id}
      />
    </div>
  );
}

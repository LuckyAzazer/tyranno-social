import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { useFollows } from '@/hooks/useFollows';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { ZapButton } from '@/components/ZapButton';
import { BookmarkDialog } from '@/components/BookmarkDialog';
import { MessageCircle, Repeat2, Send, Bookmark, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface AddressableEventPageProps {
  kind: number;
  pubkey: string;
  identifier: string;
}

export function AddressableEventPage({ kind, pubkey, identifier }: AddressableEventPageProps) {
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState('');
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['addressable-event-page', kind, pubkey, identifier, config.relayMetadata.updatedAt],
    queryFn: async () => {
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      const events = await relayGroup.query([
        {
          kinds: [kind],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1,
        },
      ]);

      return events[0] || null;
    },
  });

  const author = useAuthor(event?.pubkey || pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  // Get reactions, replies, and bookmarks
  const { data: reactions, isLoading: isLoadingReactions } = useReactions(event?.id || '');
  const { data: replies, isLoading: isLoadingReplies } = useReplies(event?.id || '');
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);
  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(event?.id || '');

  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const username = metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;
  const npub = nip19.npubEncode(pubkey);

  // Extract metadata from tags
  const title = event?.tags.find(([name]) => name === 'title')?.[1];
  const summary = event?.tags.find(([name]) => name === 'summary')?.[1];
  const image = event?.tags.find(([name]) => name === 'image')?.[1];
  const publishedAt = event?.tags.find(([name]) => name === 'published_at')?.[1];

  const timeAgo = event 
    ? formatDistanceToNow(new Date((publishedAt ? parseInt(publishedAt) : event.created_at) * 1000), {
        addSuffix: true,
      })
    : '';

  // Get kind name for display
  const getKindName = (k: number): string => {
    const kindNames: Record<number, string> = {
      30023: 'Article',
      30311: 'Live Event',
      30402: 'Classified Listing',
      34550: 'Community',
      30078: 'App Data',
      31922: 'Calendar Event',
      31923: 'Calendar Event',
      30024: 'Draft Article',
      30403: 'Draft Listing',
    };
    return kindNames[k] || `Kind ${k}`;
  };

  const kindName = getKindName(kind);

  // Sort replies to prioritize follows
  const sortedReplies = replies?.slice().sort((a, b) => {
    const aIsFollow = followPubkeys.includes(a.pubkey);
    const bIsFollow = followPubkeys.includes(b.pubkey);
    
    if (aIsFollow && !bIsFollow) return -1;
    if (!aIsFollow && bIsFollow) return 1;
    
    return b.created_at - a.created_at;
  });

  const handleReply = () => {
    if (!replyContent.trim() || !event) return;

    // Create an 'a' tag for addressable events
    const aTag = `${event.kind}:${event.pubkey}:${identifier}`;

    publishEvent(
      {
        kind: 1,
        content: replyContent.trim(),
        tags: [
          ['a', aTag, '', 'reply'],
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

  const handleBookmarkClick = () => {
    if (!event) return;
    
    if (isBookmarked) {
      toggleBookmark.mutate({ eventId: event.id, isPrivate: false });
    } else {
      setBookmarkDialogOpen(true);
    }
  };

  const handleBookmarkConfirm = (isPrivate: boolean) => {
    if (!event) return;
    toggleBookmark.mutate({ eventId: event.id, isPrivate });
  };

  useSeoMeta({
    title: title ? `${title} - Tyrannosocial` : `${kindName} - Tyrannosocial`,
    description: summary || event?.content.substring(0, 200) || `View this ${kindName} on Tyrannosocial`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {isLoading ? (
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : !event ? (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <p className="text-muted-foreground">Event not found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
          <Card>
            <CardHeader className="space-y-4">
              {/* Author Info */}
              <div className="flex items-start gap-4">
                <Link to={`/${npub}`}>
                  <Avatar className="h-12 w-12 ring-2 ring-background">
                    <AvatarImage src={profileImage} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/${npub}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {displayName}
                    </Link>
                    <span className="text-sm text-muted-foreground">@{username}</span>
                    <Badge variant="secondary">
                      {kindName}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
              </div>

              {/* Title */}
              {title && (
                <h1 className="text-3xl font-bold">{title}</h1>
              )}

              {/* Summary */}
              {summary && (
                <p className="text-muted-foreground text-lg">{summary}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Featured Image */}
              {image && (
                <img 
                  src={image} 
                  alt={title || 'Event image'} 
                  className="w-full rounded-lg object-cover max-h-96"
                />
              )}

              {/* Content */}
              {event.content && (
                <div className="prose prose-sm sm:prose-base max-w-none">
                  <NoteContent event={event} />
                </div>
              )}

              {/* Media Content */}
              <MediaContent event={event} />

              {/* Reactions Display */}
              {!isLoadingReactions && reactions && Object.keys(reactions).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                  {Object.entries(reactions).map(([emoji, data]) => {
                    const isUserReaction = user && data.pubkeys.includes(user.pubkey);
                    return (
                      <Badge
                        key={emoji}
                        variant={isUserReaction ? "default" : "secondary"}
                        className={`text-base px-3 py-1 cursor-default ${
                          isUserReaction ? 'ring-2 ring-primary/50' : ''
                        }`}
                      >
                        {emoji} {data.count}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
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
                    target={event as any}
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
                    eventId={event.id}
                    className="h-8 px-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reply Form and Replies Thread */}
          {(
            <Card className="mt-6">
              <CardContent className="pt-6">
                <Separator className="mb-6" />

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
              </CardContent>
            </Card>
          )}

          {/* Bookmark Dialog */}
          <BookmarkDialog
            open={bookmarkDialogOpen}
            onOpenChange={setBookmarkDialogOpen}
            onConfirm={handleBookmarkConfirm}
            isBookmarked={!!isBookmarked}
          />
          </>
        )}
      </div>
    </div>
  );
}

// Reply item component
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
      <Link to={`/${npub}`} className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link to={`/${npub}`} className="font-semibold text-sm hover:text-primary transition-colors">
            {displayName}
          </Link>
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

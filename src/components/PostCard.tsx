import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { useReplies } from '@/hooks/useReplies';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import { MessageCircle, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  event: NostrEvent;
  onClick?: () => void;
}

export function PostCard({ event, onClick }: PostCardProps) {
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const { data: reactions } = useReactions(event.id);
  const { data: replies } = useReplies(event.id);

  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const username = metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;

  const npub = nip19.npubEncode(event.pubkey);
  const noteId = nip19.noteEncode(event.id);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  const replyCount = replies?.length || 0;
  const topReactions = reactions
    ? Object.entries(reactions)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
    : [];

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on links or buttons
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    onClick?.();
  };

  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/20 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <a href={`/${npub}`} className="shrink-0">
            <Avatar className="h-10 w-10 ring-2 ring-background transition-all group-hover:ring-primary/20">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </a>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <a
                  href={`/${npub}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {displayName}
                </a>
                <p className="text-xs text-muted-foreground line-clamp-1">@{username}</p>
              </div>
              <a
                href={`/${noteId}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {timeAgo}
              </a>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mb-4 break-words whitespace-pre-wrap">
          <NoteContent event={event} className="text-sm leading-relaxed" />
        </div>

        {/* Reactions Display */}
        {topReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {topReactions.map(([emoji, data]) => (
              <Badge
                key={emoji}
                variant="secondary"
                className="text-xs px-2 py-0.5 cursor-default"
              >
                {emoji} {data.count}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-border/50">
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
          <EmojiReactionPicker
            eventId={event.id}
            className="h-8 px-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
          />
        </div>
      </CardContent>
    </Card>
  );
}

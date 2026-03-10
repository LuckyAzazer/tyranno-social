import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowReplies } from '@/hooks/useFollowReplies';
import { NoteContent } from '@/components/NoteContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { genUserName } from '@/lib/genUserName';
import { formatEventTime } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

interface FollowRepliesPreviewProps {
  event: NostrEvent;
  onReplyClick: (reply: NostrEvent) => void;
}

function ReplyRow({ reply, onReplyClick }: { reply: NostrEvent; onReplyClick: (reply: NostrEvent) => void }) {
  const author = useAuthor(reply.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(reply.pubkey);
  const npub = nip19.npubEncode(reply.pubkey);
  const timeAgo = formatEventTime(reply.created_at);

  return (
    <div
      className="flex gap-2.5 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group/reply"
      onClick={(e) => {
        e.stopPropagation();
        onReplyClick(reply);
      }}
    >
      <Link
        to={`/${npub}`}
        className="shrink-0 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar className="h-6 w-6 ring-1 ring-background">
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <Link
            to={`/${npub}`}
            className="text-xs font-semibold text-foreground hover:text-primary transition-colors shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </Link>
          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2 group-hover/reply:text-foreground transition-colors">
          <NoteContent event={reply} />
        </div>
      </div>
    </div>
  );
}

export function FollowRepliesPreview({ event, onReplyClick }: FollowRepliesPreviewProps) {
  const { data: replies, isLoading } = useFollowReplies(event.id);

  if (isLoading || !replies || replies.length === 0) return null;

  return (
    <div className="mt-2 border-t border-border/40 pt-2 space-y-0.5">
      <div className="flex items-center gap-1.5 px-3 mb-1">
        <MessageCircle className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Replies from follows
        </span>
      </div>
      {replies.map(reply => (
        <ReplyRow key={reply.id} reply={reply} onReplyClick={onReplyClick} />
      ))}
    </div>
  );
}

/**
 * PostModal — click a post card to open this overlay.
 *
 * Shows the full post (text + media + reactions + actions) and all replies.
 * Replies from people the logged-in user follows are highlighted at the top.
 * Logged-in users can write a reply directly from this modal.
 */

import { useState } from 'react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { X, Send, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Copy, User, Users, Share2, ArrowUpLeft } from 'lucide-react';
import { RepostDialog } from '@/components/RepostDialog';

import { useAuthor } from '@/hooks/useAuthor';
import { useReplies } from '@/hooks/useReplies';
import { useReactions } from '@/hooks/useReactions';
import { useFollows } from '@/hooks/useFollows';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useBookmarkPost } from '@/hooks/useBookmarkPost';
import { useToast } from '@/hooks/useToast';
import { useEventById } from '@/hooks/useEventById';
import { genUserName } from '@/lib/genUserName';

import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';
import { ContentWarningWrapper } from '@/components/ContentWarningWrapper';
import { ZapButton } from '@/components/ZapButton';
import { EmojiReactionPicker } from '@/components/EmojiReactionPicker';
import { BookmarkListsDialog } from '@/components/BookmarkListsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─────────────────────────────────────────────────────────── */
/* Reply row                                                    */
/* ─────────────────────────────────────────────────────────── */

function ReplyRow({
  reply,
  isFollow,
  onClose,
}: {
  reply: NostrEvent;
  isFollow: boolean;
  onClose: () => void;
}) {
  const author = useAuthor(reply.pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(reply.pubkey);
  const handle = meta?.name || genUserName(reply.pubkey);
  const npub = nip19.npubEncode(reply.pubkey);
  const time = formatDistanceToNow(new Date(reply.created_at * 1000), { addSuffix: true });

  return (
    <div className={`flex gap-3 py-3 px-1 ${isFollow ? 'bg-primary/5 rounded-lg px-3' : ''}`}>
      <Link to={`/${npub}`} onClick={onClose} className="shrink-0 mt-0.5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={meta?.picture} alt={name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <Link to={`/${npub}`} onClick={onClose} className="text-sm font-semibold hover:text-primary transition-colors">
            {name}
          </Link>
          <span className="text-xs text-muted-foreground">@{handle}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {isFollow && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              <Users className="h-2.5 w-2.5 mr-1" />
              Following
            </Badge>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          <NoteContent event={reply} />
        </div>
        <div className="mt-1">
          <ContentWarningWrapper event={reply} mediaOnly>
            <MediaContent event={reply} />
          </ContentWarningWrapper>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Parent post context (thread view)                           */
/* ─────────────────────────────────────────────────────────── */

function ParentPostContext({
  event,
  onClose,
}: {
  event: NostrEvent;
  onClose: () => void;
}) {
  const author = useAuthor(event.pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(event.pubkey);
  const handle = meta?.name || genUserName(event.pubkey);
  const npub = nip19.npubEncode(event.pubkey);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <ArrowUpLeft className="h-3.5 w-3.5" />
        <span>Replying to</span>
      </div>
      <div className="flex gap-3">
        <Link to={`/${npub}`} onClick={onClose} className="shrink-0">
          <Avatar className="h-7 w-7">
            <AvatarImage src={meta?.picture} alt={name} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/${npub}`}
              onClick={onClose}
              className="text-xs font-semibold hover:text-primary transition-colors"
            >
              {name}
            </Link>
            <span className="text-xs text-muted-foreground">@{handle}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3 whitespace-pre-wrap break-words leading-relaxed">
            <NoteContent event={event} />
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Main modal                                                   */
/* ─────────────────────────────────────────────────────────── */

interface PostModalProps {
  event: NostrEvent;
  onClose: () => void;
}

export function PostModal({ event, onClose }: PostModalProps) {
  const [replyText, setReplyText] = useState('');
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);

  const { user } = useCurrentUser();
  const { mutate: publish, isPending } = useNostrPublish();
  const { toast } = useToast();

  const author = useAuthor(event.pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(event.pubkey);
  const handle = meta?.name || genUserName(event.pubkey);
  const npub = nip19.npubEncode(event.pubkey);
  const time = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  const { data: reactions } = useReactions(event.id);
  const { data: replies, isLoading: loadingReplies } = useReplies(event.id);
  const { data: followPubkeys = [] } = useFollows(user?.pubkey);
  const { toggleBookmark, useIsBookmarked } = useBookmarkPost();
  const { data: isBookmarked } = useIsBookmarked(event.id);

  // Thread view — look for parent event via 'e' tag with 'reply' or 'root' marker
  const parentEventId = (() => {
    const replyTag = event.tags.find(([t, , , marker]) => t === 'e' && (marker === 'reply' || marker === 'root'));
    if (replyTag) return replyTag[1];
    // Fallback: first 'e' tag without a marker (older NIP-10 style)
    const firstETag = event.tags.find(([t]) => t === 'e');
    return firstETag?.[1] ?? null;
  })();
  const { data: parentEvent } = useEventById(parentEventId);

  // Sort: follows first, then oldest-first within each group
  const sortedReplies = replies
    ? [...replies].sort((a, b) => {
        const aF = followPubkeys.includes(a.pubkey);
        const bF = followPubkeys.includes(b.pubkey);
        if (aF && !bF) return -1;
        if (!aF && bF) return 1;
        return a.created_at - b.created_at;
      })
    : [];

  const handleReply = () => {
    if (!replyText.trim()) return;
    publish(
      {
        kind: 1,
        content: replyText.trim(),
        tags: [
          ['e', event.id, '', 'reply'],
          ['p', event.pubkey],
        ],
      },
      { onSuccess: () => setReplyText('') }
    );
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const sharePost = async () => {
    const noteId = nip19.noteEncode(event.id);
    const url = `${window.location.origin}/${noteId}`;
    const shareData = {
      title: `Post by ${name}`,
      text: event.content.slice(0, 100) + (event.content.length > 100 ? '…' : ''),
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied!', description: 'Shareable link copied to clipboard' });
      }
    } catch (err) {
      // User cancelled share — not an error
      if (err instanceof Error && err.name !== 'AbortError') {
        toast({ title: 'Error', description: 'Could not share post', variant: 'destructive' });
      }
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-background rounded-2xl shadow-2xl border border-border/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <h2 className="font-semibold text-lg">Post</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* ── Parent post (thread context) ── */}
          {parentEvent && (
            <ParentPostContext event={parentEvent} onClose={onClose} />
          )}

          {/* Author */}
          <div className="flex items-start gap-3">
            <Link to={`/${npub}`} onClick={onClose} className="shrink-0">
              <Avatar className="h-12 w-12 ring-2 ring-background shadow">
                <AvatarImage src={meta?.picture} alt={name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link to={`/${npub}`} onClick={onClose} className="font-semibold hover:text-primary transition-colors">
                {name}
              </Link>
              <p className="text-sm text-muted-foreground">@{handle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
            </div>
          </div>

          {/* Post text */}
          <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
            <NoteContent event={event} />
          </div>

          {/* Media */}
          <ContentWarningWrapper event={event} mediaOnly>
            <MediaContent event={event} />
          </ContentWarningWrapper>

          {/* Reactions */}
          {reactions && Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(reactions).map(([emoji, data]) => {
                const mine = !!user && data.pubkeys.includes(user.pubkey);
                return (
                  <Badge
                    key={emoji}
                    variant={mine ? 'default' : 'secondary'}
                    className={`text-sm px-3 py-1 cursor-default ${mine ? 'ring-2 ring-primary/40' : ''}`}
                  >
                    {emoji} {data.count}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10">
                <MessageCircle className="h-4 w-4 mr-1" />
                {replies?.length ?? 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                onClick={() => {
                  if (!user) {
                    toast({ title: 'Login required', description: 'Please log in to repost.', variant: 'destructive' });
                    return;
                  }
                  setRepostOpen(true);
                }}
                title="Repost or Quote Post"
              >
                <Repeat2 className="h-4 w-4" />
              </Button>
              <ZapButton
                target={event as any}
                className="h-8 px-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 flex items-center gap-1"
                showCount
              />
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${isBookmarked ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}`}
                onClick={() => setBookmarkOpen(true)}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
              <EmojiReactionPicker
                eventId={event.id}
                className="h-8 px-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={sharePost} className="gap-2 cursor-pointer">
                  <Share2 className="h-4 w-4" /> Share post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => copy(event.id, 'Event ID')} className="gap-2 cursor-pointer">
                  <Copy className="h-4 w-4" /> Copy Event ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copy(nip19.noteEncode(event.id), 'Note ID')} className="gap-2 cursor-pointer">
                  <Copy className="h-4 w-4" /> Copy Note ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copy(npub, 'npub')} className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" /> Copy Author npub
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Reply composer ── */}
          {user && (
            <div className="space-y-2 border-t border-border/50 pt-4">
              <Textarea
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="resize-none"
                disabled={isPending}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={isPending || !replyText.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isPending ? 'Posting…' : 'Reply'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Replies ── */}
          <div className="border-t border-border/50 pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Replies
              {replies && replies.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm">({replies.length})</span>
              )}
            </h3>

            {loadingReplies ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedReplies.length > 0 ? (
              <div className="divide-y divide-border/40">
                {sortedReplies.map((reply) => (
                  <ReplyRow
                    key={reply.id}
                    reply={reply}
                    isFollow={followPubkeys.includes(reply.pubkey)}
                    onClose={onClose}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No replies yet — be the first!
              </p>
            )}
          </div>
        </div>
      </div>

      <BookmarkListsDialog
        open={bookmarkOpen}
        onOpenChange={setBookmarkOpen}
        eventId={event.id}
      />
      <RepostDialog
        event={event}
        open={repostOpen}
        onOpenChange={setRepostOpen}
      />
    </div>
  );
}

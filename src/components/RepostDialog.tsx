/**
 * RepostDialog — choose between a plain repost (NIP-18 kind 6) or a
 * quote post (kind 1 with "nostr:" mention of the original event).
 */

import { useState } from 'react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { Repeat2, Quote, Loader2, X } from 'lucide-react';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { NoteContent } from '@/components/NoteContent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RepostDialogProps {
  event: NostrEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback after a successful repost/quote */
  onSuccess?: () => void;
}

/** A compact read-only preview of the post being reposted */
function QuotedPostPreview({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const name = meta?.display_name || meta?.name || genUserName(event.pubkey);
  const handle = meta?.name || genUserName(event.pubkey);

  return (
    <Card className="border-2 border-border/60 bg-muted/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={meta?.picture} alt={name} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground">@{handle}</span>
        </div>
        <div className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">
          <NoteContent event={event} />
        </div>
      </CardContent>
    </Card>
  );
}

export function RepostDialog({ event, open, onOpenChange, onSuccess }: RepostDialogProps) {
  const [mode, setMode] = useState<'choose' | 'quote'>('choose');
  const [quoteText, setQuoteText] = useState('');

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: publish, isPending } = useNostrPublish();

  const noteId = nip19.noteEncode(event.id);
  const nevent = nip19.neventEncode({ id: event.id, author: event.pubkey });

  const handleClose = () => {
    setMode('choose');
    setQuoteText('');
    onOpenChange(false);
  };

  /** Plain repost — NIP-18 kind 6 */
  const handleRepost = () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to repost.', variant: 'destructive' });
      return;
    }
    publish(
      {
        kind: 6,
        content: JSON.stringify(event),
        tags: [
          ['e', event.id, '', 'mention'],
          ['p', event.pubkey],
        ],
      },
      {
        onSuccess: () => {
          toast({ title: 'Reposted!', description: 'The post has been reposted to your followers.' });
          onSuccess?.();
          handleClose();
        },
      }
    );
  };

  /** Quote post — kind 1 with a nostr: URI appended */
  const handleQuotePost = () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to quote post.', variant: 'destructive' });
      return;
    }
    if (!quoteText.trim()) {
      toast({ title: 'Empty quote', description: 'Write something to share with your quote.', variant: 'destructive' });
      return;
    }

    const content = `${quoteText.trim()}\n\nnostr:${nevent}`;

    publish(
      {
        kind: 1,
        content,
        tags: [
          ['e', event.id, '', 'mention'],
          ['p', event.pubkey],
          ['q', event.id],
        ],
      },
      {
        onSuccess: () => {
          toast({ title: 'Quote posted!', description: 'Your quote has been published.' });
          onSuccess?.();
          handleClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-green-500" />
            {mode === 'choose' ? 'Share Post' : 'Quote Post'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' ? (
          <div className="space-y-3 pt-2">
            <QuotedPostPreview event={event} />

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Plain Repost */}
              <button
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-green-400 hover:bg-green-500/5 transition-all group cursor-pointer"
                onClick={handleRepost}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-7 w-7 animate-spin text-green-500" />
                ) : (
                  <Repeat2 className="h-7 w-7 text-muted-foreground group-hover:text-green-500 transition-colors" />
                )}
                <div className="text-center">
                  <p className="font-semibold text-sm group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    Repost
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Share instantly to your followers
                  </p>
                </div>
              </button>

              {/* Quote Post */}
              <button
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-blue-400 hover:bg-blue-500/5 transition-all group cursor-pointer"
                onClick={() => setMode('quote')}
                disabled={isPending}
              >
                <Quote className="h-7 w-7 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                <div className="text-center">
                  <p className="font-semibold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Quote Post
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add your own comment
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Add your thoughts…"
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={3}
              className="resize-none"
              autoFocus
              disabled={isPending}
            />

            <QuotedPostPreview event={event} />

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('choose')}
                disabled={isPending}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                onClick={handleQuotePost}
                disabled={isPending || !quoteText.trim()}
                className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Quote className="h-4 w-4" />
                )}
                Publish Quote
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

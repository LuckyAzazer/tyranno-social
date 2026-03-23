/**
 * InlineSuggestions
 *
 * A vertical post-card–style card injected into the masonry feed columns.
 * Shows 3 users recommended via Web-of-Trust score (friends-of-friends),
 * each as a horizontal row: avatar | name + handle + mutuals | follow button.
 *
 * The `batchIndex` prop selects which slice of the ranked suggestion list
 * to display, so each occurrence in the feed shows a different trio.
 */

import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useWoTSuggestions } from '@/hooks/useWoTSuggestions';
import { useAuthor } from '@/hooks/useAuthor';
import { FollowButton } from '@/components/FollowButton';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { NostrMetadata } from '@nostrify/nostrify';

const BATCH_SIZE = 3;

function SuggestionUserRow({ pubkey, score }: { pubkey: string; score: number }) {
  const author = useAuthor(pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const displayName = meta?.display_name || meta?.name || genUserName(pubkey);
  const username = meta?.name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);

  if (author.isLoading) {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link to={`/${npub}`} className="shrink-0">
        <Avatar className="h-10 w-10 ring-2 ring-background hover:ring-primary/20 transition-all">
          <AvatarImage src={meta?.picture} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/${npub}`}
          className="text-sm font-semibold hover:text-primary transition-colors block truncate leading-tight"
        >
          {displayName}
        </Link>
        <p className="text-xs text-muted-foreground truncate">@{username}</p>
        {score > 1 && (
          <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
            {score} mutual{score !== 1 ? 's' : ''} follow
          </p>
        )}
      </div>

      <FollowButton pubkey={pubkey} iconOnly />
    </div>
  );
}

interface InlineSuggestionsProps {
  /** Which batch of 3 users to show (0 = top 3, 1 = next 3, …) */
  batchIndex: number;
}

export function InlineSuggestions({ batchIndex }: InlineSuggestionsProps) {
  const { data: suggestions, isLoading } = useWoTSuggestions(30);

  const start = batchIndex * BATCH_SIZE;
  const batch = suggestions?.slice(start, start + BATCH_SIZE) ?? [];

  // Don't render if there's nothing to show and we're done loading
  if (!isLoading && batch.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-primary/5 dark:from-card dark:to-card shadow-sm overflow-hidden">
      {/* Header — mimics a post card header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-1">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">People you might like</p>
          <p className="text-[10px] text-muted-foreground">Based on who you follow</p>
        </div>
      </div>

      {/* Vertical user list */}
      <div className="px-4 pb-3 divide-y divide-border/30">
        {isLoading && batch.length === 0 ? (
          Array.from({ length: BATCH_SIZE }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            </div>
          ))
        ) : (
          batch.map((s) => (
            <SuggestionUserRow key={s.pubkey} pubkey={s.pubkey} score={s.score} />
          ))
        )}
      </div>
    </div>
  );
}

import { useSeoMeta } from '@unhead/react';
import { useNote } from '@/hooks/useNote';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { NoteContent } from '@/components/NoteContent';
import { genUserName } from '@/lib/genUserName';
import { ArrowLeft, MessageCircle, Repeat2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

interface NotePageProps {
  eventId: string;
}

export function NotePage({ eventId }: NotePageProps) {
  const navigate = useNavigate();
  const { data: event, isLoading: isLoadingNote } = useNote(eventId);
  const author = useAuthor(event?.pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;

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
            <Card>
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
        <Card>
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
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card className="shadow-lg border-border/50">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
                <NoteContent event={event} />
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                >
                  <Repeat2 className="h-5 w-5 mr-2" />
                  Repost
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

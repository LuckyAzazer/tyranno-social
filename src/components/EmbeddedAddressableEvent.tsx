import { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';

interface EmbeddedAddressableEventProps {
  kind: number;
  pubkey: string;
  identifier: string;
}

export function EmbeddedAddressableEvent({ kind, pubkey, identifier }: EmbeddedAddressableEventProps) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Fetch the addressable event
  const { data: event, isLoading } = useQuery({
    queryKey: ['addressable-event', kind, pubkey, identifier, config.relayMetadata.updatedAt],
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

  if (isLoading) {
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    const naddr = nip19.naddrEncode({
      kind,
      pubkey,
      identifier,
    });
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            Event not found.{' '}
            <Link to={`/${naddr}`} className="text-blue-500 hover:underline">
              View on Nostr
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const username = metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const npub = nip19.npubEncode(event.pubkey);
  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier,
  });

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  // Extract title from tags if available
  const title = event.tags?.find(([name]) => name === 'title')?.[1];
  const summary = event.tags?.find(([name]) => name === 'summary')?.[1];
  const image = event.tags?.find(([name]) => name === 'image')?.[1];

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

  const kindName = getKindName(event.kind);

  return (
    <Card className="border-2 border-muted bg-muted/30 hover:bg-muted/40 transition-colors">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Author info */}
          <div className="flex items-start gap-3">
            <Link to={`/${npub}`} className="shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profileImage} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/${npub}`}
                  className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                >
                  {displayName}
                </Link>
                <span className="text-xs text-muted-foreground">@{username}</span>
                <Badge variant="secondary" className="text-xs">
                  {kindName}
                </Badge>
              </div>
              <Link
                to={`/${naddr}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {timeAgo}
              </Link>
            </div>
          </div>

          {/* Title */}
          {title && (
            <Link to={`/${naddr}`}>
              <h3 className="font-bold text-base hover:text-primary transition-colors">
                {title}
              </h3>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        {/* Image */}
        {image && (
          <Link to={`/${naddr}`}>
            <img 
              src={image} 
              alt={title || 'Event image'} 
              className="w-full rounded-lg object-cover max-h-48"
            />
          </Link>
        )}

        {/* Summary or content preview */}
        {summary ? (
          <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>
        ) : event.content && event.content.length > 0 ? (
          <div className="text-sm text-muted-foreground line-clamp-3">
            <NoteContent event={event} />
          </div>
        ) : null}

        {/* Media content if present */}
        <MediaContent event={event} />
      </CardContent>
    </Card>
  );
}

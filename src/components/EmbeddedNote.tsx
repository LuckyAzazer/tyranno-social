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

interface EmbeddedNoteProps {
  eventId: string;
  depth?: number;
}

const MAX_EMBED_DEPTH = 2; // Prevent infinite nesting

export function EmbeddedNote({ eventId, depth = 0 }: EmbeddedNoteProps) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Fetch the embedded event
  const { data: event, isLoading } = useQuery({
    queryKey: ['embedded-note', eventId, config.relayMetadata.updatedAt],
    queryFn: async () => {
      const relayUrls = config.relayMetadata.relays
        .filter(r => r.read)
        .map(r => r.url);

      const relayGroup = relayUrls.length > 0 
        ? nostr.group(relayUrls)
        : nostr;

      const events = await relayGroup.query([
        {
          ids: [eventId],
          limit: 1,
        },
      ]);

      return events[0] || null;
    },
  });

  const author = useAuthor(event?.pubkey || '');
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  if (isLoading) {
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Loading note...</div>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    const noteId = nip19.noteEncode(eventId);
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            Note not found.{' '}
            <Link to={`/${noteId}`} className="text-blue-500 hover:underline">
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
  const noteId = nip19.noteEncode(event.id);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), {
    addSuffix: true,
  });

  // Extract images
  const imageUrls = event.content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)/gi) || [];
  const imetaImages = event.tags
    .filter(([name]) => name === 'imeta')
    .map(tag => {
      const urlTag = tag.find(item => item.startsWith('url '));
      return urlTag ? urlTag.replace('url ', '') : null;
    })
    .filter((url): url is string => url !== null);
  const allImages = [...new Set([...imageUrls, ...imetaImages])];

  // Simple text rendering without recursive embedding if we've reached max depth
  const renderContent = () => {
    if (depth >= MAX_EMBED_DEPTH) {
      return <div className="text-sm break-words whitespace-pre-wrap">{event.content}</div>;
    }

    // Parse content for note references
    const regex = /(https?:\/\/[^\s]+)|nostr:(note1)([023456789acdefghjklmnpqrstuvwxyz]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = regex.exec(event.content)) !== null) {
      const [fullMatch, url, nostrPrefix, nostrData] = match;
      const index = match.index;

      if (index > lastIndex) {
        parts.push(event.content.substring(lastIndex, index));
      }

      if (url) {
        parts.push(
          <a 
            key={`url-${keyCounter++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {url}
          </a>
        );
      } else if (nostrPrefix && nostrData) {
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);
          
          if (decoded.type === 'note') {
            // Recursively embed the note
            parts.push(
              <div key={`embed-${keyCounter++}`} className="my-2">
                <EmbeddedNote eventId={decoded.data} depth={depth + 1} />
              </div>
            );
          }
        } catch {
          parts.push(fullMatch);
        }
      }

      lastIndex = index + fullMatch.length;
    }

    if (lastIndex < event.content.length) {
      parts.push(event.content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : event.content;
  };

  return (
    <Card className="border-2 border-muted bg-muted/30 hover:bg-muted/40 transition-colors">
      <CardHeader className="pb-3">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/${npub}`}
                  className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {displayName}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">@{username}</p>
              </div>
              <Link
                to={`/${noteId}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {timeAgo}
              </Link>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-sm break-words whitespace-pre-wrap mb-3">
          {renderContent()}
        </div>

        {/* Image Display */}
        {allImages.length > 0 && (
          <div className={`grid gap-2 ${
            allImages.length === 1 ? 'grid-cols-1' : 
            allImages.length === 2 ? 'grid-cols-2' : 
            'grid-cols-2'
          }`}>
            {allImages.slice(0, 4).map((url, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(url, '_blank');
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

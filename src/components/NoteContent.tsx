import { useMemo, useState } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { EmbeddedNote } from '@/components/EmbeddedNote';
import { EmbeddedAddressableEvent } from '@/components/EmbeddedAddressableEvent';
import { MovieCard } from '@/components/MovieCard';
import { ProfileCard } from '@/components/ProfileCard';
import { SessionCard } from '@/components/SessionCard';
import { ServiceProviderCard } from '@/components/ServiceProviderCard';
import { HashDataCard } from '@/components/HashDataCard';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

/** Parses content of text note events so that URLs and hashtags are linkified. */
export function NoteContent({
  event, 
  className, 
}: NoteContentProps) {
  const [showHiddenLinks, setShowHiddenLinks] = useState(false);

  // Check if content is JSON and try to parse it
  const jsonData = useMemo(() => {
    const trimmed = event.content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  }, [event.content]);

  // Check if content is mostly hexadecimal hash data
  const isHashData = useMemo(() => {
    const cleaned = event.content.replace(/\s+/g, '');
    // Consider it hash data if:
    // - It's all hex characters
    // - It's longer than 64 characters (minimum for a hash)
    // - It doesn't contain other content
    return /^[a-fA-F0-9]{64,}$/.test(cleaned) && cleaned.length > 100;
  }, [event.content]);

  // If it's movie data, render as a movie card
  if (jsonData && (jsonData.yts_data || (jsonData.title && jsonData.year))) {
    return (
      <div className={className}>
        <MovieCard data={jsonData} />
      </div>
    );
  }

  // If it's profile/metadata data, render as a profile card
  if (jsonData && (jsonData.name || jsonData.display_name) && (jsonData.about || jsonData.capabilities)) {
    return (
      <div className={className}>
        <ProfileCard data={jsonData} />
      </div>
    );
  }

  // If it's session/reflection data, render as a session card
  if (jsonData && (jsonData.session_id || jsonData.reflection)) {
    return (
      <div className={className}>
        <SessionCard data={jsonData} />
      </div>
    );
  }

  // If it's service provider data (VPN, network provider, etc.), render as a service provider card
  if (jsonData && (jsonData.provider_name || jsonData.endpoint) && (jsonData.region || jsonData.wg_public_key)) {
    return (
      <div className={className}>
        <ServiceProviderCard data={jsonData} />
      </div>
    );
  }

  // If it's hash data, render as a hash data card
  if (isHashData) {
    return (
      <div className={className}>
        <HashDataCard content={event.content} />
      </div>
    );
  }

  // Get mentioned pubkeys from p tags for replacements
  const mentionedPubkeys = useMemo(() => {
    return event.tags
      .filter(([name]) => name === 'p')
      .map(([_, pubkey]) => pubkey);
  }, [event.tags]);

  // Extract media URLs to hide them from content
  const mediaUrls = useMemo(() => {
    const urls = new Set<string>();
    
    // Get URLs from imeta tags
    event.tags
      .filter(([name]) => name === 'imeta')
      .forEach(tag => {
        const urlTag = tag.find(item => item.startsWith('url '));
        if (urlTag) {
          const url = urlTag.replace('url ', '');
          urls.add(url);
        }
      });

    // Get image/video URLs from content
    const imageMatches = event.content.matchAll(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?\b/gi);
    const videoMatches = event.content.matchAll(/https?:\/\/[^\s]+\.(mp4|webm|ogv|mov)(\?[^\s]*)?\b/gi);

    for (const match of imageMatches) {
      urls.add(match[0]);
    }
    
    for (const match of videoMatches) {
      urls.add(match[0]);
    }

    return urls;
  }, [event.content, event.tags]);

  // Process the content to render mentions, links, etc.
  const processedContent = useMemo(() => {
    const text = event.content;
    
    // Regex to find Nostr references (with or without nostr: prefix), URLs, hashtags, and indexed mentions (#[0], #[1], etc.)
    // Put Nostr references BEFORE URLs to prevent nostr:nevent1 from being treated as a URL
    const regex = /(?:nostr:)?(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]+)|(https?:\/\/[^\s]+)|(#\w+)|(#\[(\d+)\])/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;
    let hiddenCount = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, nostrPrefix, nostrData, url, hashtag, indexedMention, mentionIndex] = match;
      const index = match.index;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      if (nostrPrefix && nostrData) {
        // Handle Nostr references
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);
          
          if (decoded.type === 'npub') {
            const pubkey = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'nprofile') {
            const pubkey = decoded.data.pubkey;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'note') {
            // Embed the note inline
            const eventId = decoded.data;
            parts.push(
              <div key={`embed-${keyCounter++}`} className="my-3">
                <EmbeddedNote eventId={eventId} />
              </div>
            );
          } else if (decoded.type === 'nevent') {
            // Embed the nevent inline
            const eventId = decoded.data.id;
            parts.push(
              <div key={`embed-${keyCounter++}`} className="my-3">
                <EmbeddedNote eventId={eventId} />
              </div>
            );
          } else if (decoded.type === 'naddr') {
            // Embed addressable events inline
            const { kind, pubkey, identifier } = decoded.data;
            parts.push(
              <div key={`embed-${keyCounter++}`} className="my-3">
                <EmbeddedAddressableEvent 
                  kind={kind} 
                  pubkey={pubkey} 
                  identifier={identifier} 
                />
              </div>
            );
          } else {
            // For other types, just show as a link
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-primary hover:text-primary/80 hover:underline break-all transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {fullMatch}
              </Link>
            );
          }
        } catch {
          // If decoding fails, just render as text
          parts.push(fullMatch);
        }
      } else if (url) {
        // Check if this URL is a media URL that's already displayed
        const isMediaUrl = mediaUrls.has(url);
        
        if (isMediaUrl && !showHiddenLinks) {
          // Hide media URLs since they're shown as thumbnails
          hiddenCount++;
          // Don't add the URL to parts
        } else {
          // Handle non-media URLs or show hidden links if toggled
          parts.push(
            <a 
              key={`url-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hover:underline break-all transition-colors",
                isMediaUrl ? "text-muted-foreground text-xs" : "text-primary hover:text-primary/80"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {url}
            </a>
          );
        }
      } else if (indexedMention && mentionIndex) {
        // Handle indexed mentions like #[0]
        const idx = parseInt(mentionIndex);
        if (idx < mentionedPubkeys.length) {
          const pubkey = mentionedPubkeys[idx];
          parts.push(
            <NostrMention key={`indexed-mention-${keyCounter++}`} pubkey={pubkey} />
          );
        } else {
          parts.push(fullMatch);
        }
      } else if (hashtag) {
        // Handle hashtags
        const tag = hashtag.slice(1); // Remove the #
        parts.push(
          <Link 
            key={`hashtag-${keyCounter++}`}
            to={`/t/${tag}`}
            className="text-primary hover:text-primary/80 hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {hashtag}
          </Link>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(text);
    }
    
    return { content: parts, hiddenLinkCount: hiddenCount };
  }, [event.content, mentionedPubkeys, mediaUrls, showHiddenLinks]);

  const { content, hiddenLinkCount } = processedContent;

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {content.length > 0 ? content : event.content}
      
      {hiddenLinkCount > 0 && !showHiddenLinks && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowHiddenLinks(true);
            }}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-3 w-3 mr-1" />
            Show {hiddenLinkCount} hidden {hiddenLinkCount === 1 ? 'link' : 'links'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link 
      to={`/${npub}`}
      className={cn(
        "font-semibold hover:underline transition-colors inline-flex items-center gap-0.5",
        hasRealName 
          ? "text-primary hover:text-primary/80" 
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      @{displayName}
    </Link>
  );
}
import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { LinkPreview } from './LinkPreview';

interface MediaContentProps {
  event: NostrEvent;
}

interface MediaItem {
  type: 'image' | 'video' | 'link';
  url: string;
}

export function MediaContent({ event }: MediaContentProps) {
  const media = useMemo(() => {
    const items: MediaItem[] = [];
    
    // Extract URLs from imeta tags (NIP-94)
    const imetaUrls = event.tags
      .filter(([name]) => name === 'imeta')
      .map(tag => {
        const urlTag = tag.find(item => item.startsWith('url '));
        const mimeTag = tag.find(item => item.startsWith('m ')) || tag.find(item => item.startsWith('type '));
        const url = urlTag ? urlTag.replace('url ', '') : null;
        const mime = mimeTag ? mimeTag.replace(/^(m|type) /, '') : null;
        
        return { url, mime };
      })
      .filter((item): item is { url: string; mime: string | null } => item.url !== null);

    // Add imeta URLs with proper types
    for (const { url, mime } of imetaUrls) {
      if (mime?.startsWith('image/')) {
        items.push({ type: 'image', url });
      } else if (mime?.startsWith('video/')) {
        items.push({ type: 'video', url });
      } else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i)) {
        items.push({ type: 'image', url });
      } else if (url.match(/\.(mp4|webm|ogv|mov)(\?|$)/i)) {
        items.push({ type: 'video', url });
      }
    }

    // Extract media URLs from content
    const imageMatches = event.content.matchAll(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?\b/gi);
    const videoMatches = event.content.matchAll(/https?:\/\/[^\s]+\.(mp4|webm|ogv|mov)(\?[^\s]*)?\b/gi);
    const linkMatches = event.content.matchAll(/https?:\/\/[^\s]+/gi);

    // Add images
    for (const match of imageMatches) {
      const url = match[0];
      if (!items.some(item => item.url === url)) {
        items.push({ type: 'image', url });
      }
    }

    // Add videos
    for (const match of videoMatches) {
      const url = match[0];
      if (!items.some(item => item.url === url)) {
        items.push({ type: 'video', url });
      }
    }

    // Add web links (excluding media URLs)
    for (const match of linkMatches) {
      const url = match[0];
      const isMedia = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|ogv|mov)(\?|$)/i);
      const isNostr = url.includes('nostr:') || url.match(/\/(npub1|note1|nevent1|naddr1|nprofile1)/);
      
      if (!isMedia && !isNostr && !items.some(item => item.url === url)) {
        items.push({ type: 'link', url });
      }
    }

    return items;
  }, [event]);

  const images = media.filter(item => item.type === 'image');
  const videos = media.filter(item => item.type === 'video');
  const links = media.filter(item => item.type === 'link');

  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Images */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${
          images.length === 1 ? 'grid-cols-1' : 
          images.length === 2 ? 'grid-cols-2' : 
          images.length === 3 ? 'grid-cols-3' : 
          'grid-cols-2'
        }`}>
          {images.slice(0, 4).map((item, index) => (
            <div
              key={`img-${index}`}
              className={`relative overflow-hidden rounded-lg bg-muted ${
                images.length === 3 && index === 0 ? 'col-span-3' : ''
              }`}
            >
              <img
                src={item.url}
                alt=""
                className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                loading="lazy"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(item.url, '_blank');
                }}
              />
            </div>
          ))}
          {images.length > 4 && (
            <div className="col-span-2 text-center text-sm text-muted-foreground">
              +{images.length - 4} more images
            </div>
          )}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((item, index) => (
            <div
              key={`vid-${index}`}
              className="relative overflow-hidden rounded-lg bg-black"
            >
              <video
                src={item.url}
                controls
                className="w-full h-auto max-h-96 object-contain"
                preload="metadata"
                onClick={(e) => e.stopPropagation()}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ))}
        </div>
      )}

      {/* Link Previews */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.slice(0, 3).map((item, index) => (
            <LinkPreview key={`link-${index}`} url={item.url} />
          ))}
          {links.length > 3 && (
            <div className="text-center text-sm text-muted-foreground">
              +{links.length - 3} more links
            </div>
          )}
        </div>
      )}
    </div>
  );
}

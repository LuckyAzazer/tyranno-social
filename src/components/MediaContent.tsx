import { useMemo, useState, useCallback } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { LinkPreview } from './LinkPreview';
import { ImageGalleryNew } from './ImageGalleryNew';
import { VideoPlayer } from './VideoPlayer';
import { MusicPlayer } from './MusicPlayer';
import { YouTubeEmbed, isYouTubeUrl } from './YouTubeEmbed';
import { SpotifyEmbed, isSpotifyUrl } from './SpotifyEmbed';
import { SoundCloudEmbed, isSoundCloudUrl } from './SoundCloudEmbed';
import { ZapstrEmbed, isZapstrUrl } from './ZapstrEmbed';
import { imageUrlRe, videoUrlRe, audioUrlRe } from '@/lib/mediaRegex';

/** Open the image in a new tab so the user can save it via the browser. */
function downloadImage(url: string) {
  window.open(url, '_blank');
}

interface MediaContentProps {
  event: NostrEvent;
}

interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'youtube' | 'spotify' | 'soundcloud' | 'zapstr' | 'link';
  url: string;
  poster?: string;
}

export function MediaContent({ event }: MediaContentProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const handleImageError = (url: string) => {
    setFailedImages(prev => new Set(prev).add(url));
  };

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
        // Try to find a thumb or image tag in the same imeta entry for poster
        const imetaTag = event.tags.find(tag => tag.some(item => item === `url ${url}`));
        const thumbEntry = imetaTag?.find(item => item.startsWith('thumb ') || item.startsWith('image '));
        const poster = thumbEntry ? thumbEntry.replace(/^(thumb|image) /, '') : undefined;
        items.push({ type: 'video', url, poster });
      } else if (mime?.startsWith('audio/')) {
        items.push({ type: 'audio', url });
      } else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i)) {
        items.push({ type: 'image', url });
      } else if (url.match(/\.(mp4|webm|ogv|mov)(\?|$)/i)) {
        items.push({ type: 'video', url });
      } else if (url.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/i)) {
        items.push({ type: 'audio', url });
      }
    }

    // Use shared regexes — fresh instances each time (global flag is stateful)
    const imageMatches = event.content.matchAll(imageUrlRe());
    const videoMatches = event.content.matchAll(videoUrlRe());
    const audioMatches = event.content.matchAll(audioUrlRe());
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

    // Add audio
    for (const match of audioMatches) {
      const url = match[0];
      if (!items.some(item => item.url === url)) {
        items.push({ type: 'audio', url });
      }
    }

    // Add web links (excluding media URLs)
    for (const match of linkMatches) {
      const url = match[0];
      const isMedia = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|ogv|mov|mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/i);
      const isNostr = url.includes('nostr:') || url.match(/\/(npub1|note1|nevent1|naddr1|nprofile1)/);
      
      if (!isMedia && !isNostr && !items.some(item => item.url === url)) {
        // Check for music streaming services and YouTube
        if (isYouTubeUrl(url)) {
          items.push({ type: 'youtube', url });
        } else if (isSpotifyUrl(url)) {
          items.push({ type: 'spotify', url });
        } else if (isSoundCloudUrl(url)) {
          items.push({ type: 'soundcloud', url });
        } else if (isZapstrUrl(url)) {
          items.push({ type: 'zapstr', url });
        } else {
          items.push({ type: 'link', url });
        }
      }
    }

    return items;
  }, [event]);

  const images = media.filter(item => item.type === 'image');
  const videos = media.filter(item => item.type === 'video');
  const audios = media.filter(item => item.type === 'audio');
  const youtubeVideos = media.filter(item => item.type === 'youtube');
  const spotifyTracks = media.filter(item => item.type === 'spotify');
  const soundcloudTracks = media.filter(item => item.type === 'soundcloud');
  const zapstrTracks = media.filter(item => item.type === 'zapstr');
  const links = media.filter(item => item.type === 'link');

  const imageUrls = images.map(img => img.url);

  const handleImageClick = useCallback((index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }, []);

  const hasOverflow = images.length > 4;
  const overflowCount = images.length - 4;

  if (media.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Images */}
        {images.length > 0 && (() => {
          const displayImages = expanded ? images : images.slice(0, 4);
          const visibleImages = displayImages.filter(item => !failedImages.has(item.url));
          if (visibleImages.length === 0) return null;

          // Grid class for the first 4 (or fewer) images
          const gridCols = expanded
            ? 'grid-cols-2'
            : visibleImages.length === 1 ? 'grid-cols-1'
            : visibleImages.length === 2 ? 'grid-cols-2'
            : visibleImages.length === 3 ? 'grid-cols-3'
            : 'grid-cols-2';

          return (
            <div>
              <div className={`grid gap-2 ${gridCols}`}>
                {visibleImages.map((item, index) => (
                  <div
                    key={`img-${index}`}
                    className={`group/img relative overflow-hidden rounded-lg bg-muted cursor-pointer ${
                      !expanded && visibleImages.length === 3 && index === 0 ? 'col-span-3' : ''
                    }`}
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleImageClick(index);
                      }}
                      data-image-gallery-trigger
                    >
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105 block"
                        loading="lazy"
                        draggable
                        onError={() => handleImageError(item.url)}
                      />
                    </a>
                    {/* Download button — matches native video download menu style */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadImage(item.url);
                      }}
                      className="absolute bottom-2.5 right-2.5 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/90 dark:bg-popover/95 text-foreground shadow-lg backdrop-blur-sm border border-border/50 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 z-10 sm:opacity-0 max-sm:opacity-90 hover:bg-accent"
                      aria-label="Download image"
                      title="Download image"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">Download</span>
                    </button>
                  </div>
                ))}
              </div>
              {/* Expand / Collapse toggle */}
              {hasOverflow && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpanded(prev => !prev);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors py-1.5"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      +{overflowCount} more image{overflowCount === 1 ? '' : 's'}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })()}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((item, index) => (
            <VideoPlayer
              key={`vid-${index}`}
              src={item.url}
              poster={item.poster}
            />
          ))}
        </div>
      )}

      {/* Audio */}
      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((item, index) => (
            <MusicPlayer
              key={`audio-${index}`}
              src={item.url}
            />
          ))}
        </div>
      )}

      {/* YouTube Videos */}
      {youtubeVideos.length > 0 && (
        <div className="space-y-3">
          {youtubeVideos.map((item, index) => (
            <YouTubeEmbed
              key={`youtube-${index}`}
              url={item.url}
            />
          ))}
        </div>
      )}

      {/* Spotify Embeds */}
      {spotifyTracks.length > 0 && (
        <div className="space-y-3">
          {spotifyTracks.map((item, index) => (
            <SpotifyEmbed
              key={`spotify-${index}`}
              url={item.url}
            />
          ))}
        </div>
      )}

      {/* SoundCloud Embeds */}
      {soundcloudTracks.length > 0 && (
        <div className="space-y-3">
          {soundcloudTracks.map((item, index) => (
            <SoundCloudEmbed
              key={`soundcloud-${index}`}
              url={item.url}
            />
          ))}
        </div>
      )}

      {/* Zapstr Embeds */}
      {zapstrTracks.length > 0 && (
        <div className="space-y-3">
          {zapstrTracks.map((item, index) => (
            <ZapstrEmbed
              key={`zapstr-${index}`}
              url={item.url}
            />
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

      {/* Image Gallery */}
      <ImageGalleryNew
        images={imageUrls}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialIndex={galleryIndex}
      />
    </>
  );
}

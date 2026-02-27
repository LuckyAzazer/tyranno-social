import { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface SoundCloudEmbedProps {
  url: string;
  className?: string;
}

export function isSoundCloudUrl(url: string): boolean {
  return /soundcloud\.com\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+/.test(url);
}

export function SoundCloudEmbed({ url, className = '' }: SoundCloudEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // SoundCloud requires an oEmbed API call to get the embed URL
    // We'll use their public oEmbed endpoint
    const fetchEmbedUrl = async () => {
      try {
        const encodedUrl = encodeURIComponent(url);
        const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodedUrl}`;
        
        const response = await fetch(oembedUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch SoundCloud embed');
        }
        
        const data = await response.json();
        // Extract the iframe src from the HTML
        const match = data.html?.match(/src="([^"]+)"/);
        if (match && match[1]) {
          setEmbedUrl(match[1]);
        } else {
          throw new Error('Invalid SoundCloud embed response');
        }
      } catch (err) {
        console.warn('SoundCloud embed error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedUrl();
  }, [url]);

  if (error) {
    // Fallback to direct link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block p-4 rounded-lg border border-border/50 bg-gradient-to-br from-card via-card to-orange-50/20 dark:from-card dark:via-card dark:to-orange-500/5 hover:border-orange-500/30 transition-colors ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Music className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">SoundCloud Track</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </div>
      </a>
    );
  }

  if (isLoading || !embedUrl) {
    return (
      <div className={`rounded-lg bg-muted animate-pulse ${className}`} style={{ height: '166px' }} />
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height="166"
        frameBorder="0"
        allow="autoplay"
        loading="lazy"
        className="w-full rounded-lg"
        title="SoundCloud player"
      />
    </div>
  );
}

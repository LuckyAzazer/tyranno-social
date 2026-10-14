import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Globe } from 'lucide-react';
import { TwitterEmbed } from './TwitterEmbed';

interface LinkPreviewProps {
  url: string;
  /** When false the fetch is deferred — use for lazy-loading on mobile */
  enabled?: boolean;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

/** Resolve a potentially relative or protocol-relative og:image URL. */
function resolveImageUrl(imageUrl: string, pageUrl: string): string {
  try {
    // Protocol-relative  →  use the page's protocol
    if (imageUrl.startsWith('//')) {
      const proto = new URL(pageUrl).protocol;
      return `${proto}${imageUrl}`;
    }
    // Absolute  →  use as-is
    if (/^https?:\/\//i.test(imageUrl)) {
      return imageUrl;
    }
    // Relative  →  resolve against page origin
    const base = new URL(pageUrl);
    return new URL(imageUrl, base.origin).href;
  } catch {
    return imageUrl;
  }
}

export function LinkPreview({ url, enabled = true }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Check if this is a Twitter/X link
  const isTwitterLink = useMemo(() => {
    try {
      const h = new URL(url).hostname.replace(/^www\./, '');
      return h === 'twitter.com' || h === 'x.com';
    } catch {
      return false;
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return; // defer until visible
    let cancelled = false;

    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setError(false);
        setImgError(false);

        const hostname = new URL(url).hostname;
        const pathname = new URL(url).pathname;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
          const proxyUrl = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: { Accept: 'text/html' },
          });
          clearTimeout(timeoutId);

          if (!response.ok) throw new Error('fetch failed');

          const html = await response.text();
          if (cancelled) return;

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const meta = (prop: string) =>
            doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
            doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') ||
            undefined;

          const rawImage = meta('og:image') || meta('og:image:url') || meta('twitter:image') || undefined;
          const image = rawImage ? resolveImageUrl(rawImage, url) : undefined;

          if (!cancelled) {
            setPreview({
              title: meta('og:title') || doc.querySelector('title')?.textContent || undefined,
              description: meta('og:description') || meta('description') || undefined,
              image,
              siteName: meta('og:site_name') || hostname,
              favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
            });
          }
        } catch {
          clearTimeout(timeoutId);
          if (!cancelled) {
            setPreview({
              title: pathname !== '/' ? pathname.split('/').filter(Boolean).pop() : hostname,
              siteName: hostname,
              favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
            });
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!enabled) return null;

  if (isTwitterLink) return <TwitterEmbed url={url} />;

  if (isLoading) {
    return (
      <Card className="border border-border/60 overflow-hidden cursor-pointer">
        <div className="h-36 bg-muted animate-pulse" />
        <CardContent className="p-3 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card className="border border-border/60 cursor-pointer hover:bg-muted/30 transition-colors" onClick={handleClick}>
        <CardContent className="p-3 flex items-center gap-3">
          <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-primary truncate">{url}</p>
          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    );
  }

  const showImage = !!preview.image && !imgError;
  const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();

  return (
    <Card
      className="border border-border/60 overflow-hidden cursor-pointer hover:border-primary/30 transition-colors group"
      onClick={handleClick}
    >
      {/* Hero thumbnail — shown above text when an image is available */}
      {showImage && (
        <div className="w-full aspect-[2/1] bg-muted overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      <CardContent className="p-3">
        {/* Site name + external icon */}
        <div className="flex items-center gap-1.5 mb-1">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">
            {preview.siteName || hostname}
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
        </div>

        {preview.title && (
          <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {preview.title}
          </h4>
        )}

        {preview.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {preview.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

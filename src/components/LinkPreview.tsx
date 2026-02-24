import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Globe } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // Use a CORS proxy to fetch Open Graph data
        const proxyUrl = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }

        const html = await response.text();
        
        // Parse Open Graph and meta tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const getMetaContent = (property: string): string | undefined => {
          const element = doc.querySelector(`meta[property="${property}"]`) || 
                         doc.querySelector(`meta[name="${property}"]`);
          return element?.getAttribute('content') || undefined;
        };

        const title = getMetaContent('og:title') || 
                     doc.querySelector('title')?.textContent || 
                     undefined;
        
        const description = getMetaContent('og:description') || 
                           getMetaContent('description') || 
                           undefined;
        
        const image = getMetaContent('og:image') || 
                     getMetaContent('twitter:image') || 
                     undefined;
        
        const siteName = getMetaContent('og:site_name') || 
                        new URL(url).hostname || 
                        undefined;

        const favicon = doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                       doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
                       `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;

        setPreview({
          title,
          description,
          image,
          favicon,
          siteName,
        });
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-muted bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-muted rounded animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card 
        className="border-2 border-muted bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-blue-500 hover:underline truncate">
                  {url}
                </p>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-2 border-muted bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer group"
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {preview.image && (
            <div className="w-20 h-20 bg-muted rounded overflow-hidden shrink-0">
              <img 
                src={preview.image} 
                alt={preview.title || 'Link preview'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {preview.title && (
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1">
                    {preview.title}
                  </h4>
                )}
                {preview.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {preview.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {preview.favicon && (
                    <img 
                      src={preview.favicon} 
                      alt=""
                      className="w-4 h-4"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="truncate">
                    {preview.siteName || new URL(url).hostname}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

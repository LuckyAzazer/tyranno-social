interface SpotifyEmbedProps {
  url: string;
  className?: string;
}

export function isSpotifyUrl(url: string): boolean {
  return /spotify\.com\/(track|album|playlist|episode|show)\/[a-zA-Z0-9]+/.test(url) ||
         /open\.spotify\.com\/(track|album|playlist|episode|show)\/[a-zA-Z0-9]+/.test(url);
}

export function getSpotifyEmbedUrl(url: string): string | null {
  // Match Spotify URLs and extract the type and ID
  const match = url.match(/spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  
  if (!match) return null;
  
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}`;
}

export function SpotifyEmbed({ url, className = '' }: SpotifyEmbedProps) {
  const embedUrl = getSpotifyEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-lg bg-black ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        src={embedUrl}
        width="100%"
        height="352"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="w-full rounded-lg"
        title="Spotify player"
      />
    </div>
  );
}

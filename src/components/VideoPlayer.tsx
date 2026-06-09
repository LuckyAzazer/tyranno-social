import { useState, useRef } from 'react';
import { Play, Film } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // #t=0.001 asks browsers to seek to the first frame so it renders as the
  // native poster — works without canvas/CORS issues on most mobile browsers.
  const srcWithSeek = src.includes('#') ? src : `${src}#t=0.001`;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    videoRef.current?.play();
  };

  const handlePause = () => setIsPlaying(false);

  if (hasError) return null;

  return (
    // aspect-video ensures the container always has height (16:9) even
    // before video metadata has loaded — prevents the empty-space bug.
    <div className={`relative overflow-hidden rounded-lg bg-black aspect-video ${className}`}>

      <video
        ref={videoRef}
        src={srcWithSeek}
        controls={isPlaying}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline
        poster={poster}
        onLoadedMetadata={() => setMetadataLoaded(true)}
        onPause={handlePause}
        onEnded={handlePause}
        onClick={(e) => e.stopPropagation()}
        onError={() => setHasError(true)}
      />

      {/* Placeholder shown before metadata loads (no poster available yet) */}
      {!metadataLoaded && !poster && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <Film className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      {/* Play overlay — shown until the user taps play */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={handlePlay}
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors" />
          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg transition-transform duration-100 group-hover:scale-110 active:scale-90">
            <Play className="h-6 w-6 fill-white text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

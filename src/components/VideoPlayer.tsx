import { useState, useRef } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Append #t=0.001 so browsers (especially mobile Safari/Chrome) seek to
  // the first frame and render it as the native poster image — no canvas
  // thumbnail generation needed, works cross-origin.
  const srcWithSeek = src.includes('#') ? src : `${src}#t=0.001`;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    videoRef.current?.play();
  };

  const handlePause = () => setIsPlaying(false);

  if (hasError) return null;

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      <video
        ref={videoRef}
        src={srcWithSeek}
        controls={isPlaying}
        className="w-full h-auto max-h-96 object-contain"
        preload="metadata"
        playsInline
        poster={poster}
        onPause={handlePause}
        onEnded={handlePause}
        onClick={(e) => e.stopPropagation()}
        onError={() => setHasError(true)}
      />

      {/* Play overlay — shown until the user taps play */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={handlePlay}
        >
          {/* Semi-transparent dark scrim so the play button is always visible
              even on bright video thumbnails */}
          <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />

          {/* Play button */}
          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg transition-transform duration-100 group-hover:scale-110 active:scale-90">
            <Play className="h-6 w-6 fill-white text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  src: string;
  className?: string;
}

export function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate thumbnail from video
  useEffect(() => {
    if (!videoRef.current || thumbnail) return;

    const video = videoRef.current;
    
    const generateThumbnail = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      try {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnail(thumbnailUrl);
      } catch (error) {
        // CORS error or other security error - use placeholder
        console.warn('Unable to generate video thumbnail (CORS):', error);
        setThumbnail('placeholder');
      }

      // Remove event listener after generating thumbnail
      video.removeEventListener('loadeddata', generateThumbnail);
    };

    video.addEventListener('loadeddata', generateThumbnail);

    return () => {
      video.removeEventListener('loadeddata', generateThumbnail);
    };
  }, [thumbnail]);

  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        controls={isPlaying}
        className="w-full h-auto max-h-96 object-contain"
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onPause={handlePause}
        onEnded={handlePause}
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          console.warn('Video load error:', src);
          e.currentTarget.style.display = 'none';
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Thumbnail overlay with play button */}
      {!isPlaying && thumbnail && (
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
        >
          {/* Thumbnail or placeholder */}
          {thumbnail !== 'placeholder' ? (
            <img 
              src={thumbnail} 
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-white/30 text-center p-8">
                <Play className="h-24 w-24 mx-auto mb-4 opacity-30" />
              </div>
            </div>
          )}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="default"
              size="icon"
              className="h-16 w-16 rounded-full bg-white/90 hover:bg-white text-black shadow-lg transition-transform group-hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                handlePlay();
              }}
            >
              <Play className="h-8 w-8 fill-current ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading state before thumbnail is generated */}
      {!isPlaying && !thumbnail && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-pulse">
            <Play className="h-16 w-16 text-white/50" />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface ImageGalleryNewProps {
  images: string[];
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

export function ImageGalleryNew({ images, open, onClose, initialIndex = 0 }: ImageGalleryNewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  // Touch gesture refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);
  const lastPanPoint = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);
  const transformRef = useRef<Transform>(transform);

  // Keep ref in sync
  transformRef.current = transform;

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    setIsZoomed(false);
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    isPanning.current = false;
    lastPanPoint.current = null;
  }, []);

  // Reset index and transform when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      resetTransform();
    }
  }, [open, initialIndex, resetTransform]);

  // Reset transform when switching images
  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          resetTransform();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && !isZoomed) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && !isZoomed) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, images.length, isZoomed, resetTransform]);

  // Prevent page scroll/zoom while gallery is open
  useEffect(() => {
    if (!open) return;

    const preventDefault = (e: TouchEvent) => {
      // Prevent browser zoom and scroll while gallery is open
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Also prevent overscroll on the body
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.removeEventListener('touchmove', preventDefault);
    };
  }, [open]);

  // Touch handlers for pinch-to-zoom and pan
  const getTouchDistance = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: TouchList): { x: number; y: number } => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
      isPanning.current = false;
    } else if (e.touches.length === 1 && transformRef.current.scale > 1) {
      // Pan start (only when zoomed)
      isPanning.current = true;
      lastPanPoint.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      const scaleChange = currentDistance / lastTouchDistance.current;

      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      animationFrame.current = requestAnimationFrame(() => {
        setTransform(prev => {
          const newScale = Math.min(Math.max(prev.scale * scaleChange, 1), 5);

          // Adjust translation to zoom toward the pinch center
          let newTranslateX = prev.translateX;
          let newTranslateY = prev.translateY;

          if (lastTouchCenter.current) {
            const centerDeltaX = currentCenter.x - lastTouchCenter.current.x;
            const centerDeltaY = currentCenter.y - lastTouchCenter.current.y;
            newTranslateX = prev.translateX + centerDeltaX;
            newTranslateY = prev.translateY + centerDeltaY;
          }

          // If scale is back to 1, reset everything
          if (newScale <= 1) {
            return { scale: 1, translateX: 0, translateY: 0 };
          }

          return {
            scale: newScale,
            translateX: newTranslateX,
            translateY: newTranslateY,
          };
        });
      });

      lastTouchDistance.current = currentDistance;
      lastTouchCenter.current = currentCenter;
    } else if (e.touches.length === 1 && isPanning.current && lastPanPoint.current) {
      // Pan
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanPoint.current.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.current.y;

      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      animationFrame.current = requestAnimationFrame(() => {
        setTransform(prev => ({
          ...prev,
          translateX: prev.translateX + deltaX,
          translateY: prev.translateY + deltaY,
        }));
      });

      lastPanPoint.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    }
    if (e.touches.length === 0) {
      isPanning.current = false;
      lastPanPoint.current = null;

      // Snap back to 1x if close enough
      setTransform(prev => {
        if (prev.scale < 1.1) {
          return { scale: 1, translateX: 0, translateY: 0 };
        }
        return prev;
      });
    }

    // Update isZoomed state
    setTransform(prev => {
      setIsZoomed(prev.scale > 1);
      return prev;
    });
  }, []);

  // Double-tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;
    lastTap.current = now;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      e.preventDefault();
      const touch = e.changedTouches[0];

      if (transformRef.current.scale > 1) {
        // Zoom out
        resetTransform();
      } else {
        // Zoom in to 2.5x centered on the tap point
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const tapX = touch.clientX - rect.left;
          const tapY = touch.clientY - rect.top;

          const newScale = 2.5;
          const translateX = (centerX - tapX) * (newScale - 1);
          const translateY = (centerY - tapY) * (newScale - 1);

          setTransform({ scale: newScale, translateX, translateY });
          setIsZoomed(true);
        }
      }
    }
  }, [resetTransform]);

  // Cleanup animation frames
  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Swipe navigation (only when not zoomed)
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && transformRef.current.scale <= 1) {
      swipeStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  }, []);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStart.current || transformRef.current.scale > 1) {
      swipeStart.current = null;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - swipeStart.current.x;
    const deltaY = e.changedTouches[0].clientY - swipeStart.current.y;
    const elapsed = Date.now() - swipeStart.current.time;

    // Must be a quick, horizontal swipe
    if (elapsed < 400 && Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && images.length > 1) {
        handleNext();
      } else if (deltaX > 0 && images.length > 1) {
        handlePrevious();
      }
    }

    swipeStart.current = null;
  }, [images.length]);

  if (!open) return null;

  const currentImage = images[currentIndex];
  const showControls = !isZoomed;

  const galleryContent = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center select-none"
      onClick={(e) => {
        if (!isZoomed && e.target === e.currentTarget) onClose();
      }}
      style={{ position: 'fixed', touchAction: 'none' }}
    >
      {/* Close Button */}
      {showControls && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {/* Image Counter */}
      {images.length > 1 && showControls && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Action Buttons */}
      {showControls && (
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(currentImage, '_blank');
            }}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
            title="Open in new tab"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Previous Button */}
      {images.length > 1 && showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          disabled={images.length <= 1}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Main Image with zoom/pan */}
      <div
        ref={imageRef}
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-16"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          handleTouchStart(e);
          handleSwipeStart(e);
          handleDoubleTap(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => {
          handleTouchEnd(e);
          handleSwipeEnd(e);
        }}
        style={{ touchAction: 'none' }}
      >
        <img
          src={currentImage}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-full object-contain pointer-events-none"
          style={{
            maxHeight: 'calc(100vh - 120px)',
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transition: isPanning.current || lastTouchDistance.current ? 'none' : 'transform 0.2s ease-out',
            willChange: 'transform',
          }}
          draggable={false}
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          disabled={images.length <= 1}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] overflow-x-auto">
          <div className="flex gap-2 p-2 bg-black/60 rounded-lg">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`relative w-16 h-16 rounded overflow-hidden flex-shrink-0 transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-white scale-110'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zoom hint for mobile */}
      {showControls && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 sm:hidden pointer-events-none">
          <div className="bg-black/40 text-white/50 px-3 py-1 rounded-full text-xs">
            Pinch to zoom · Double-tap to enlarge
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(galleryContent, document.body);
}

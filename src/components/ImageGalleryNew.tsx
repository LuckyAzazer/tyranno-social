import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, FolderDown, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ImageGalleryNewProps {
  images: string[];
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function ImageGalleryNew({ images, open, onClose, initialIndex = 0 }: ImageGalleryNewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const { toast } = useToast();

  // Reset index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, images.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDownloadCurrent = async () => {
    const url = images[currentIndex];
    const filename = url.split('/').pop()?.split('?')[0] || `image-${currentIndex + 1}.jpg`;
    
    try {
      // Use CORS proxy to fetch the image
      const proxyUrl = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Proxy fetch failed');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      
      document.body.appendChild(link);
      
      // Use setTimeout to ensure the link is in DOM before clicking
      setTimeout(() => {
        link.click();
        
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }, 0);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to download image. Try right-clicking the image and select "Save Image As..."',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    setIsDownloadingAll(true);

    toast({
      title: 'Downloading images...',
      description: `Starting download of ${images.length} ${images.length === 1 ? 'image' : 'images'}`,
    });

    let successCount = 0;

    // Download all images with slight delay between each
    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      const filename = url.split('/').pop()?.split('?')[0] || `image-${i + 1}.jpg`;
      
      try {
        // Use CORS proxy to fetch the image
        const proxyUrl = `https://proxy.shakespeare.diy/?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error('Proxy fetch failed');
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        successCount++;
      } catch (error) {
        console.error(`Failed to download image ${i + 1}:`, error);
      }
      
      // Small delay between downloads
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }

    setIsDownloadingAll(false);
    
    if (successCount > 0) {
      toast({
        title: 'Downloads complete!',
        description: `Downloaded ${successCount} of ${images.length} ${images.length === 1 ? 'image' : 'images'}`,
      });
    } else {
      toast({
        title: 'Download failed',
        description: 'Unable to download images. Try right-clicking individual images.',
        variant: 'destructive',
      });
    }
  };

  if (!open) return null;

  const currentImage = images[currentIndex];

  const galleryContent = (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      style={{ position: 'fixed' }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
        aria-label="Close gallery"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadCurrent();
          }}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
          title="Download current image"
        >
          <Download className="h-5 w-5" />
        </button>
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAll();
            }}
            disabled={isDownloadingAll}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center disabled:opacity-50"
            title="Download all images"
          >
            {isDownloadingAll ? (
              <Download className="h-5 w-5 animate-pulse" />
            ) : (
              <FolderDown className="h-5 w-5" />
            )}
          </button>
        )}
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

      {/* Previous Button */}
      {images.length > 1 && (
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

      {/* Main Image */}
      <div
        className="relative w-full h-full flex items-center justify-center p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="max-w-full max-h-full object-contain"
          style={{
            maxHeight: 'calc(100vh - 200px)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && (
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
      {images.length > 1 && (
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
    </div>
  );

  return createPortal(galleryContent, document.body);
}

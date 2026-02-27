import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Download, ExternalLink, FolderDown } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useToast } from '@/hooks/useToast';

interface ImageGalleryProps {
  images: string[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageGallery({ images, initialIndex, open, onOpenChange }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const { toast } = useToast();

  // Reset to initial index when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
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

  const handleDownload = async () => {
    const url = images[currentIndex];
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop() || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    setIsDownloadingAll(true);
    
    try {
      toast({
        title: 'Downloading images...',
        description: `Starting download of ${images.length} ${images.length === 1 ? 'image' : 'images'}`,
      });

      // Download each image with a small delay to avoid overwhelming the browser
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = url.split('/').pop() || `image-${i + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          
          // Small delay between downloads
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Failed to download image ${i + 1}:`, error);
        }
      }

      toast({
        title: 'Download complete!',
        description: `Downloaded ${images.length} ${images.length === 1 ? 'image' : 'images'}`,
      });
    } catch (error) {
      console.error('Download all failed:', error);
      toast({
        title: 'Download failed',
        description: 'There was an error downloading the images',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const currentImage = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-0 [&>button]:text-white [&>button]:hover:bg-white/20 [&>button]:rounded-full [&>button]:h-10 [&>button]:w-10">
        <VisuallyHidden>
          <DialogTitle>Image Gallery</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex items-center justify-center">

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-4 left-4 z-50 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={handleDownload}
              title="Download current image"
            >
              <Download className="h-5 w-5" />
            </Button>
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                title="Download all images"
              >
                {isDownloadingAll ? (
                  <Download className="h-5 w-5 animate-pulse" />
                ) : (
                  <FolderDown className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => window.open(currentImage, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </Button>
          </div>

          {/* Previous Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handlePrevious}
              disabled={images.length <= 1}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center p-16">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={currentImage}
                alt={`Image ${currentIndex + 1} of ${images.length}`}
                className="max-w-full max-h-full object-contain"
                style={{ 
                  height: 'calc(100vh - 200px)',
                  width: 'auto',
                  maxWidth: '100%'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={handleNext}
              disabled={images.length <= 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Thumbnail Strip (for multiple images) */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] overflow-x-auto">
              <div className="flex gap-2 p-2 bg-black/60 rounded-lg">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
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
      </DialogContent>
    </Dialog>
  );
}

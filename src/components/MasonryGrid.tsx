import { useEffect, useRef, useState, useCallback } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { PostCard } from '@/components/PostCard';

interface MasonryGridProps {
  posts: NostrEvent[];
  columns: number;
  onPostClick?: (event: NostrEvent) => void;
}

export function MasonryGrid({ posts, columns: columnsProp, onPostClick }: MasonryGridProps) {
  // Ensure columns is a valid number between 1 and 4
  const columns = Math.max(1, Math.min(4, Number(columnsProp) || 3));
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [columnPosts, setColumnPosts] = useState<NostrEvent[][]>([]);
  const redistributeTimeoutRef = useRef<number>();
  const imageLoadCountRef = useRef<number>(0);
  const totalImagesRef = useRef<number>(0);

  // Initialize column refs array
  useEffect(() => {
    columnRefs.current = columnRefs.current.slice(0, columns);
  }, [columns]);

  // Get actual column heights from DOM
  const getColumnHeights = useCallback((): number[] => {
    return Array.from({ length: columns }, (_, i) => {
      const column = columnRefs.current[i];
      return column ? column.scrollHeight : 0;
    });
  }, [columns]);

  // Estimate height more accurately based on content
  const estimatePostHeight = useCallback((post: NostrEvent): number => {
    let height = 150; // Base height for card chrome (header, footer, padding)
    
    // Add height for text content
    const textLines = Math.ceil(post.content.length / 50); // Rough estimate of lines
    height += Math.min(textLines * 20, 300); // Cap text height at 300px
    
    // Check for images in content
    const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)/gi;
    const imageUrls = post.content.match(imageUrlPattern) || [];
    const hasImeta = post.tags.some(([name]) => name === 'imeta');
    
    if (imageUrls.length > 0 || hasImeta) {
      // Images typically add significant height
      height += 300; // Average image height in card
    }
    
    // Check for video
    const videoUrlPattern = /https?:\/\/[^\s]+\.(mp4|webm|mov)/gi;
    const hasVideo = videoUrlPattern.test(post.content);
    
    if (hasVideo) {
      height += 300; // Video player height
    }
    
    return height;
  }, []);

  // Distribute posts across columns based on estimated heights
  const distributePostsWithHeights = useCallback(() => {
    const newColumnPosts: NostrEvent[][] = Array.from({ length: columns }, () => []);
    const columnHeights: number[] = Array.from({ length: columns }, () => 0);

    posts.forEach((post, index) => {
      // For the first few posts, distribute one per column
      if (index < columns) {
        newColumnPosts[index].push(post);
        columnHeights[index] = estimatePostHeight(post);
      } else {
        // Find the shortest column
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        newColumnPosts[shortestColumnIndex].push(post);
        
        // Add estimated height to this column
        const estimatedHeight = estimatePostHeight(post);
        columnHeights[shortestColumnIndex] += estimatedHeight + 16; // +16 for gap
      }
    });

    setColumnPosts(newColumnPosts);
  }, [posts, columns, estimatePostHeight]);

  // Distribute posts when posts or columns change
  useEffect(() => {
    distributePostsWithHeights();
  }, [posts, columns, distributePostsWithHeights]);

  // Handle window resize with debounce
  useEffect(() => {
    const handleResize = () => {
      if (redistributeTimeoutRef.current) {
        clearTimeout(redistributeTimeoutRef.current);
      }
      redistributeTimeoutRef.current = window.setTimeout(() => {
        distributePostsWithHeights();
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (redistributeTimeoutRef.current) {
        clearTimeout(redistributeTimeoutRef.current);
      }
    };
  }, [distributePostsWithHeights]);

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  // Center narrow layouts so they don't stretch to full page width
  const containerClasses =
    columns === 1 ? 'max-w-2xl mx-auto w-full' :
    columns === 2 ? 'max-w-4xl mx-auto w-full' :
    '';

  return (
    <div className={containerClasses}>
      <div className={`grid ${gridClasses} gap-4`}>
        {columnPosts.map((columnItems, columnIndex) => (
          <div 
            key={columnIndex} 
            ref={(el) => (columnRefs.current[columnIndex] = el)}
            className="flex flex-col gap-4"
          >
            {columnItems.map((post) => (
              <PostCard 
                key={post.id} 
                event={post} 
                onClick={(displayEvent) => onPostClick?.(displayEvent)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

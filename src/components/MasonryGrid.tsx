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

  // Distribute posts across columns based on actual rendered heights
  const distributePostsWithHeights = useCallback(() => {
    const newColumnPosts: NostrEvent[][] = Array.from({ length: columns }, () => []);
    const columnHeights: number[] = Array.from({ length: columns }, () => 0);

    posts.forEach((post, index) => {
      // For the first few posts, distribute one per column
      if (index < columns) {
        newColumnPosts[index].push(post);
        // Estimate initial height (will be refined after render)
        columnHeights[index] = 300;
      } else {
        // Find the shortest column
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
        newColumnPosts[shortestColumnIndex].push(post);
        
        // Estimate post height based on content length
        const estimatedHeight = Math.min(800, 200 + (post.content.length * 0.5));
        columnHeights[shortestColumnIndex] += estimatedHeight + 16; // +16 for gap
      }
    });

    setColumnPosts(newColumnPosts);

    // After render, check actual heights and redistribute if needed
    if (redistributeTimeoutRef.current) {
      clearTimeout(redistributeTimeoutRef.current);
    }
    
    redistributeTimeoutRef.current = window.setTimeout(() => {
      const actualHeights = getColumnHeights();
      const maxHeight = Math.max(...actualHeights);
      const minHeight = Math.min(...actualHeights);
      
      // If columns are very unbalanced (>20% difference), redistribute
      if (maxHeight > 0 && (maxHeight - minHeight) / maxHeight > 0.2) {
        console.log('Columns unbalanced, redistributing...', { actualHeights });
        redistributeWithActualHeights();
      }
    }, 500);
  }, [posts, columns, getColumnHeights]);

  // More accurate redistribution using actual DOM heights
  const redistributeWithActualHeights = useCallback(() => {
    const newColumnPosts: NostrEvent[][] = Array.from({ length: columns }, () => []);
    const actualHeights = getColumnHeights();

    posts.forEach((post) => {
      // Find the shortest column by actual height
      const shortestColumnIndex = actualHeights.indexOf(Math.min(...actualHeights));
      newColumnPosts[shortestColumnIndex].push(post);
      
      // Update height estimate (rough approximation)
      actualHeights[shortestColumnIndex] += 300;
    });

    setColumnPosts(newColumnPosts);
  }, [posts, columns, getColumnHeights]);

  // Distribute posts when posts or columns change
  useEffect(() => {
    distributePostsWithHeights();

    return () => {
      if (redistributeTimeoutRef.current) {
        clearTimeout(redistributeTimeoutRef.current);
      }
    };
  }, [posts, columns, distributePostsWithHeights]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (redistributeTimeoutRef.current) {
        clearTimeout(redistributeTimeoutRef.current);
      }
      redistributeTimeoutRef.current = window.setTimeout(distributePostsWithHeights, 200);
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

  // For single column view, center the content with max width
  const containerClasses = columns === 1 
    ? 'max-w-2xl mx-auto w-full' 
    : '';

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
                onClick={() => onPostClick?.(post)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Distribute posts across columns using balanced distribution
  // This ensures posts are distributed more evenly across all columns
  const columnPosts: NostrEvent[][] = Array.from({ length: columns }, () => []);
  const columnHeights: number[] = Array.from({ length: columns }, () => 0);
  
  posts.forEach((post) => {
    // Find the column with the least items (most balanced approach)
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    
    // Add post to the shortest column
    columnPosts[shortestColumnIndex].push(post);
    
    // Increment the height of that column
    // We use a simple increment, assuming posts have similar average heights
    columnHeights[shortestColumnIndex]++;
  });

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
          <div key={columnIndex} className="flex flex-col gap-4">
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

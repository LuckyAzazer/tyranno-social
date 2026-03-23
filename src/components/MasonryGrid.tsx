import { useEffect, useRef, useState, useCallback } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { PostCard } from '@/components/PostCard';
import { InlineSuggestions } from '@/components/InlineSuggestions';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Inject a suggestion card after every N posts
const SUGGESTION_INTERVAL = 22;
// Estimated height of the suggestion card for column-balance purposes
const SUGGESTION_CARD_HEIGHT = 280;

interface MasonryGridProps {
  posts: NostrEvent[];
  columns: number;
  onPostClick?: (event: NostrEvent) => void;
}

// A column item is either a post or a suggestion card
type ColumnItem =
  | { type: 'post'; post: NostrEvent }
  | { type: 'suggestion'; batchIndex: number };

export function MasonryGrid({ posts, columns: columnsProp, onPostClick }: MasonryGridProps) {
  const columns = Math.max(1, Math.min(4, Number(columnsProp) || 3));
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [columnItems, setColumnItems] = useState<ColumnItem[][]>([]);
  const redistributeTimeoutRef = useRef<number>();
  const { user } = useCurrentUser();

  useEffect(() => {
    columnRefs.current = columnRefs.current.slice(0, columns);
  }, [columns]);

  const estimatePostHeight = useCallback((post: NostrEvent): number => {
    let height = 150;
    const textLines = Math.ceil(post.content.length / 50);
    height += Math.min(textLines * 20, 300);
    const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)/gi;
    const imageUrls = post.content.match(imageUrlPattern) || [];
    const hasImeta = post.tags.some(([name]) => name === 'imeta');
    if (imageUrls.length > 0 || hasImeta) height += 300;
    const videoUrlPattern = /https?:\/\/[^\s]+\.(mp4|webm|mov)/gi;
    if (videoUrlPattern.test(post.content)) height += 300;
    return height;
  }, []);

  const distributeItems = useCallback(() => {
    const newColumns: ColumnItem[][] = Array.from({ length: columns }, () => []);
    const heights: number[] = Array.from({ length: columns }, () => 0);

    let suggestionBatch = 0;
    let postsSinceLastSuggestion = 0;

    posts.forEach((post, index) => {
      // Place post in the shortest column
      const col = index < columns
        ? index
        : heights.indexOf(Math.min(...heights));

      newColumns[col].push({ type: 'post', post });
      heights[col] += estimatePostHeight(post) + 16;
      postsSinceLastSuggestion++;

      // After every SUGGESTION_INTERVAL posts, inject a suggestion card
      // into the shortest column (only for logged-in users)
      if (user && postsSinceLastSuggestion >= SUGGESTION_INTERVAL && index < posts.length - 1) {
        const shortestCol = heights.indexOf(Math.min(...heights));
        newColumns[shortestCol].push({ type: 'suggestion', batchIndex: suggestionBatch++ });
        heights[shortestCol] += SUGGESTION_CARD_HEIGHT + 16;
        postsSinceLastSuggestion = 0;
      }
    });

    setColumnItems(newColumns);
  }, [posts, columns, estimatePostHeight, user]);

  useEffect(() => {
    distributeItems();
  }, [distributeItems]);

  useEffect(() => {
    const handleResize = () => {
      if (redistributeTimeoutRef.current) clearTimeout(redistributeTimeoutRef.current);
      redistributeTimeoutRef.current = window.setTimeout(distributeItems, 300);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (redistributeTimeoutRef.current) clearTimeout(redistributeTimeoutRef.current);
    };
  }, [distributeItems]);

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const containerClasses =
    columns === 1 ? 'max-w-2xl mx-auto w-full' :
    columns === 2 ? 'max-w-4xl mx-auto w-full' :
    '';

  return (
    <div className={containerClasses}>
      <div className={`grid ${gridClasses} gap-4`}>
        {columnItems.map((items, colIndex) => (
          <div
            key={colIndex}
            ref={(el) => (columnRefs.current[colIndex] = el)}
            className="flex flex-col gap-4"
          >
            {items.map((item, itemIndex) =>
              item.type === 'post' ? (
                <PostCard
                  key={item.post.id}
                  event={item.post}
                  onClick={(displayEvent) => onPostClick?.(displayEvent)}
                />
              ) : (
                <InlineSuggestions
                  key={`suggestion-${colIndex}-${itemIndex}`}
                  batchIndex={item.batchIndex}
                />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

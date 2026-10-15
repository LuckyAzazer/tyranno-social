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
  | { type: 'post'; post: NostrEvent; estimatedHeight: number }
  | { type: 'suggestion'; batchIndex: number; key: string };

function estimatePostHeight(post: NostrEvent): number {
  let height = 150;
  const content = post.content ?? '';
  const textLines = Math.ceil(content.length / 50);
  height += Math.min(textLines * 20, 300);
  const imageUrlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)/gi;
  const imageUrls = content.match(imageUrlPattern) || [];
  const hasImeta = post.tags?.some(([name]) => name === 'imeta') ?? false;
  if (imageUrls.length > 0 || hasImeta) height += 300;
  const videoUrlPattern = /https?:\/\/[^\s]+\.(mp4|webm|mov)/gi;
  if (videoUrlPattern.test(content)) height += 300;
  return height;
}

export function MasonryGrid({ posts, columns: columnsProp, onPostClick }: MasonryGridProps) {
  const columns = Math.max(1, Math.min(4, Number(columnsProp) || 3));
  const { user } = useCurrentUser();

  const [columnItems, setColumnItems] = useState<ColumnItem[][]>(
    () => Array.from({ length: columns }, () => []),
  );

  // Track distribution state across renders so that appending new posts does
  // NOT reshuffle the posts already on screen. This is the key to smooth,
  // jank-free infinite scroll: existing cards stay exactly where they are and
  // only brand-new posts flow into the shortest column.
  const stateRef = useRef({
    columns,
    heights: Array.from({ length: columns }, () => 0),
    placedIds: new Set<string>(),
    placedCount: 0,
    suggestionBatch: 0,
    postsSinceLastSuggestion: 0,
    items: Array.from({ length: columns }, () => [] as ColumnItem[]),
  });

  // Full rebuild — used only when the column count changes or the feed is
  // replaced/refreshed (e.g. switching categories, pull-to-refresh).
  const rebuild = useCallback((sourcePosts: NostrEvent[], colCount: number) => {
    const items: ColumnItem[][] = Array.from({ length: colCount }, () => []);
    const heights: number[] = Array.from({ length: colCount }, () => 0);
    const placedIds = new Set<string>();
    let suggestionBatch = 0;
    let postsSinceLastSuggestion = 0;

    sourcePosts.forEach((post, index) => {
      if (placedIds.has(post.id)) return;
      placedIds.add(post.id);

      const col = index < colCount
        ? index
        : heights.indexOf(Math.min(...heights));

      const estimatedHeight = estimatePostHeight(post);
      items[col].push({ type: 'post', post, estimatedHeight });
      heights[col] += estimatedHeight + 16;
      postsSinceLastSuggestion++;

      if (user && postsSinceLastSuggestion >= SUGGESTION_INTERVAL && index < sourcePosts.length - 1) {
        const shortestCol = heights.indexOf(Math.min(...heights));
        items[shortestCol].push({
          type: 'suggestion',
          batchIndex: suggestionBatch,
          key: `suggestion-${suggestionBatch}`,
        });
        heights[shortestCol] += SUGGESTION_CARD_HEIGHT + 16;
        suggestionBatch++;
        postsSinceLastSuggestion = 0;
      }
    });

    stateRef.current = {
      columns: colCount,
      heights,
      placedIds,
      placedCount: placedIds.size,
      suggestionBatch,
      postsSinceLastSuggestion,
      items,
    };

    // Clone the inner arrays so React sees a new reference and re-renders.
    setColumnItems(items.map((c) => [...c]));
  }, [user]);

  // Append only the posts that haven't been placed yet. Existing columns are
  // mutated in place (then shallow-cloned for React), so on-screen cards never
  // change position.
  const appendNew = useCallback((sourcePosts: NostrEvent[]) => {
    const state = stateRef.current;
    const { heights, placedIds, items } = state;
    let { suggestionBatch, postsSinceLastSuggestion } = state;
    let placedCount = state.placedCount;
    let added = false;

    for (let index = 0; index < sourcePosts.length; index++) {
      const post = sourcePosts[index];
      if (placedIds.has(post.id)) continue;

      placedIds.add(post.id);
      added = true;

      const col = placedCount < items.length
        ? placedCount
        : heights.indexOf(Math.min(...heights));

      const estimatedHeight = estimatePostHeight(post);
      items[col].push({ type: 'post', post, estimatedHeight });
      heights[col] += estimatedHeight + 16;
      placedCount++;
      postsSinceLastSuggestion++;

      if (user && postsSinceLastSuggestion >= SUGGESTION_INTERVAL && index < sourcePosts.length - 1) {
        const shortestCol = heights.indexOf(Math.min(...heights));
        items[shortestCol].push({
          type: 'suggestion',
          batchIndex: suggestionBatch,
          key: `suggestion-${suggestionBatch}`,
        });
        heights[shortestCol] += SUGGESTION_CARD_HEIGHT + 16;
        suggestionBatch++;
        postsSinceLastSuggestion = 0;
      }
    }

    state.placedCount = placedCount;
    state.suggestionBatch = suggestionBatch;
    state.postsSinceLastSuggestion = postsSinceLastSuggestion;

    if (added) {
      setColumnItems(items.map((c) => [...c]));
    }
  }, [user]);

  useEffect(() => {
    const state = stateRef.current;

    // Column count changed → must rebuild everything.
    if (state.columns !== columns) {
      rebuild(posts, columns);
      return;
    }

    // Feed was replaced/cleared, or the first post changed (new content
    // prepended on refresh, or category switch). Detect by checking whether the
    // first already-placed post is still the first incoming post.
    const firstPlaced = state.items.flat().find((i): i is Extract<ColumnItem, { type: 'post' }> => i.type === 'post');
    const feedReset =
      posts.length < state.placedCount ||
      (posts.length > 0 && firstPlaced && firstPlaced.post.id !== posts[0].id);

    if (feedReset) {
      rebuild(posts, columns);
      return;
    }

    // Otherwise just append the newly-arrived posts without reflowing.
    appendNew(posts);
  }, [posts, columns, rebuild, appendNew]);

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
            className="flex flex-col gap-4"
          >
            {items.map((item) =>
              item.type === 'post' ? (
                <PostCard
                  key={item.post.id}
                  event={item.post}
                  estimatedHeight={item.estimatedHeight}
                  onClick={onPostClick}
                />
              ) : (
                <InlineSuggestions
                  key={item.key}
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

import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  /** Distance in px the user must pull before refresh triggers (default: 72) */
  threshold?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Attaches a native-feeling pull-to-refresh gesture to the document.
 * Returns the current pull state so you can render a visual indicator.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  enabled = true,
}: PullToRefreshOptions): PullToRefreshState {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshingRef.current) return;
      // Only start if the page is scrolled to the top
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || startYRef.current === null || isRefreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        // Scrolling up — cancel
        startYRef.current = null;
        setIsPulling(false);
        setPullDistance(0);
        return;
      }
      // Apply rubber-band resistance: distance = pull^0.65
      const resistance = Math.pow(dy, 0.65);
      setIsPulling(true);
      setPullDistance(Math.min(resistance, threshold * 1.5));
    },
    [enabled, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || startYRef.current === null || isRefreshingRef.current) return;

    const distance = pullDistance;
    startYRef.current = null;

    if (distance >= threshold) {
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      setPullDistance(0);
      setIsPulling(false);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [enabled, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, pullDistance, isRefreshing };
}

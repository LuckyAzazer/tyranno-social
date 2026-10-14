import { useEffect, useRef, useState } from 'react';

/**
 * Returns [ref, isVisible].
 *
 * Once the element enters the viewport it latches to `true` and never
 * goes back — so queries only fire once and results stay cached even
 * after the card scrolls back off screen.
 *
 * `rootMargin` defaults to "200px" so we start loading slightly before
 * the card becomes visible, eliminating the "blank card" flicker.
 */
export function useIsVisible(rootMargin = '200px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return; // already triggered — no need to observe anymore

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // latch: stop observing once seen
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return [ref, isVisible];
}

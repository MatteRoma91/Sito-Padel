'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyWhenVisibleProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

/** Renders children only when the placeholder enters viewport (Intersection Observer). */
export function LazyWhenVisible({
  children,
  fallback,
  rootMargin = '100px',
  threshold = 0,
}: LazyWhenVisibleProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {visible ? children : fallback}
    </div>
  );
}

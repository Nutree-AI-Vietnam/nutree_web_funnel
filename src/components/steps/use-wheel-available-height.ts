import { useLayoutEffect, useState, type RefObject } from 'react';

/** Height of the element the wheel may fill; null until the first measurement. */
export function useWheelAvailableHeight(ref: RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setHeight(element.clientHeight);
    // Measure before paint so the wheel never flashes at the wrong size.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}

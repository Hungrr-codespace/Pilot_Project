import { useEffect, useState } from 'react';

// The window's width (as CSS media queries see it, scrollbar included) and the width pages can use (without
// a vertical scrollbar), updated on resize and rotation.
const read = () => {
  if (typeof window === 'undefined') return { width: 1440, usableWidth: 1440 };
  const width = window.innerWidth || 1440;
  const usableWidth = Math.min(width, document.documentElement.clientWidth || width);
  return { width, usableWidth };
};

export function useViewportWidth() {
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () =>
      setSize((old) => {
        const next = read();
        return next.width === old.width && next.usableWidth === old.usableWidth ? old : next;
      });
    window.addEventListener('resize', onResize);
    // The scrollbar can appear or go once the page has rendered, without a resize
    const observer = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null;
    observer?.observe(document.documentElement);
    onResize();
    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, []);
  return size;
}

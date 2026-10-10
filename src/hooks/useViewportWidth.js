import { useEffect, useState } from 'react';

const readWidth = () => (typeof window === 'undefined' ? 1440 : window.innerWidth || 1440);

// The browser window's width, updated on resize and rotation.
export function useViewportWidth() {
  const [width, setWidth] = useState(readWidth);
  useEffect(() => {
    const onResize = () => setWidth(readWidth());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

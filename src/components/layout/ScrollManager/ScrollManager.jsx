import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Moving to another page starts at the top, or at the section named in the link (/#faq).
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    // Wait a frame so the new page has rendered before looking for the section.
    const frame = requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

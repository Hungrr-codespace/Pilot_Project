import { useEffect } from 'react';

// Fades elements marked with `data-reveal` up into place the first time they scroll into view (desktop).
// The styles are in styles/global.css. They only apply once this hook marks the page `data-reveal-ready`,
// so everything stays visible without JavaScript, and nothing moves for people who prefer reduced motion.
export function useReveal(containerRef, enabled) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-revealed', '');
          observer.unobserve(entry.target); // reveal once, then leave it in place
        });
      },
      { rootMargin: '0px 0px -10% 0px' }, // start a little after the element peeks in at the bottom
    );
    container.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    container.setAttribute('data-reveal-ready', '');

    return () => {
      observer.disconnect();
      container.removeAttribute('data-reveal-ready');
    };
  }, [containerRef, enabled]);
}
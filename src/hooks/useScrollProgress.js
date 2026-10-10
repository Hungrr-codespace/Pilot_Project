import { useEffect } from 'react';

// Writes how far an element has travelled through the screen to its `--progress` CSS variable: 0 as it
// enters at the bottom, 0.5 in the middle, 1 as it leaves at the top. Updated at most once per frame, without
// re-rendering React. With reduced motion the variable is left unset, so CSS uses its fallback.
export function useScrollProgress(ref, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 800;
      const progress = Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)));
      el.style.setProperty('--progress', progress.toFixed(4));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      el.style.removeProperty('--progress');
    };
  }, [ref, enabled]);
}
import { useEffect } from 'react';

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (t) => t * t * (3 - 2 * t);

function reset(el) {
  el.style.opacity = '';
  el.style.transform = '';
  el.style.transformOrigin = '';
  el.style.willChange = '';
  el.style.pointerEvents = '';
  delete el.dataset.morphing;
}

// Each section fades and grows in as it enters from the bottom of the screen, and shrinks away as it leaves at
// the top, so one section seems to morph into the next while scrolling.
function update(sections) {
  const reduce = prefersReducedMotion();
  const vh = window.innerHeight || 800;
  // Measure where each section really sits, without the transform from the last frame.
  sections.forEach((el) => {
    if (el.dataset.morphing) el.style.transform = 'none';
  });
  const rects = sections.map((el) => el.getBoundingClientRect());
  sections.forEach((el, i) => {
    const { top, bottom } = rects[i];
    // 0 while it peeks in at the bottom, 1 once its top is just above mid-screen
    const enter = smoothstep(clamp01((vh - top) / (vh * 0.45)));
    // 0 until its end rises past 62% of the screen, 1 near the top
    const exit = smoothstep(clamp01((vh * 0.62 - bottom) / (vh * 0.42)));
    if (reduce || (enter >= 1 && exit <= 0)) {
      if (el.dataset.morphing) reset(el);
      return;
    }
    const leaving = exit > 0;
    const visibility = Math.min(enter, 1 - exit);
    el.dataset.morphing = 'true';
    el.style.willChange = 'transform, opacity';
    el.style.opacity = visibility.toFixed(3);
    el.style.pointerEvents = visibility < 0.3 ? 'none' : '';
    el.style.transformOrigin = leaving ? '50% 100%' : '50% 0';
    el.style.transform = leaving
      ? `translate3d(0,${(-28 * exit).toFixed(1)}px,0) scale(${(1 - 0.08 * exit).toFixed(4)})`
      : `translate3d(0,${(40 * (1 - enter)).toFixed(1)}px,0) scale(${(0.92 + 0.08 * enter).toFixed(4)})`;
  });
}

// Scroll morph for every [data-morph] element inside `rootRef`. Runs only while `enabled` (the mobile design).
export function useScrollMorph(rootRef, enabled) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;
    const sections = () => Array.from(root.querySelectorAll('[data-morph]'));
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update(sections());
      });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Sections move when content above them grows or shrinks (fonts loading, an FAQ answer opening, the order
    // note zooming in), so measure again whenever the page changes size.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(root);
    update(sections());
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      cancelAnimationFrame(frame);
      sections().forEach(reset);
    };
  }, [rootRef, enabled]);
}

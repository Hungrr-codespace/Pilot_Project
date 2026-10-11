import { useEffect } from 'react';

// Scroll animations for elements marked `data-reveal` (styles in styles/global.css), on desktop and mobile.
//
// - On its own, an element animates in as it scrolls into view and out again as it leaves (drifting up or down,
//   the way it is leaving).
// - Inside a `data-reveal-group="once"` element, all of them play together once, the first time the group is
//   well into view, and then stay (the desktop road in Why Hungrr: it draws itself, then the stops and cards
//   appear one after another using their --reveal-delay).
// - Inside a `data-reveal-group="scroll"` element, they follow the scroll: the group is "drawn" down to a reading
//   line on the screen (its --reveal-progress, 0 to 1), each element appears once that line reaches it, and
//   disappears again when scrolling back up (the vertical road on mobile).
//
// Variants: data-reveal="pop" grows in, data-reveal="draw" stays in place and lets its own CSS animate.
// The styles only apply once this hook marks the page `data-reveal-ready`, so everything stays visible without
// JavaScript, and nothing moves for people who prefer reduced motion.
//
// `layoutKey` re-runs the hook when the page switches between the desktop and mobile designs (each mounts its
// own elements).
const VISIBLE_SHARE = 0.12; // how much of a single element must be on screen to show it
const GROUP_SHARE = 0.4; // how much of a play-once group must be on screen to start it
const READING_LINE = 0.72; // scroll groups are drawn down to this height of the screen (0 top, 1 bottom)

const show = (el) => el.setAttribute('data-revealed', '');
const hide = (el, side) => {
  el.removeAttribute('data-revealed');
  el.setAttribute('data-reveal-side', side);
};
const membersOf = (group) => Array.from(group.querySelectorAll('[data-reveal]'));

// Where an element sits in its group, as a share of the group's height (its upper part, so it shows as the
// line reaches it). Uses layout positions, so the element's own reveal transform does not move it.
function triggerPoint(el, group) {
  if (!('offsetTop' in el)) return 0; // an <svg>: drawn by the group's progress instead
  let top = 0;
  for (let node = el; node && node !== group; node = node.offsetParent) top += node.offsetTop;
  return (top + el.offsetHeight * 0.4) / (group.offsetHeight || 1);
}

export function useReveal(containerRef, layoutKey) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const groups = Array.from(container.querySelectorAll('[data-reveal-group]'));
    const singles = Array.from(container.querySelectorAll('[data-reveal]')).filter(
      (el) => !el.closest('[data-reveal-group]'),
    );

    // Single elements: in and out
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio, boundingClientRect }) => {
          if (isIntersecting && intersectionRatio >= VISIBLE_SHARE) show(target);
          // Leaving at the top drifts up; leaving at the bottom (or not reached yet) sinks down.
          else hide(target, boundingClientRect.top < 0 ? 'above' : 'below');
        });
      },
      // A little inside the screen edges, so elements visibly leave before they are gone
      { rootMargin: '-6% 0px -6% 0px', threshold: [0, VISIBLE_SHARE, 0.3, 0.6] },
    );
    singles.forEach((el) => observer.observe(el));

    // Play-once groups
    const onceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
          if (!isIntersecting || intersectionRatio < GROUP_SHARE) return;
          membersOf(target).forEach(show);
          onceObserver.unobserve(target);
        });
      },
      { threshold: [GROUP_SHARE] },
    );
    groups.filter((g) => g.dataset.revealGroup === 'once').forEach((g) => onceObserver.observe(g));

    // Scroll groups
    const scrollGroups = groups
      .filter((g) => g.dataset.revealGroup === 'scroll')
      .map((group) => ({
        group,
        members: membersOf(group).map((el) => ({ el, at: triggerPoint(el, group) })),
      }));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (window.innerHeight || 800) * READING_LINE;
      scrollGroups.forEach(({ group, members }) => {
        const box = group.getBoundingClientRect();
        if (!box.height) return;
        const progress = Math.min(1, Math.max(0, (line - box.top) / box.height));
        group.style.setProperty('--reveal-progress', progress.toFixed(4));
        members.forEach(({ el, at }) => (progress >= at ? show(el) : hide(el, 'below')));
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    if (scrollGroups.length) {
      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    }

    container.setAttribute('data-reveal-ready', '');

    return () => {
      observer.disconnect();
      onceObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      scrollGroups.forEach(({ group }) => group.style.removeProperty('--reveal-progress'));
      container.removeAttribute('data-reveal-ready');
    };
  }, [containerRef, layoutKey]);
}

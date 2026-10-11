import { useEffect, useState } from 'react';

// Which of the sections with these ids is being read: the first one inside a band near the top of the screen.
// Used to highlight the matching link in a page's contents list.
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(' ');

  useEffect(() => {
    const list = key.split(' ');
    setActive(list[0]);
    if (!('IntersectionObserver' in window)) return undefined;
    const inBand = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => inBand.set(entry.target.id, entry.isIntersecting));
        const first = list.find((id) => inBand.get(id));
        if (first) setActive(first);
      },
      { rootMargin: '-12% 0px -70% 0px' },
    );
    list.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [key]);

  return active;
}

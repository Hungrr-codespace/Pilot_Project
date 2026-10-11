import { useMemo } from 'react';
import { LAYOUT } from '@/config/site';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { LayoutContext } from './layout';

// Picks the design for the screen: phones and tablets (narrower than the breakpoint) get the mobile design,
// laptops and desktops the desktop design. Each design is scaled to fill the screen's width, edge to edge.
export function LayoutProvider({ children }) {
  const { width, usableWidth } = useViewportWidth();
  const value = useMemo(() => {
    const isMobile = width < LAYOUT.breakpoint; // same test as the CSS media queries
    const canvasWidth = isMobile ? LAYOUT.mobileWidth : LAYOUT.desktopWidth;
    const scale = usableWidth / canvasWidth; // without the scrollbar, so nothing is cut off at the right
    return { isMobile, scale, canvasWidth };
  }, [width, usableWidth]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

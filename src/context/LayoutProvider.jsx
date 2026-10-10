import { useMemo } from 'react';
import { LAYOUT } from '@/config/site';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { LayoutContext } from './layout';

// Picks the design for the screen: phones and tablets (narrower than the breakpoint) get the mobile design,
// laptops and desktops the desktop design. Each design is scaled to the screen width.
export function LayoutProvider({ children }) {
  const width = useViewportWidth();
  const value = useMemo(() => {
    const isMobile = width < LAYOUT.breakpoint;
    const canvasWidth = isMobile ? LAYOUT.mobileWidth : LAYOUT.desktopWidth;
    const scale = isMobile
      ? Math.min(width / LAYOUT.mobileWidth, LAYOUT.maxMobileScale)
      : Math.min(1, width / LAYOUT.desktopWidth);
    return { isMobile, scale, canvasWidth };
  }, [width]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

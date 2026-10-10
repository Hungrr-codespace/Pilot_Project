import { createContext, useContext } from 'react';

// { isMobile, scale, canvasWidth } — which design is showing and how much it is scaled. See LayoutProvider.
export const LayoutContext = createContext(null);

export function useLayout() {
  const layout = useContext(LayoutContext);
  if (!layout) throw new Error('useLayout must be used inside <LayoutProvider>');
  return layout;
}

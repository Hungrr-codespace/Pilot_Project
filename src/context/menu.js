import { createContext, useContext } from 'react';

// { settings, clusters, restaurants, dishTypes } — see src/lib/menuData.js. Provided by MenuProvider.
export const MenuContext = createContext(null);

export function useMenu() {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error('useMenu must be used inside <MenuProvider>');
  return menu;
}

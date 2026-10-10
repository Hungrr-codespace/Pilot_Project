import { describe, expect, it } from 'vitest';
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu } from './menuData';
import { countRestaurantsServing, isDishOfType, matchRestaurant } from './search';

const menu = normalizeMenu(fallbackRows);
const byId = (id) => menu.restaurants.find((r) => r.id === id);
const pick = (id) => menu.dishTypes.find((t) => t.id === id);

describe('search', () => {
  it('matches dishes to quick picks by their match words', () => {
    expect(isDishOfType({ name: 'Masala Dosa' }, pick('dosa'))).toBe(true);
    expect(isDishOfType({ name: 'Idli' }, pick('dosa'))).toBe(false);
  });

  it('lists every dish when there is no filter', () => {
    const match = matchRestaurant(byId('bt'), { dishType: null, query: '' });
    expect(match.filtered).toBe(false);
    expect(match.matches.length).toBeGreaterThan(1);
  });

  it('filters by typed dish name', () => {
    const match = matchRestaurant(byId('ad'), { dishType: null, query: 'mandi' });
    expect(match.filtered).toBe(true);
    expect(match.matches.every(({ dish }) => dish.name.toLowerCase().includes('mandi'))).toBe(true);
    expect(matchRestaurant(byId('bt'), { dishType: null, query: 'mandi' })).toBeNull();
  });

  it('shows the whole restaurant when its name matches', () => {
    const match = matchRestaurant(byId('bt'), { dishType: null, query: 'babai' });
    expect(match.filtered).toBe(false);
  });

  it('counts restaurants serving a quick pick', () => {
    expect(countRestaurantsServing(menu.restaurants, pick('chicken'))).toBeGreaterThan(0);
  });
});

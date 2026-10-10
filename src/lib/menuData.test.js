import { describe, expect, it } from 'vitest';
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu, photoUrl, slug } from './menuData';

describe('photoUrl', () => {
  it('turns a Google Drive share link into a thumbnail link', () => {
    expect(photoUrl('https://drive.google.com/file/d/abc123/view?usp=sharing')).toBe(
      'https://drive.google.com/thumbnail?id=abc123&sz=w600',
    );
  });

  it('keeps full links and maps file names to public/dishes', () => {
    expect(photoUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(photoUrl('dosa.jpg')).toBe('/dishes/dosa.jpg');
    expect(photoUrl('')).toBe('');
  });
});

describe('normalizeMenu', () => {
  const menu = normalizeMenu(fallbackRows);

  it('reads settings, clusters, restaurants and quick picks', () => {
    expect(menu.settings).toMatchObject({ gstRate: 5, deliveryCharge: 50, upiId: 'rj09aditya@oksbi' });
    expect(menu.clusters.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(menu.restaurants[0].name).toBe('Babai Tiffins');
    expect(menu.dishTypes[0]).toMatchObject({ id: 'dosa', photo: '/dishes/dosa.jpg' });
  });

  it('hides inactive restaurants and unavailable dishes', () => {
    const rows = structuredClone(fallbackRows);
    rows.Restaurants[0].active = 'no';
    rows.Dishes.find((d) => d.dish_id === 'ad1').available = false;
    const edited = normalizeMenu(rows);
    expect(edited.restaurants.some((r) => r.id === 'bt')).toBe(false);
    const dishes = edited.restaurants.flatMap((r) => r.cats.flatMap((c) => c.dishes));
    expect(dishes.some((d) => d.id === 'ad1')).toBe(false);
  });

  it('falls back to defaults for missing settings', () => {
    expect(normalizeMenu({}).settings.whatsapp).toBe('917979037042');
  });

  it('makes URL-safe ids', () => {
    expect(slug('Main Course & Rice')).toBe('main-course-rice');
  });
});

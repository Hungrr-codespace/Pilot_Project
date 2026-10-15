import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { srcSet } from '@/lib/images';
import { IMAGES } from './site';

describe('the main page picture requested early', () => {
  it('index.html asks for the same WebP list and sizes as the hero', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`imagesrcset: '${srcSet(IMAGES.appHome.webp)}'`);
    expect(html).toContain(`imagesizes: '${IMAGES.appHome.sizes}'`);
    expect(html).toContain(`href: '${IMAGES.tableWood}'`);
  });
});

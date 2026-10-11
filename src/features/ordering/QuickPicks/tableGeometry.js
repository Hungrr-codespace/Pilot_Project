// Geometry of the quick-picks table. Every quick pick appears twice around the table, so with 8 picks there
// are 16 plates, 22.5° apart. The table turns in whole plate steps.

export const TABLE = {
  // Desktop: a big round table seen from above; plates sit 600 px from the centre.
  desktop: { radius: 600, dragFactor: 0.09 },
  // Mobile: a flat oval (a circle squashed to 35% height and tilted 11.25°) with 4 plates in view.
  mobile: { radius: 264, dragFactor: 0.22, squash: 0.35, tilt: 11.25 },
};

export const plateStep = (dishTypeCount) => 360 / (dishTypeCount * 2);

// Any angle → the same angle between -180° and 180°.
export const normalizeAngle = (deg) => (((deg % 360) + 540) % 360) - 180;

// Mobile: a plate fades out as it slides past the edge of the screen. Desktop plates are always visible.
export function plateOpacity(angle, isMobile) {
  if (!isMobile) return 1;
  const fromFront = Math.abs(normalizeAngle(angle + TABLE.mobile.tilt));
  return Math.max(0, Math.min(1, (56 - fromFront) / 10));
}

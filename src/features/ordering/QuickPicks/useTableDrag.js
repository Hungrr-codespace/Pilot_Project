import { useRef } from 'react';
import { plateOpacity } from './tableGeometry';

const TURN_TRANSITION = 'transform 0.9s cubic-bezier(0.45, 0, 0.2, 1)';

// Lets the customer drag the table round. While dragging, the rotor and plates are moved directly (no React
// render per pointer move); on release the table snaps to the nearest plate step and `onTurnsChange` is called.
//   rotorRef     the element that rotates; its plates carry data-angle (their angle on the table)
//   turns        current rotation, in plate steps
export function useTableDrag({ rotorRef, turns, step, dragFactor, isMobile, onTurnsChange }) {
  const drag = useRef(null);
  const justDragged = useRef(false);

  const showAngle = (deg) => {
    const rotor = rotorRef.current;
    if (!rotor) return;
    rotor.style.transform = `rotate(${deg}deg)`;
    rotor.querySelectorAll('[data-angle]').forEach((plate) => {
      const angle = Number(plate.dataset.angle) + deg;
      plate.style.transform = `rotate(${-angle}deg)`; // keep the dish upright
      plate.style.opacity = String(plateOpacity(angle, isMobile));
    });
  };

  const animate = (on) => {
    const rotor = rotorRef.current;
    if (!rotor) return;
    rotor.style.transition = on ? TURN_TRANSITION : 'none';
    rotor.querySelectorAll('[data-angle]').forEach((plate) => {
      plate.style.transition = on
        ? `${TURN_TRANSITION}, ${TURN_TRANSITION.replace('transform', 'opacity')}`
        : 'none';
    });
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { x: event.clientX, id: event.pointerId, moved: false, dx: 0 };
  };

  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    const dx = event.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 8) return; // a tap, not a drag (yet)
      d.moved = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* pointer already gone */
      }
      animate(false);
    }
    d.dx = dx;
    showAngle(turns * step + dx * dragFactor);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    // The click that ends a drag must not pick the plate under the pointer.
    justDragged.current = true;
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
    const snapped = turns + Math.round((d.dx * dragFactor) / step);
    animate(true);
    showAngle(snapped * step);
    onTurnsChange(snapped);
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    wasJustDragged: () => justDragged.current,
  };
}

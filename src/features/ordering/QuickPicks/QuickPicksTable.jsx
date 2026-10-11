import { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { countRestaurantsServing } from '@/lib/search';
import { Icon } from '@/components/ui/Icon/Icon';
import { TablePlate } from './TablePlate';
import { TABLE, normalizeAngle, plateStep } from './tableGeometry';
import { useTableDrag } from './useTableDrag';
import styles from './QuickPicksTable.module.css';

// "What are you craving?" — a wooden table with the quick picks on plates. Turn it with the arrows or by
// dragging; tap a plate to see which restaurants serve that dish.
export function QuickPicksTable({ tableRef, className }) {
  const { isMobile } = useLayout();
  const { restaurants, dishTypes } = useMenu();
  const { state, actions } = useOrder();
  const rotorRef = useRef(null);

  const geometry = isMobile ? TABLE.mobile : TABLE.desktop;
  const step = plateStep(dishTypes.length);
  const turns = state.tableTurns;
  const rotation = turns * step;

  const servedBy = useMemo(
    () => Object.fromEntries(dishTypes.map((t) => [t.id, countRestaurantsServing(restaurants, t)])),
    [restaurants, dishTypes],
  );

  const drag = useTableDrag({
    rotorRef,
    turns,
    step,
    dragFactor: geometry.dragFactor,
    isMobile,
    onTurnsChange: actions.setTableTurns,
  });

  // Tapping a plate turns it to the front of the table and filters the restaurant list.
  const pickPlate = (index) => {
    if (drag.wasJustDragged()) return;
    const dishType = dishTypes[index % dishTypes.length];
    const offset = normalizeAngle((index + turns) * step);
    actions.pickDishType(dishType.id, turns - Math.round(offset / step));
  };

  const plates = Array.from({ length: dishTypes.length * 2 }, (_, index) => {
    const dishType = dishTypes[index % dishTypes.length];
    return (
      <TablePlate
        key={index}
        dishType={dishType}
        angle={index * step}
        rotation={rotation}
        servedBy={servedBy[dishType.id]}
        isSelected={state.dishTypeId === dishType.id}
        isMobile={isMobile}
        onPick={() => pickPlate(index)}
      />
    );
  });

  const rotor = (
    <div ref={rotorRef} className={styles.rotor} style={{ transform: `rotate(${rotation}deg)` }}>
      {plates}
    </div>
  );

  return (
    <div ref={tableRef} className={clsx(styles.band, className)}>
      <div className={styles.head}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>
            <Icon name="cutlery" size={isMobile ? 14 : 16} color="var(--color-black)" />
            Quick picks
          </span>
          <span className={styles.title}>What are you craving?</span>
          {!isMobile && (
            <span className={styles.hint}>Turn the table and tap a dish to see who serves it.</span>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles.turnButtons}>
            <TurnButton direction="left" isMobile={isMobile} onClick={() => actions.turnTable(1)} />
            <TurnButton direction="right" isMobile={isMobile} onClick={() => actions.turnTable(-1)} />
          </div>
          {!isMobile && <span className={styles.controlsHint}>Tap the arrows or drag the table</span>}
        </div>
      </div>
      {isMobile && (
        <span className={styles.mobileHint}>Swipe the table or tap a dish to see who serves it.</span>
      )}

      <div className={styles.surface} {...drag.handlers}>
        <div className={styles.wood}>
          <div aria-hidden="true" className={styles.rim} />
          <div aria-hidden="true" className={styles.glow} />
          <div aria-hidden="true" className={styles.glass}>
            <span className={styles.sheen} />
          </div>
          {isMobile ? (
            // squash the round table into a flat oval, tilted so four plates face the front
            <div className={styles.oval}>
              <div className={styles.tilt}>{rotor}</div>
            </div>
          ) : (
            rotor
          )}
          <div aria-hidden="true" className={styles.vignette} />
        </div>
      </div>
    </div>
  );
}

function TurnButton({ direction, isMobile, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous dishes' : 'Next dishes'}
      className={`${styles.turn} btn-light`}
    >
      <Icon
        name={direction === 'left' ? 'chevronLeft' : 'chevronRight'}
        size={isMobile ? 24 : 28}
        color="var(--color-black)"
      />
    </button>
  );
}

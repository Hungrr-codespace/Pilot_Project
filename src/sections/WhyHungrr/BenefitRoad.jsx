import { Fragment } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { ROAD_DESKTOP, ROAD_MOBILE } from './roadPaths';
import styles from './BenefitRoad.module.css';

// The benefits as stops along a road: from the rider (start) to the campus (the last stop).
// Desktop: the road winds left to right with cards above and below it. Mobile: it runs down the left side.
export function BenefitRoad({ benefits }) {
  const { isMobile } = useLayout();
  const road = isMobile ? ROAD_MOBILE : ROAD_DESKTOP;
  const [width, height] = road.viewBox.split(' ').slice(2);
  const lastIndex = benefits.length - 1;

  return (
    <div className={styles.road}>
      <svg width={width} height={height} viewBox={road.viewBox} aria-hidden="true" className={styles.roadSvg}>
        <path d={road.d} className={styles.asphalt} />
        <path d={road.d} className={styles.centreLine} />
      </svg>

      <span className={styles.start}>
        <Icon name="moped" size={isMobile ? 24 : 42} color="var(--color-black)" />
      </span>

      {benefits.map((benefit, i) => {
        const position = { '--i': i };
        const side = i % 2 ? styles.odd : styles.even;
        return (
          <Fragment key={benefit.title}>
            {!isMobile && <span className={clsx(styles.connector, side)} style={position} />}
            {i === lastIndex ? (
              <span className={styles.destination}>
                <Icon name="school" size={isMobile ? 22 : 42} color="var(--color-black)" />
              </span>
            ) : (
              <span className={clsx(styles.number, side)} style={position}>
                {i + 1}
              </span>
            )}
          </Fragment>
        );
      })}

      {benefits.map((benefit, i) => (
        <div
          key={benefit.title}
          className={clsx(
            styles.card,
            i % 2 ? styles.odd : styles.even,
            i === 0 && styles.first,
            i === lastIndex && styles.last,
            benefit.highlight && styles.highlight,
          )}
          style={{ '--i': i }}
          data-reveal=""
        >
          <div className={styles.cardHead}>
            <Icon
              name={benefit.icon}
              size={isMobile ? 19 : 26}
              color="var(--color-black)"
              className={styles.cardIcon}
            />
            <h3 className={styles.cardTitle}>{benefit.title}</h3>
          </div>
          <p className={styles.cardText}>{benefit.text}</p>
        </div>
      ))}
    </div>
  );
}

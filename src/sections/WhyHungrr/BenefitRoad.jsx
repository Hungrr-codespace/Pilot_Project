import { Fragment, useId } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { ROAD_DESKTOP, ROAD_MOBILE } from './roadPaths';
import styles from './BenefitRoad.module.css';

// The benefits as stops along a road: from the rider (start) to the campus (the last stop).
// Desktop: the road winds left to right with cards above and below it. The first time it scrolls into view the
// road draws itself, and each stop and its card appear when the road reaches them; then it stays.
// Mobile: the road runs down the left side and draws itself as the page scrolls, with each stop and card
// appearing as the road reaches them (and going again when scrolling back up). See hooks/useReveal.js.
export function BenefitRoad({ benefits }) {
  const { isMobile } = useLayout();
  const road = isMobile ? ROAD_MOBILE : ROAD_DESKTOP;
  const [width, height] = road.viewBox.split(' ').slice(2).map(Number);
  const lastIndex = benefits.length - 1;
  const maskId = `road-${useId().replace(/[^\w-]/g, '')}`;

  return (
    <div className={styles.road} data-reveal-group={isMobile ? 'scroll' : 'once'}>
      <svg
        width={width}
        height={height}
        viewBox={road.viewBox}
        aria-hidden="true"
        className={styles.roadSvg}
        data-reveal="draw"
      >
        {/* Only the part of the road under this line shows; the line grows from the rider to the campus. */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-width * 0.2}
          y={-height * 0.2}
          width={width * 1.4}
          height={height * 1.4}
        >
          <path d={road.draw} pathLength="1" className={styles.drawLine} />
        </mask>
        <g mask={`url(#${maskId})`}>
          <path d={road.d} className={styles.asphalt} />
          <path d={road.d} className={styles.centreLine} />
        </g>
      </svg>

      <span className={styles.start} data-reveal="pop">
        <Icon name="moped" size={isMobile ? 24 : 42} color="var(--color-black)" />
      </span>

      {benefits.map((benefit, i) => {
        const position = { '--i': i };
        const side = i % 2 ? styles.odd : styles.even;
        return (
          <Fragment key={benefit.title}>
            {!isMobile && <span className={clsx(styles.connector, side)} style={position} data-reveal="" />}
            {i === lastIndex ? (
              <span className={styles.destination} data-reveal="pop">
                <Icon name="school" size={isMobile ? 22 : 42} color="var(--color-black)" />
              </span>
            ) : (
              <span className={clsx(styles.number, side)} style={position} data-reveal="pop">
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

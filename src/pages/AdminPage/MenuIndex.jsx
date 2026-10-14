import clsx from 'clsx';
import { plural } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Switch } from '@/components/ui/Switch/Switch';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import { RestaurantLogo } from '@/features/ordering/components/RestaurantLogo';
import { SearchField } from '@/features/ordering/components/SearchField';
import styles from './MenuIndex.module.css';

// The restaurants page of the admin menu, like the menu book's index: by cluster, each restaurant with its
// "open today" switch and how many of its dishes are sold out. Choosing one opens its menu.
export function MenuIndex({ book, total, closed, query, onQuery, chosenId, onChoose, onFlip, isSaving }) {
  return (
    <div className={styles.index}>
      <div className={styles.top}>
        <span className={styles.heading}>Restaurants</span>
        <span className={styles.count}>
          {plural(total, 'restaurant')}
          {closed > 0 && <b> · {closed} closed today</b>}
        </span>
      </div>
      <SearchField id="admin-menu-search" value={query} onChange={onQuery} onClear={() => onQuery('')} />
      {book.groups.length ? (
        book.groups.map(({ cluster, restaurants }) => (
          <div key={cluster.id || 'other'} className={styles.group}>
            <div className={styles.groupHead}>
              <span className={styles.clusterLabel}>{cluster.label}</span>
              {cluster.area && <span className={styles.clusterArea}>{cluster.area}</span>}
              <span aria-hidden="true" className={styles.rule} />
              <span className={styles.groupCount}>
                {restaurants.filter((r) => r.active).length} of {restaurants.length} open
              </span>
            </div>
            {restaurants.map((r) => (
              <IndexRow
                key={r.id}
                restaurant={r}
                isChosen={r.id === chosenId}
                onChoose={() => onChoose(r.id)}
                onFlip={onFlip}
                busy={isSaving('restaurant', r.id)}
              />
            ))}
          </div>
        ))
      ) : (
        <p className={styles.empty}>Nothing on the menu matches &ldquo;{query.trim()}&rdquo;.</p>
      )}
    </div>
  );
}

function IndexRow({ restaurant: r, isChosen, onChoose, onFlip, busy }) {
  let line = r.dishCount ? `${plural(r.dishCount, 'dish', 'dishes')} · all in stock` : 'No dishes yet';
  if (r.soldOut) line = `${plural(r.dishCount, 'dish', 'dishes')} · ${r.soldOut} sold out`;
  if (!r.active) line = 'Closed today';
  return (
    <div className={clsx(styles.row, isChosen && styles.chosen, !r.active && styles.closed)}>
      <button
        type="button"
        onClick={onChoose}
        aria-current={isChosen ? 'true' : undefined}
        className={styles.choose}
      >
        <RestaurantLogo restaurant={r} className={styles.logo} />
        <span className={styles.info}>
          <span className={styles.name}>
            <span className={styles.nameText}>{r.name}</span>
            {r.veg_only && <VegMark />}
          </span>
          <span className={clsx(styles.line, (!r.active || r.soldOut > 0) && styles.warn)}>{line}</span>
        </span>
        <Icon name="chevronRight" size={20} color="var(--color-black)" />
      </button>
      <Switch
        checked={r.active}
        onChange={(on) => onFlip('restaurant', r.id, on)}
        busy={busy}
        label={`${r.name}: open today`}
      />
    </div>
  );
}

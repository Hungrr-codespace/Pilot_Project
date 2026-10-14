import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { formatRupees } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Switch } from '@/components/ui/Switch/Switch';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import { OrnamentHeading } from '@/features/ordering/components/OrnamentHeading';
import { RestaurantLogo } from '@/features/ordering/components/RestaurantLogo';
import { VegLegend } from '@/features/ordering/components/VegLegend';
import styles from './MenuPage.module.css';

// One restaurant's menu, printed as on the pilot page's menu book (categories, dotted price lines), with an
// "in stock" switch where customers see ADD, and the restaurant's own "open today" switch at the top.
export function MenuPage({ restaurant: r, cluster, searching, onFlip, isSaving, onBack }) {
  const inStock = r.dishCount - r.soldOut;
  return (
    <div className={styles.menu}>
      <div className={styles.top}>
        {onBack ? (
          <button type="button" onClick={onBack} className={`${styles.back} btn-light`}>
            <Icon name="arrowLeft" size={17} color="var(--color-black)" />
            All restaurants
          </button>
        ) : (
          <span className={styles.heading}>Menu</span>
        )}
        <VegLegend />
      </div>

      <header className={styles.head}>
        <RestaurantLogo restaurant={r} className={styles.logo} />
        <div className={styles.headInfo}>
          <h3 className={styles.name}>{r.name}</h3>
          <span className={styles.meta}>
            {cluster && cluster.id && (
              <span className={styles.cluster}>
                {cluster.label}
                {cluster.area && ` · ${cluster.area}`}
              </span>
            )}
            {r.veg_only && (
              <span className={styles.pureVeg}>
                <VegMark />
                Pure Veg
              </span>
            )}
            {!r.active && (
              <span aria-hidden="true" className={styles.stamp}>
                Closed today
              </span>
            )}
          </span>
        </div>
      </header>

      <div className={clsx(styles.openRow, !r.active && styles.closedRow)}>
        <Switch
          checked={r.active}
          onChange={(on) => onFlip('restaurant', r.id, on)}
          busy={isSaving('restaurant', r.id)}
          label={`${r.name}: open today`}
          onLabel="Open today"
          offLabel="Closed today"
        />
        <span className={styles.stockCount}>
          {r.active
            ? `${inStock} of ${r.dishCount} ${r.dishCount === 1 ? 'dish' : 'dishes'} in stock`
            : "Customers don't see it today"}
        </span>
      </div>

      <div className={clsx(styles.dishes, !r.active && styles.dimmed)}>
        {r.categories.map((category) => (
          <section key={category.name} className={styles.category} aria-label={category.name}>
            <OrnamentHeading>{category.name}</OrnamentHeading>
            {category.dishes.map((dish) => (
              <DishLine key={dish.id} dish={dish} onFlip={onFlip} busy={isSaving('dish', dish.id)} />
            ))}
          </section>
        ))}
        {!r.categories.length && (
          <p className={styles.empty}>
            {searching
              ? 'No dish here matches your search.'
              : 'No dishes for this restaurant in the sheet yet (Dishes tab).'}
          </p>
        )}
      </div>
    </div>
  );
}

// A dish as printed on the menu: veg mark, name, dotted line, price, and its switch
function DishLine({ dish, onFlip, busy }) {
  const { isMobile } = useLayout();
  const price = <span className={styles.price}>{formatRupees(dish.price)}</span>;
  return (
    <div className={clsx(styles.dish, !dish.available && styles.soldOut)}>
      <div className={styles.info}>
        <div className={styles.titleLine}>
          <VegMark veg={dish.veg} />
          <span className={styles.dishName}>{dish.name}</span>
          {!isMobile && (
            <>
              <span aria-hidden="true" className={styles.leader} />
              {price}
            </>
          )}
        </div>
        {isMobile && price}
      </div>
      <Switch
        checked={dish.available}
        onChange={(on) => onFlip('dish', dish.id, on)}
        busy={busy}
        label={`${dish.name}: in stock`}
        onLabel="In stock"
        offLabel="Sold out"
        className={styles.stock}
      />
    </div>
  );
}

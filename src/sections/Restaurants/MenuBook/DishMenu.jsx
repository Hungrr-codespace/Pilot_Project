import { CAMPUS_SHORT } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { isDishMatch } from '@/lib/search';
import { Icon } from '@/components/ui/Icon/Icon';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import { useMenuBook } from '../hooks/useMenuBook';
import { RestaurantLogo } from '../components/RestaurantLogo';
import { VegLegend } from '../components/VegLegend';
import { CategoryTabs } from '../components/CategoryTabs';
import { DishRow } from '../components/DishRow';
import { EmptyState } from '../components/EmptyState';
import { ClusterMateChips } from '../components/ClusterMates';
import { OrderBar } from '../components/OrderBar';
import styles from './DishMenu.module.css';

// The open restaurant's dishes, by category. On mobile the page also carries the restaurant's name and its
// cluster mates (desktop shows those on the facing page).
export function DishMenu() {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const { restaurant, category, filter } = useMenuBook();

  return (
    <div className={styles.page}>
      {isMobile ? (
        <MobileRestaurantHeader />
      ) : (
        <div className={styles.head}>
          <span className={styles.heading}>Menu</span>
          <VegLegend />
        </div>
      )}

      {category ? (
        <>
          <CategoryTabs
            categories={restaurant.cats}
            activeId={category.id}
            onSelect={(categoryId) => actions.selectCategory(restaurant.id, categoryId)}
          />
          <div className={styles.dishes}>
            {category.dishes.map((dish) => (
              <DishRow
                key={dish.id}
                dish={dish}
                quantity={state.cart[dish.id] || 0}
                isHighlighted={isDishMatch(dish, category, filter)}
                onChangeQuantity={(quantity) => actions.setQuantity(dish.id, quantity)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          size="large"
          title="Menu coming soon"
          text={
            isMobile
              ? "We are adding this restaurant's dishes. Pick another restaurant for now."
              : "We are adding this restaurant's dishes. Pick another restaurant in this cluster for now."
          }
        />
      )}

      <OrderBar />
    </div>
  );
}

function MobileRestaurantHeader() {
  const { actions } = useOrder();
  const { restaurant, cluster, clusterMates } = useMenuBook();
  return (
    <>
      <div className={styles.topRow}>
        <button type="button" onClick={actions.showIndex} className={styles.back}>
          <Icon name="arrowLeft" size={17} color="var(--color-black)" />
          All restaurants
        </button>
        <VegLegend />
      </div>
      <div className={styles.restaurant}>
        <RestaurantLogo restaurant={restaurant} className={styles.logo} />
        <div className={styles.restaurantInfo}>
          <span className={styles.name}>{restaurant.name}</span>
          <span className={styles.meta}>
            <Icon name="mapMarkerOutline" size={13} color="var(--color-black)" />
            {restaurant.dist} from {CAMPUS_SHORT}
            {restaurant.veg && (
              <span className={styles.pureVeg}>
                <VegMark />
                Pure Veg
              </span>
            )}
          </span>
          <span className={styles.cluster}>
            {cluster.label} · {cluster.area}
          </span>
        </div>
      </div>
      {clusterMates.length > 0 && <ClusterMateChips restaurants={clusterMates} />}
    </>
  );
}

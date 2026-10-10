import { CAMPUS_SHORT } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { Icon } from '@/components/ui/Icon/Icon';
import { useMenuBook } from '../hooks/useMenuBook';
import { SearchField } from '../components/SearchField';
import { DishTypeFilter } from '../components/DishTypeFilter';
import { ClusterGroup } from '../components/RestaurantRow';
import { EmptyState } from '../components/EmptyState';
import { MorePartnersSoon } from '../components/MorePartnersSoon';
import { OrderBar } from '../components/OrderBar';
import styles from './RestaurantIndex.module.css';

// The restaurant list: search, the quick-pick filter, restaurants grouped by cluster, and the order bar.
export function RestaurantIndex() {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const { dishType, groups } = useMenuBook();
  const noResults = groups.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.heading}>Restaurants</span>
        <span className={styles.distanceNote}>
          <Icon name="mapMarkerOutline" size={isMobile ? 13 : 15} color="var(--color-text-subtle)" />
          Distance from {CAMPUS_SHORT}
        </span>
      </div>

      <SearchField
        id={isMobile ? 'hgSearchM' : 'hgSearch'}
        value={state.query}
        onChange={actions.setQuery}
        onClear={actions.clearQuery}
      />
      {dishType && <DishTypeFilter dishType={dishType} onClear={actions.clearDishType} />}

      <div className={styles.list}>
        {groups.map((group) => (
          <ClusterGroup key={group.cluster.id} group={group} dishType={dishType} />
        ))}
        {noResults ? (
          <EmptyState
            title={
              dishType ? `No partner serves ${dishType.name} yet` : `Nothing matches “${state.query.trim()}”`
            }
            text={
              dishType
                ? 'More restaurants are joining soon. Turn the table and try another dish.'
                : 'Try a restaurant name or a dish, like dosa or mandi.'
            }
          />
        ) : (
          <MorePartnersSoon />
        )}
      </div>

      <OrderBar />
    </div>
  );
}

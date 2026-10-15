import { useSearchParams } from 'react-router';
import { StaffPage, StaffTab } from '@/features/staff/StaffPage';
import { useStaff } from '@/features/staff/useStaff';
import { OrdersBoard } from './OrdersBoard';
import { OffersPanel } from './OffersPanel';
import { ReviewsQueue } from './ReviewsQueue';
import { JoinRequests } from './JoinRequests';
import { MenuSwitches } from './MenuSwitches';
import { CustomersPanel } from './CustomersPanel';
import { NumbersPanel } from './NumbersPanel';

const TABS = [
  { id: 'orders', label: 'Orders', Panel: OrdersBoard },
  { id: 'offers', label: 'Offers & coupons', Panel: OffersPanel },
  { id: 'reviews', label: 'Reviews', Panel: ReviewsQueue },
  { id: 'join', label: 'Join requests', Panel: JoinRequests },
  { id: 'menu', label: 'Menu & notice', Panel: MenuSwitches },
  { id: 'customers', label: 'Customers', Panel: CustomersPanel },
  { id: 'numbers', label: 'Numbers', Panel: NumbersPanel },
];

// The back office (/admin, for numbers listed as admin on the Staff tab). /admin?tab=offers opens a tab directly.
// Everything here reads and writes the same Google Sheet; nothing is stored anywhere else.
export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const current = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const { call, denied } = useStaff('admin');
  const { Panel } = current;
  return (
    <StaffPage
      role="admin"
      title="Back office"
      denied={denied}
      tabs={TABS.map((t) => (
        <StaffTab
          key={t.id}
          active={t.id === current.id}
          onClick={() => setParams({ tab: t.id }, { replace: true })}
        >
          {t.label}
        </StaffTab>
      ))}
    >
      <Panel key={current.id} call={call} />
    </StaffPage>
  );
}

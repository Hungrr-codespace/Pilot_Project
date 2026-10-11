import { useLayout } from '@/context/layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { OrderingArea } from '@/features/ordering/OrderingArea';
import { PilotHeader } from './PilotHeader';

// The pilot menu page: pick dishes from the table or the menu book, review the order, add delivery details,
// pay by UPI and confirm the payment with its reference number.
export function PilotPage() {
  useDocumentTitle('Pilot menu – Hungrr');
  const { isMobile } = useLayout();
  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <PilotHeader />
      <OrderingArea />
      <PageFooter />
    </PageCanvas>
  );
}

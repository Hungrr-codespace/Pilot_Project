import { useEffect } from 'react';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { OrderingArea } from '@/features/ordering/OrderingArea';
import { PilotHeader } from './PilotHeader';

// The pilot menu page: pick dishes from the table or the menu book, review the order, add delivery details,
// pay by UPI and confirm the payment with its reference number. Arriving signed out, the sign-in opens first
// ("Just look at the menu" closes it; ordering asks again at "Confirm order").
export function PilotPage() {
  useDocumentTitle('Pilot menu – Hungrr');
  const { isMobile } = useLayout();
  const { signedIn, openSignIn } = useAccount();

  useEffect(() => {
    if (!signedIn) openSignIn({ reason: 'pilot' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arriving at the page
  }, []);

  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <PilotHeader />
      <OrderingArea />
      <PageFooter />
    </PageCanvas>
  );
}

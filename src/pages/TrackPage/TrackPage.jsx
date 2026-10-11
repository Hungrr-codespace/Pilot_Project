import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { normalizePhone } from '@/lib/checkout';
import { loadRecentOrders, normalizeOrderId } from '@/lib/tracking';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { TrackHeader } from './TrackHeader';
import { TrackForm } from './TrackForm';
import { RecentOrders } from './RecentOrders';
import { TrackResult } from './TrackResult';
import { useOrderTracking } from './useOrderTracking';
import styles from './TrackPage.module.css';

// Order tracking (/track): the order ID and the phone number it was placed with, checked against the sheet.
// No account needed. /track?order=HG-… fills in the order ID (and tracks it straight away when this phone has
// ordered before, so its number is known).
export function TrackPage() {
  useDocumentTitle('Track your order – Hungrr');
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const [params, setParams] = useSearchParams();
  const tracker = useOrderTracking();
  const formRef = useRef(null);
  const [recent] = useState(loadRecentOrders);
  const [values, setValues] = useState(() => ({
    orderId: params.get('order') || '',
    phone: state.customer.phone || '',
  }));
  const [errors, setErrors] = useState({});

  const startTracking = (form) => {
    const orderId = normalizeOrderId(form.orderId);
    const phone = normalizePhone(form.phone);
    const problems = {};
    if (!orderId) problems.orderId = 'Enter the order ID from your bill, like HG-261011-K7Q2.';
    if (!phone) problems.phone = 'Enter the 10-digit number you ordered with.';
    setErrors(problems);
    if (Object.keys(problems).length) {
      formRef.current?.elements[problems.orderId ? 'orderId' : 'phone']?.focus();
      return;
    }
    setValues({ ...form, orderId });
    setParams({ order: orderId }, { replace: true });
    tracker.track({ orderId, phone });
  };

  // Opened from "Track order" after paying: track straight away
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (normalizeOrderId(values.orderId) && normalizePhone(values.phone)) startTracking(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <TrackHeader />
      <main className={styles.body}>
        <div className={styles.side}>
          <TrackForm
            ref={formRef}
            values={values}
            errors={errors}
            busy={tracker.phase === 'loading'}
            onChange={(name, value) => {
              setValues((current) => ({ ...current, [name]: value }));
              if (errors[name]) setErrors(({ [name]: _fixed, ...rest }) => rest);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              if (tracker.phase !== 'loading') startTracking(values);
            }}
          />
          <RecentOrders
            orders={recent}
            activeId={tracker.query?.orderId}
            onPick={(order) => startTracking({ ...values, orderId: order.id })}
          />
        </div>
        <TrackResult
          phase={tracker.phase}
          order={tracker.order}
          checkedAt={tracker.checkedAt}
          refresh={tracker}
        />
      </main>
      <PageFooter />
    </PageCanvas>
  );
}

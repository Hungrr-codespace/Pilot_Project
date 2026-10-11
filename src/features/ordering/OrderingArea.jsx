import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { isOrderZoomed } from '@/context/orderReducer';
import { Section } from '@/components/layout/Section/Section';
import { QuickPicksTable } from './QuickPicks/QuickPicksTable';
import { MenuBook } from './MenuBook/MenuBook';
import { OrderNotepad } from './OrderNotepad/OrderNotepad';
import { OrderSlip } from './OrderNotepad/OrderSlip';
import { OrderSentCard } from './OrderNotepad/OrderSentCard';
import { DetailsDialog } from './Checkout/DetailsDialog';
import { PaymentDialog } from './Checkout/PaymentDialog';
import { ClusterGuide } from './ClusterGuide';
import { OrderProgress } from './OrderProgress';
import styles from './OrderingArea.module.css';

// Where ordering happens (on the pilot page): the order steps, the quick-picks table, the menu book, the order
// notepad that opens over the book, the checkout dialogs, and the bill. While paying (and after), the table fades
// and the notepad is zoomed in.
//
// The order steps stay in view while scrolling (sticky): on desktop a rail on the left of the menu, which moves
// to a bar on top of the menu once the menu zooms in for paying; on mobile always a bar on top.
export function OrderingArea() {
  const { isMobile } = useLayout();
  const { state, refs } = useOrder();
  const isZoomed = isOrderZoomed(state);
  const progressLayout = isMobile || isZoomed ? 'bar' : 'rail';

  return (
    <Section id="menu" className={clsx(styles.area, isZoomed && styles.zoomed)}>
      <div className={clsx(styles.progressTrack, styles[`${progressLayout}Track`])}>
        <OrderProgress key={progressLayout} layout={progressLayout} className={styles.progress} />
      </div>
      <QuickPicksTable tableRef={refs.tableRef} className={styles.table} />
      <div ref={refs.bookRef} className={styles.bookStage}>
        <MenuBook />
        {state.notepad.isOpen && <OrderNotepad />}
        {state.sentOrder && (
          <>
            <OrderSlip />
            <OrderSentCard />
          </>
        )}
      </div>
      {isMobile && <ClusterGuide className={styles.clusterGuide} />}
      {state.dialog === 'details' && <DetailsDialog />}
      {state.dialog === 'payment' && <PaymentDialog />}
    </Section>
  );
}

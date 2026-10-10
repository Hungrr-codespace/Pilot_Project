import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { isOrderZoomed } from '@/context/orderReducer';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { QuickPicksTable } from './QuickPicks/QuickPicksTable';
import { MenuBook } from './MenuBook/MenuBook';
import { OrderNotepad } from './OrderNotepad/OrderNotepad';
import { OrderSlip } from './OrderNotepad/OrderSlip';
import { OrderSentCard } from './OrderNotepad/OrderSentCard';
import { ClusterGuide } from './ClusterGuide';
import styles from './Restaurants.module.css';

// The ordering section: the quick-picks table, the menu book, and the order notepad that opens over the book.
// While paying (and after), the table fades and the notepad is zoomed in.
export function Restaurants() {
  const { isMobile } = useLayout();
  const { state, refs } = useOrder();
  const isZoomed = isOrderZoomed(state);

  return (
    <Section id="restaurants" className={clsx(styles.section, isZoomed && styles.zoomed)}>
      <SectionHeader
        className={styles.header}
        label="Restaurants"
        title={
          <>
            Open the menu,
            <br />
            <Highlight>pick your restaurants.</Highlight>
          </>
        }
        intro="Tap the menu to open it, check out our restaurant partners and order your favourite dishes."
        introWidth={460}
      />
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
      {isMobile && <ClusterGuide />}
    </Section>
  );
}

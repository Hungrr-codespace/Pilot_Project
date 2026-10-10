import { ORDER_STEPS } from '@/content/howItWorks';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { OrderSteps } from './OrderSteps';
import { ChatPreview } from './ChatPreview';
import styles from './HowItWorks.module.css';

export function HowItWorks() {
  return (
    <Section id="how" className={styles.section}>
      <SectionHeader
        layout="stacked"
        label="How it works"
        title={
          <>
            Order here.
            <br />
            <Highlight>Send it on WhatsApp.</Highlight>
          </>
        }
        intro="Open the menu, add dishes from one or more restaurants, pay by UPI and send us your order on WhatsApp. We take care of the rest."
        introWidth={860}
      />
      <div className={styles.body}>
        <OrderSteps steps={ORDER_STEPS} />
        <ChatPreview />
      </div>
    </Section>
  );
}

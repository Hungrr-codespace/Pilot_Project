import { ORDER_STEPS } from '@/content/howItWorks';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { PilotPass } from './PilotPass';
import { OrderSteps } from './OrderSteps';
import styles from './Pilot.module.css';

// The pilot project at BIT Mesra: timings and delivery area, the way into the pilot menu (a page of its own),
// and how ordering works, step by step.
export function Pilot() {
  return (
    <Section id="pilot" className={styles.section}>
      <SectionHeader
        label="Pilot project"
        title={
          <>
            The pilot at
            <br />
            <Highlight>BIT Mesra, Patna.</Highlight>
          </>
        }
        intro="Our first run is made for the BIT Mesra campus. Open the pilot menu, order from several restaurants at once, pay by UPI and we deliver on campus."
        introWidth={480}
      />
      <div className={styles.body}>
        <PilotPass />
        <div className={styles.how}>
          <span className={styles.howLabel} data-reveal="">
            How it works
          </span>
          <OrderSteps steps={ORDER_STEPS} />
        </div>
      </div>
    </Section>
  );
}

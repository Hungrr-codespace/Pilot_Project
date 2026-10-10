import { useLayout } from '@/context/layout';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { FaqBoard } from './FaqBoard';
import { FaqAccordion } from './FaqAccordion';
import styles from './Faq.module.css';

// Desktop: pick a question from the menu card and its answer is "served" next to it.
// Mobile: the menu card opens each answer under its question.
export function Faq() {
  const { isMobile } = useLayout();
  return (
    <Section id="faq" className={styles.section}>
      <SectionHeader
        label="FAQ"
        title={
          <>
            Hungry for
            <br />
            <Highlight>answers?</Highlight>
          </>
        }
        intro="Pick a question from our menu and we will serve the answer, hot and fresh."
        introWidth={440}
      />
      {isMobile ? <FaqAccordion /> : <FaqBoard />}
    </Section>
  );
}

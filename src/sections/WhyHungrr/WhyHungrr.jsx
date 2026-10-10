import { BENEFITS } from '@/content/whyHungrr';
import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { BenefitRoad } from './BenefitRoad';
import styles from './WhyHungrr.module.css';

export function WhyHungrr() {
  return (
    <Section id="why" className={styles.section}>
      <SectionHeader
        label="Why Hungrr"
        title={
          <>
            Every order takes
            <br />
            the <Highlight>smart route.</Highlight>
          </>
        }
        intro="Follow the road: six stops that make Hungrr the easier way to get your food."
        introWidth={440}
      />
      <BenefitRoad benefits={BENEFITS} />
    </Section>
  );
}

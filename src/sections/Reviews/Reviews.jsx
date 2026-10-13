import { Section } from '@/components/layout/Section/Section';
import { Highlight, SectionHeader } from '@/components/ui/SectionHeader/SectionHeader';
import { useReviews } from '@/features/reviews/useReviews';
import { ReviewSummary } from './ReviewSummary';
import { ReviewCarousel } from './ReviewCarousel';
import styles from './Reviews.module.css';

// What pilot customers say: the overall rating (from every review) and the reviews customers agreed to show,
// once the team has approved them. Nothing here is written by us: with no reviews yet, it invites the first one.
export function Reviews() {
  const { loading, summary, reviews } = useReviews();
  return (
    <Section id="reviews" className={styles.section}>
      <SectionHeader
        label="Pilot reviews"
        title={
          <>
            Straight from
            <br />
            <Highlight>the pilot.</Highlight>
          </>
        }
        intro="Ratings and words from people who ordered during the pilot. Every review comes from a real, paid order."
        introWidth={460}
      />
      <div className={styles.body}>
        <ReviewSummary summary={summary} loading={loading} />
        <ReviewCarousel reviews={reviews} loading={loading} />
      </div>
    </Section>
  );
}

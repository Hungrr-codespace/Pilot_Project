import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ROUTES } from '@/config/site';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { shortName, validateReview } from '@/lib/reviews';
import { submitReview } from '@/services/sheetApi';
import { Icon } from '@/components/ui/Icon/Icon';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import { forgetReviews } from '@/features/reviews/useReviews';
import { FeedbackForm } from './FeedbackForm';
import styles from './FeedbackPage.module.css';

const PROBLEMS = {
  not_found: "We couldn't find that order with this phone number. Check the order ID on your bill.",
  not_paid: 'You can review an order once it has been paid for.',
  unavailable: "Your feedback couldn't be sent just now. Try again in a moment, or message us on WhatsApp.",
};

// Feedback from pilot customers (/feedback, or /feedback?order=HG-… from the tracking page). Tied to a paid order
// by its ID and phone number (filled in when signed in, with the name from the account). Customers choose whether
// it may be shown on the website; the team approves it first.
export function FeedbackPage() {
  useDocumentTitle('Rate your order – Hungrr');
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const { user } = useAccount();
  const [params] = useSearchParams();
  const formRef = useRef(null);
  const [values, setValues] = useState(() => ({
    orderId: params.get('order') || '',
    phone: user?.phone || state.customer.phone || '',
    rating: 0,
    tags: [],
    comment: '',
    improve: '',
    name: shortName(user?.name || state.customer.name),
    consent: false,
  }));
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form'); // 'form' | 'sending' | 'done'
  const [serverError, setServerError] = useState('');

  const change = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors(({ [name]: _fixed, ...rest }) => rest);
  };

  const send = async (event) => {
    event.preventDefault();
    if (phase === 'sending') return;
    const { values: clean, errors: problems } = validateReview(values);
    setErrors(problems);
    setServerError('');
    if (Object.keys(problems).length) {
      const first = ['orderId', 'phone', 'rating', 'name'].find((name) => problems[name]);
      const box = formRef.current?.elements[first === 'rating' ? 'rating' : first];
      (box?.length ? box[0] : box)?.focus();
      return;
    }
    setPhase('sending');
    const res = await submitReview({
      order_id: clean.orderId,
      phone: clean.phone,
      rating: clean.rating,
      tags: clean.tags,
      comment: clean.comment,
      improve: clean.improve,
      name: clean.consent ? clean.name : '',
      consent: clean.consent,
    });
    if (res.ok) {
      forgetReviews();
      setPhase('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPhase('form');
    if (res.error === 'not_found') setErrors({ orderId: ' ', phone: ' ' });
    setServerError(PROBLEMS[res.error] || PROBLEMS.unavailable);
  };

  const preview = {
    rating: values.rating || 0,
    tags: values.tags,
    comment: values.comment.trim(),
    name: values.consent ? values.name.trim() : '',
    date: new Date().toISOString(),
  };

  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <PageHeader
        pill="Pilot feedback"
        title="Rate your order"
        lead="Tell us how your Hungrr order went. Your rating helps us choose which restaurants and dishes come next."
      />
      <main className={styles.body}>
        {phase === 'done' ? (
          <Thanks shown={values.consent} onEdit={() => setPhase('form')} />
        ) : (
          <FeedbackForm
            ref={formRef}
            values={values}
            errors={errors}
            onChange={change}
            onSubmit={send}
            busy={phase === 'sending'}
            serverError={serverError}
          />
        )}
        <aside className={styles.side}>
          <span className={styles.eyebrow}>
            {phase === 'done' ? 'Your review' : 'How your review will look'}
          </span>
          <ReviewCard
            review={preview}
            placeholder={preview.rating ? undefined : 'Pick your stars and write a line or two.'}
            tilt={isMobile ? 0 : -1.5}
            className={styles.preview}
          />
          <p className={styles.note}>
            <Icon name="checkCircle" size={isMobile ? 16 : 18} color="var(--color-green)" />
            {values.consent
              ? 'Shown in the Reviews section of our website once our team has checked it.'
              : 'Only our team will see this. Tick “Share it on our website” to show it to others.'}
          </p>
        </aside>
      </main>
      <PageFooter helpText="Something went wrong with an order?" />
    </PageCanvas>
  );
}

function Thanks({ shown, onEdit }) {
  const { isMobile } = useLayout();
  return (
    <div className={styles.thanks} role="status">
      <span className={styles.thanksIcon}>
        <Icon name="check" size={isMobile ? 30 : 40} color="var(--color-black)" />
      </span>
      <h2 className={styles.thanksTitle}>Thank you!</h2>
      <p className={styles.thanksText}>
        {shown
          ? 'Your review will appear on our website once our team has checked it.'
          : 'Your feedback has gone straight to our team.'}{' '}
        Every rating helps us make the next order better.
      </p>
      <div className={styles.thanksActions}>
        <Link to={ROUTES.pilot} className={`${styles.thanksPrimary} btn-black`}>
          <Icon name="bookOpen" size={isMobile ? 18 : 20} color="var(--color-yellow)" />
          Order again
        </Link>
        <Link to={ROUTES.home} className={`${styles.thanksSecondary} btn-light`}>
          Back to Hungrr
        </Link>
        <button type="button" onClick={onEdit} className={`${styles.thanksSecondary} btn-soft`}>
          Change my review
        </button>
      </div>
    </div>
  );
}

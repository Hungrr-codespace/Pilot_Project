import { forwardRef } from 'react';
import { useLayout } from '@/context/layout';
import { REVIEW_LIMITS, tagsForRating } from '@/lib/reviews';
import { TextField } from '@/components/ui/TextField/TextField';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import { StarInput } from '@/features/reviews/StarInput';
import { TagPicker } from '@/features/reviews/TagPicker';
import styles from './FeedbackForm.module.css';

// The feedback form. The page owns the values (so the preview beside it can follow them).
export const FeedbackForm = forwardRef(function FeedbackForm(
  { values, errors, onChange, onSubmit, busy, serverError },
  ref,
) {
  const { isMobile } = useLayout();
  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event) => onChange(name, event.target.value),
  });
  const good = values.rating >= 4;

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className={styles.card}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          <span className={styles.step}>1</span>
          Your order
        </legend>
        <div className={styles.row}>
          <TextField
            label="Order ID"
            placeholder="HG-261011-K7Q2"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            hint="On your bill, starts with HG."
            inputClassName={styles.mono}
            {...field('orderId')}
          />
          <TextField
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            prefix="+91"
            placeholder="98765 43210"
            maxLength={16}
            hint="The number you ordered with."
            {...field('phone')}
          />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          <span className={styles.step}>2</span>
          How was it?
        </legend>
        <StarInput
          value={values.rating}
          onChange={(rating) => {
            onChange('rating', rating);
            // Tags change between "went well" and "went wrong" lists: keep only those still offered
            onChange(
              'tags',
              values.tags.filter((tag) => tagsForRating(rating).includes(tag)),
            );
          }}
          size={isMobile ? 38 : 46}
          error={errors.rating}
        />
        {values.rating > 0 && (
          <div className={styles.tagsBlock}>
            <span className={styles.label}>{good ? 'What went well?' : 'What went wrong?'}</span>
            <TagPicker
              options={tagsForRating(values.rating)}
              selected={values.tags}
              onChange={(tags) => onChange('tags', tags)}
              label={good ? 'What went well' : 'What went wrong'}
            />
          </div>
        )}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          <span className={styles.step}>3</span>
          Tell us more
        </legend>
        <TextField
          label="Your review"
          multiline
          rows={3}
          maxLength={REVIEW_LIMITS.comment}
          placeholder={
            good ? 'The dosa was crisp and the rider was quick…' : 'What happened with your order?'
          }
          hint={`${values.comment.length}/${REVIEW_LIMITS.comment} · Shown with your stars if you agree below.`}
          {...field('comment')}
        />
        <TextField
          label="Anything we should add or improve?"
          multiline
          rows={2}
          maxLength={REVIEW_LIMITS.improve}
          placeholder="A restaurant, a dish, a time slot, anything…"
          hint="Only our team sees this."
          {...field('improve')}
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          <span className={styles.step}>4</span>
          Share it on our website?
        </legend>
        <label className={styles.consent}>
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(event) => onChange('consent', event.target.checked)}
            className={styles.checkbox}
          />
          <span>
            Show my stars, tags and review on the Hungrr website with the name below. We check every review
            before it appears, and you can ask us to remove it any time.
          </span>
        </label>
        {values.consent && (
          <TextField
            label="Name to show"
            autoComplete="nickname"
            maxLength={REVIEW_LIMITS.name}
            placeholder="Aditya R."
            {...field('name')}
          />
        )}
      </fieldset>

      {serverError && (
        <p className={styles.serverError} role="alert">
          {serverError}
        </p>
      )}
      <PrimaryButton type="submit" icon="star" busy={busy} className={styles.submit}>
        {busy ? 'Sending…' : 'Send feedback'}
      </PrimaryButton>
    </form>
  );
});

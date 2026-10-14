import { useEffect, useId, useRef, useState } from 'react';
import { ROUTES } from '@/config/site';
import { useMenu } from '@/context/menu';
import { firstName, validateNewAccount, tidyName } from '@/lib/account';
import { formatIndianPhone, loadSavedCustomer, normalizePhone } from '@/lib/checkout';
import { whatsappLink } from '@/lib/whatsapp';
import { signIn, signUp, startAccount } from '@/services/accountApi';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { Icon } from '@/components/ui/Icon/Icon';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import { PinInput } from './PinInput';
import styles from './SignInDialog.module.css';

const INTRO = {
  nav: {
    title: 'Sign in to Hungrr',
    text: 'Your khata keeps every order, bill and review in one place, on any phone.',
  },
  pilot: {
    title: 'Sign in to order',
    text: 'Your khata keeps every order, bill and review in one place, on any phone.',
  },
  order: {
    title: 'Sign in to place your order',
    text: 'This order goes into your khata, so you can track it and rate it later.',
  },
  account: { title: 'Sign in to your khata', text: 'See every order you have placed, track it and rate it.' },
};

const UNAVAILABLE = "Couldn't reach Hungrr. Check your internet and try again.";
const DONE_MS = 1500;

// Sign in or create an account, written into a khata (the account book a restaurant keeps for its regulars).
// Steps: phone number → PIN (existing account) or name + new PIN (new number) → signed in. Also: a new PIN after
// the team reset a forgotten one, and a locked account after five wrong PINs.
export function SignInDialog({ reason = 'nav', onSignedIn, onFinished, onClose }) {
  const { settings } = useMenu();
  const saved = loadSavedCustomer(); // details from an earlier order on this phone
  const [step, setStep] = useState('phone'); // phone | pin | create | reset | locked | done
  const [phone, setPhone] = useState(() => normalizePhone(saved.phone));
  const [phoneText, setPhoneText] = useState(() => normalizePhone(saved.phone));
  const [name, setName] = useState(saved.name || '');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [welcomeName, setWelcomeName] = useState('');
  const finished = useRef(false);
  const account = useRef(null);

  const go = (next, message = '') => {
    setStep(next);
    setErrors({});
    setProblem(message);
    setPin('');
    setConfirm('');
  };

  const helpLink = whatsappLink(
    settings.whatsapp,
    `Hi Hungrr, I can't sign in to my khata. My number is ${formatIndianPhone(phone)}.`,
  );

  const signedIn = (res) => {
    // The user, with the staff pages they may open (admin, rider, restaurant)
    const user = { ...res.user, roles: res.roles || [] };
    onSignedIn({ token: res.token, user });
    account.current = user;
    setWelcomeName(firstName(res.user?.name) || 'friend');
    go('done');
  };

  // Close a moment after the welcome stamp lands
  useEffect(() => {
    if (step !== 'done') return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(
      () => {
        if (finished.current) return;
        finished.current = true;
        onFinished(account.current);
      },
      reduced ? 900 : DONE_MS,
    );
    return () => clearTimeout(timer);
  }, [step, onFinished]);

  const submitPhone = async (event) => {
    event.preventDefault();
    const number = normalizePhone(phoneText);
    if (!number) {
      setErrors({ phone: 'Enter your 10-digit mobile number.' });
      return;
    }
    setPhone(number);
    setBusy(true);
    const res = await startAccount(number);
    setBusy(false);
    if (!res.ok) {
      setProblem(res.error === 'bad_phone' ? '' : UNAVAILABLE);
      if (res.error === 'bad_phone') setErrors({ phone: 'Enter your 10-digit mobile number.' });
      return;
    }
    if (res.status === 'locked') setMinutes(res.minutes || 15);
    go({ new: 'create', existing: 'pin', reset: 'reset', locked: 'locked' }[res.status] || 'pin');
  };

  const submitPin = async (event) => {
    event.preventDefault();
    if (pin.length < 6) {
      setErrors({ pin: 'Enter all 6 digits of your PIN.' });
      return;
    }
    setBusy(true);
    const res = await signIn({ phone, pin });
    setBusy(false);
    if (res.ok) return signedIn(res);
    if (res.error === 'wrong_pin') {
      const left = res.tries_left;
      setPin('');
      setProblem('');
      setErrors({
        pin: `That PIN is wrong. ${left} ${left === 1 ? 'try' : 'tries'} left before your khata locks for 15 minutes.`,
      });
    } else if (res.error === 'locked') {
      setMinutes(res.minutes || 15);
      go('locked');
    } else if (res.error === 'reset') go('reset');
    else if (res.error === 'not_found') go('create');
    else setProblem(UNAVAILABLE);
  };

  const submitNew = async (event) => {
    event.preventDefault();
    const isNew = step === 'create';
    const { values, errors: found } = validateNewAccount({ name, pin, confirm }, { needsName: isNew });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await signUp({ phone, name: values.name, pin: values.pin });
    setBusy(false);
    if (res.ok) return signedIn(res);
    if (res.error === 'exists') go('pin', 'This number already has a khata. Enter its PIN to sign in.');
    else if (res.error === 'weak_pin') setErrors({ pin: 'Pick a PIN that is harder to guess.' });
    else if (res.error === 'bad_name')
      setErrors({ name: 'Enter your name, as you would like us to call you.' });
    else setProblem(UNAVAILABLE);
  };

  const intro = INTRO[reason] || INTRO.nav;
  const heading = {
    phone: intro,
    pin: { title: 'Welcome back', text: 'Enter the 6-digit PIN you picked for this number.' },
    create: {
      title: 'Open your khata',
      text: "This number is new to us. Tell us your name and pick a PIN: you'll sign in with your number and this PIN.",
    },
    reset: { title: 'Pick a new PIN', text: 'Your PIN was reset. Pick a new 6-digit PIN for this number.' },
    locked: {
      title: 'Your khata is locked',
      text: `Too many wrong PINs. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or message us if you've forgotten your PIN.`,
    },
    done: { title: "You're signed in", text: '' },
  }[step];

  const numberLine = (
    <div className={styles.number}>
      <span className={styles.numberText}>{formatIndianPhone(phone)}</span>
      <button type="button" onClick={() => go('phone')} className={styles.textButton}>
        Change number
      </button>
    </div>
  );

  return (
    <Dialog
      title={heading.title}
      description={heading.text || undefined}
      onClose={onClose}
      focusInput={reason !== 'pilot'}
      className={styles.khata}
    >
      <div aria-hidden="true" className={styles.binding}>
        <span className={styles.stitch} />
      </div>

      {step === 'phone' && (
        <form onSubmit={submitPhone} noValidate className={styles.form}>
          <LineField
            label="Phone number"
            prefix="+91"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            maxLength={16}
            value={phoneText}
            error={errors.phone}
            onChange={(event) => {
              setPhoneText(event.target.value);
              setErrors({});
            }}
          />
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="arrowRight" busy={busy}>
            Continue
          </PrimaryButton>
          {reason === 'pilot' && (
            <button type="button" onClick={onClose} className={styles.textButton}>
              Just look at the menu
            </button>
          )}
        </form>
      )}

      {step === 'pin' && (
        <form onSubmit={submitPin} noValidate className={styles.form}>
          {numberLine}
          <input type="text" name="username" autoComplete="username" value={phone} readOnly hidden />
          <PinInput label="Your PIN" value={pin} onChange={setPin} error={errors.pin} autoFocus />
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="account" busy={busy}>
            Sign in
          </PrimaryButton>
          <ExternalLink href={helpLink} className={styles.textButton}>
            Forgot your PIN? Message us on WhatsApp
          </ExternalLink>
        </form>
      )}

      {(step === 'create' || step === 'reset') && (
        <form onSubmit={submitNew} noValidate className={styles.form}>
          {numberLine}
          <input type="text" name="username" autoComplete="username" value={phone} readOnly hidden />
          {step === 'create' && (
            <LineField
              label="Your name"
              name="name"
              autoComplete="name"
              placeholder="What should we call you?"
              maxLength={40}
              value={name}
              error={errors.name}
              autoFocus
              onChange={(event) => {
                setName(event.target.value);
                setErrors(({ name: _fixed, ...rest }) => rest);
              }}
              onBlur={() => setName((n) => tidyName(n))}
            />
          )}
          <PinInput
            label="Pick a 6-digit PIN"
            autoComplete="new-password"
            value={pin}
            onChange={(v) => {
              setPin(v);
              setErrors(({ pin: _fixed, ...rest }) => rest);
            }}
            error={errors.pin}
            hint="Not a run like 123456, and not one digit six times."
            autoFocus={step === 'reset'}
          />
          <PinInput
            label="Type it again"
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setErrors(({ confirm: _fixed, ...rest }) => rest);
            }}
            error={errors.confirm}
          />
          {step === 'create' && (
            <p className={styles.fine}>
              By creating an account you agree to our{' '}
              <a href={ROUTES.terms} target="_blank" rel="noreferrer">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href={ROUTES.privacy} target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </p>
          )}
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="check" busy={busy}>
            {step === 'create' ? 'Create account' : 'Save PIN and sign in'}
          </PrimaryButton>
        </form>
      )}

      {step === 'locked' && (
        <div className={styles.form}>
          {numberLine}
          <ExternalLink href={helpLink} className={`${styles.whatsapp} btn-black`}>
            <Icon name="whatsapp" size={22} color="var(--color-yellow)" className={styles.whatsappIcon} />
            Message us on WhatsApp
          </ExternalLink>
          <button type="button" onClick={() => go('pin')} className={styles.textButton}>
            Try my PIN again
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className={styles.done} role="status">
          <div className={styles.stamp}>
            <span className={styles.stampTop}>Welcome to your khata</span>
            <span className={styles.stampName}>{welcomeName}</span>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// A text box drawn as a line in the khata: the label above, what is typed in ink handwriting on the line.
function LineField({ label, prefix, error, hint, ...props }) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  return (
    <div className={styles.lineField}>
      <label htmlFor={id} className={styles.lineLabel}>
        {label}
      </label>
      <div className={`${styles.line} ${error ? styles.lineInvalid : ''}`}>
        {prefix && <span className={styles.linePrefix}>{prefix}</span>}
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={note ? noteId : undefined}
          className={styles.lineInput}
          {...props}
        />
      </div>
      {note && (
        <span id={noteId} className={error ? styles.lineError : styles.lineHint}>
          {note}
        </span>
      )}
    </div>
  );
}

function Problem({ text }) {
  if (!text) return null;
  return (
    <p role="alert" className={styles.problem}>
      {text}
    </p>
  );
}

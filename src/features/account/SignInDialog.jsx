import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/config/site';
import { useMenu } from '@/context/menu';
import { firstName, validateNewAccount, tidyName } from '@/lib/account';
import { formatIndianPhone, loadSavedCustomer, normalizePhone } from '@/lib/checkout';
import { APPLY_PROBLEMS, ROLE_TEXT, formatLicence, formatVehicle, validateApplication } from '@/lib/partners';
import { whatsappLink } from '@/lib/whatsapp';
import { applyAsPartner, signIn, signUp, startAccount } from '@/services/accountApi';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { Icon } from '@/components/ui/Icon/Icon';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import { ApplyFields } from './ApplyFields';
import { LineField } from './LineField';
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
  staff: { title: 'Sign in to continue', text: 'Use the phone number and PIN of your Hungrr account.' },
};

// Restaurants and riders: the same phone number and PIN, but their pages open only once the team has approved them
const PARTNER = {
  restaurant: { who: 'restaurant partner', a: 'a restaurant partner', page: 'kitchen page' },
  rider: { who: 'rider', a: 'a rider', page: 'deliveries page' },
};

const EMPTY_APPLICATION = {
  restaurant_name: '',
  restaurant_address: '',
  gstin: '',
  no_gst: false,
  fssai: '',
  dob: '',
  vehicle_no: '',
  dl_no: '',
};
const UNAVAILABLE = "Couldn't reach Hungrr. Check your internet and try again.";
const dayMonth = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
};
const DONE_MS = 1500;

// Sign in or create an account, written into a khata (the account book a restaurant keeps for its regulars).
// From the Sign in button, it first asks who is signing in: a customer, a restaurant partner or a rider.
//   Customer: phone number → PIN (existing account) or name + new PIN (new number) → signed in. Also: a new PIN
//   after the team reset a forgotten one, and a locked account after five wrong PINs.
//   Restaurant or rider (`as`): phone number → PIN → signed in only once approved (their page opens next);
//   otherwise their application: a form (new number, or not applied yet), sent, waiting, declined or removed.
// Ordering (`reason` pilot / order) and the khata go straight to the customer's sign-in.
export function SignInDialog({ reason = 'nav', as, onSignedIn, onFinished, onClose }) {
  const { settings } = useMenu();
  const saved = loadSavedCustomer(); // details from an earlier order on this phone
  const asksRole = !as && reason === 'nav';
  const [role, setRole] = useState(as || 'customer');
  const partner = PARTNER[role];
  // role | phone | pin | create | reset | locked | apply | sent | waiting | declined | removed | done
  const [step, setStep] = useState(asksRole ? 'role' : 'phone');
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
  // Partners: the application form, where it stands, and the PIN already checked (an existing account applies
  // with it, so they aren't asked twice)
  const [application, setApplication] = useState(EMPTY_APPLICATION);
  const [standing, setStanding] = useState(null);
  const [knownPin, setKnownPin] = useState('');
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
    partner
      ? `Hi Hungrr, I applied as ${partner.a} with ${formatIndianPhone(phone)}.`
      : `Hi Hungrr, I can't sign in to my khata. My number is ${formatIndianPhone(phone)}.`,
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
        onFinished(account.current, partner ? role : 'customer');
      },
      reduced ? 900 : DONE_MS,
    );
    return () => clearTimeout(timer);
  }, [step, onFinished, partner, role]);

  const pickRole = (next) => {
    setRole(next);
    go('phone');
  };

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
    // A new number applying as a restaurant or rider goes straight to the application (with a name and a PIN)
    const isNew = res.status === 'new';
    if (partner && isNew) {
      setKnownPin('');
      setApplication(EMPTY_APPLICATION);
      return go('apply');
    }
    go({ new: 'create', existing: 'pin', reset: 'reset', locked: 'locked' }[res.status] || 'pin');
  };

  // Restaurants and riders: signed in once approved, else where their application stands
  const partnerSignIn = async (withPin) => {
    const res = await signIn({ phone, pin: withPin, as: role });
    if (res.ok) return signedIn(res) || true;
    if (res.error !== 'not_approved') return res;
    setKnownPin(withPin);
    const found = res.application;
    setStanding(found);
    if (!found) {
      setApplication(EMPTY_APPLICATION);
      go('apply');
    } else {
      const d = { ...EMPTY_APPLICATION, ...found.details };
      setApplication({ ...d, vehicle_no: formatVehicle(d.vehicle_no), dl_no: formatLicence(d.dl_no) });
      go({ pending: 'waiting', declined: 'declined', removed: 'removed' }[found.status] || 'waiting');
    }
    return true;
  };

  const submitPin = async (event) => {
    event.preventDefault();
    if (pin.length < 6) {
      setErrors({ pin: 'Enter all 6 digits of your PIN.' });
      return;
    }
    setBusy(true);
    const res = partner ? await partnerSignIn(pin) : await signIn({ phone, pin });
    setBusy(false);
    if (res === true) return;
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
    else if (res.error === 'not_found') go(partner ? 'apply' : 'create');
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
    if (res.ok && partner) {
      // A new PIN after a reset: carry on as the restaurant or rider
      const next = await partnerSignIn(values.pin);
      setBusy(false);
      if (next !== true && !next.ok) setProblem(UNAVAILABLE);
      return;
    }
    setBusy(false);
    if (res.ok) return signedIn(res);
    if (res.error === 'exists') go('pin', 'This number already has a khata. Enter its PIN to sign in.');
    else if (res.error === 'weak_pin') setErrors({ pin: 'Pick a PIN that is harder to guess.' });
    else if (res.error === 'bad_name')
      setErrors({ name: 'Enter your name, as you would like us to call you.' });
    else setProblem(UNAVAILABLE);
  };

  // The application: a new number also gives a name and picks a PIN; an existing account uses its PIN
  const submitApplication = async (event) => {
    event.preventDefault();
    const needsAccount = !knownPin;
    const found = {};
    let accountValues = { name: '', pin: knownPin };
    if (needsAccount) {
      const checked = validateNewAccount({ name, pin, confirm });
      Object.assign(found, checked.errors);
      accountValues = checked.values;
    }
    const { values, errors: detailErrors } = validateApplication(role, application);
    Object.assign(found, detailErrors);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await applyAsPartner({
      phone,
      pin: accountValues.pin,
      name: accountValues.name,
      role,
      details: values,
    });
    setBusy(false);
    if (res.ok) {
      setStanding({ status: 'pending', applied_at: new Date().toISOString() });
      return go('sent');
    }
    const field = APPLY_PROBLEMS[res.error];
    if (field) setErrors({ [field[0]]: field[1] });
    else if (res.error === 'weak_pin') setErrors({ pin: 'Pick a PIN that is harder to guess.' });
    else if (res.error === 'bad_name')
      setErrors({ name: 'Enter your name, as you would like us to call you.' });
    else if (res.error === 'already_approved')
      go('pin', `You're already approved. Enter your PIN to sign in.`);
    else if (res.error === 'wrong_pin' || res.error === 'reset')
      go('pin', 'Enter your PIN again, then apply.');
    else if (res.error === 'locked') {
      setMinutes(res.minutes || 15);
      go('locked');
    } else setProblem(UNAVAILABLE);
  };

  // Waiting for approval: they can still order food with the same account
  const orderInstead = async () => {
    setBusy(true);
    const res = await signIn({ phone, pin: knownPin });
    setBusy(false);
    if (res.ok) signedIn(res);
    else setProblem(UNAVAILABLE);
  };

  const intro = INTRO[reason] || INTRO.nav;
  const appliedOn = standing?.applied_at ? dayMonth(standing.applied_at) : '';
  const heading = {
    role: { title: 'Sign in to Hungrr', text: 'Who is signing in today?' },
    phone: partner
      ? {
          title: `Sign in as ${partner.a}`,
          text: `Use your phone number. New to Hungrr? We'll ask for your details next, and your ${partner.page} opens once we approve you.`,
        }
      : intro,
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
    apply: partner && {
      title: role === 'rider' ? 'Apply to deliver with Hungrr' : 'Apply as a restaurant partner',
      text: knownPin
        ? `We'll add this to your account. We check every application, usually within a day, before your ${partner.page} opens.`
        : `We check every application, usually within a day. Then you sign in with this number and the PIN you pick here.`,
    },
    sent: partner && {
      title: 'Application sent',
      text: `Thank you! We'll check your details and message you on WhatsApp. Once approved, sign in as ${partner.a} with this number and your PIN.`,
    },
    waiting: partner && {
      title: 'Waiting for approval',
      text: `Your application${appliedOn ? ` from ${appliedOn}` : ''} is with the team. Your ${partner.page} opens as soon as we approve it.`,
    },
    declined: partner && {
      title: "We couldn't approve your application",
      text: 'You can correct your details and apply again, or message us.',
    },
    removed: partner && {
      title: `Your ${partner.page} is closed`,
      text: 'The team has removed your access. Message us if you think this is a mistake.',
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

  const terms = (
    <p className={styles.fine}>
      {partner && step === 'apply' && (
        <>
          We check these numbers on the official {role === 'rider' ? 'Parivahan' : 'GST and FSSAI'} websites
          before approving.{' '}
        </>
      )}
      By {step === 'apply' ? 'applying' : 'creating an account'} you agree to our{' '}
      <a href={ROUTES.terms} target="_blank" rel="noreferrer">
        Terms &amp; Conditions
      </a>{' '}
      and{' '}
      <a href={ROUTES.privacy} target="_blank" rel="noreferrer">
        Privacy Policy
      </a>
      .
    </p>
  );

  const pinFields = (
    <>
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
    </>
  );

  const nameField = (
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
  );

  const whatsappButton = (
    <ExternalLink href={helpLink} className={`${styles.whatsapp} btn-black`}>
      <Icon name="whatsapp" size={22} color="var(--color-yellow)" className={styles.whatsappIcon} />
      Message us on WhatsApp
    </ExternalLink>
  );

  return (
    <Dialog
      title={heading.title}
      description={heading.text || undefined}
      onClose={onClose}
      focusInput={reason !== 'pilot' && step !== 'role'}
      className={styles.khata}
    >
      <div aria-hidden="true" className={styles.binding}>
        <span className={styles.stitch} />
      </div>

      {step === 'role' && (
        <div className={styles.form}>
          <ul className={styles.roles}>
            {['customer', 'restaurant', 'rider'].map((r) => (
              <li key={r}>
                <button type="button" onClick={() => pickRole(r)} className={styles.roleRow}>
                  <span className={styles.roleIcon}>
                    <Icon name={ROLE_TEXT[r].icon} size={24} color="var(--color-black)" />
                  </span>
                  <span className={styles.roleText}>
                    <strong className={styles.roleTitle}>{ROLE_TEXT[r].title}</strong>
                    <span className={styles.roleLine}>{ROLE_TEXT[r].line}</span>
                  </span>
                  <Icon name="chevronRight" size={22} color="var(--color-black)" />
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.fine}>
            Restaurants and riders apply once with their details. Their pages open after the team approves
            them.
          </p>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={submitPhone} noValidate className={styles.form}>
          {asksRole && (
            <div className={styles.number}>
              <span className={styles.asRole}>
                <Icon name={ROLE_TEXT[role].icon} size={20} color="var(--color-black)" />
                {ROLE_TEXT[role].title}
              </span>
              <button type="button" onClick={() => go('role')} className={styles.textButton}>
                Change
              </button>
            </div>
          )}
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
            {partner ? `Sign in as ${partner.who}` : 'Sign in'}
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
          {step === 'create' && nameField}
          {pinFields}
          {step === 'create' && terms}
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="check" busy={busy}>
            {step === 'create' ? 'Create account' : 'Save PIN and sign in'}
          </PrimaryButton>
        </form>
      )}

      {step === 'apply' && partner && (
        <form onSubmit={submitApplication} noValidate className={styles.form}>
          {numberLine}
          <input type="text" name="username" autoComplete="username" value={phone} readOnly hidden />
          {!knownPin && nameField}
          <ApplyFields
            role={role}
            form={application}
            errors={errors}
            set={(field, value) => {
              setApplication((a) => ({ ...a, [field]: value }));
              setErrors(({ [field]: _fixed, ...rest }) => rest);
            }}
          />
          {!knownPin && pinFields}
          {terms}
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="check" busy={busy}>
            Send for approval
          </PrimaryButton>
        </form>
      )}

      {(step === 'sent' || step === 'waiting') && partner && (
        <div className={styles.form}>
          <div className={styles.done} role="status">
            <div className={`${styles.stamp} ${styles.stampWaiting}`}>
              <span className={styles.stampTop}>{step === 'sent' ? 'Application sent' : 'Applied'}</span>
              <span className={styles.stampName}>{step === 'sent' ? 'Thank you' : 'In review'}</span>
            </div>
          </div>
          {whatsappButton}
          {knownPin && (
            <button type="button" onClick={orderInstead} className={styles.textButton} disabled={busy}>
              Order food meanwhile (sign in as a customer)
            </button>
          )}
          {!knownPin && (
            <button type="button" onClick={onClose} className={styles.textButton}>
              Close
            </button>
          )}
        </div>
      )}

      {(step === 'declined' || step === 'removed') && partner && (
        <div className={styles.form}>
          {standing?.note && (
            <div className={styles.note}>
              <span className={styles.noteLabel}>From the team</span>
              {standing.note}
            </div>
          )}
          {step === 'declined' && (
            <PrimaryButton icon="pencil" onClick={() => go('apply')}>
              Correct my details and apply again
            </PrimaryButton>
          )}
          {whatsappButton}
          <Problem text={problem} />
        </div>
      )}

      {step === 'locked' && (
        <div className={styles.form}>
          {numberLine}
          {whatsappButton}
          <button type="button" onClick={() => go('pin')} className={styles.textButton}>
            Try my PIN again
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className={styles.done} role="status">
          <div className={styles.stamp}>
            <span className={styles.stampTop}>
              {partner ? `Signed in as ${partner.who}` : 'Welcome to your khata'}
            </span>
            <span className={styles.stampName}>{welcomeName}</span>
          </div>
        </div>
      )}
    </Dialog>
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

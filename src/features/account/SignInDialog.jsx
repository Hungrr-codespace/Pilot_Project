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
  staff: { title: 'Log in to continue', text: 'Use the phone number and PIN of your Hungrr account.' },
};

// Restaurants and riders: the same phone number and PIN, but their pages open only once the team has approved them
const PARTNER = {
  restaurant: { who: 'restaurant partner', a: 'a restaurant partner', page: 'kitchen page' },
  rider: { who: 'rider', a: 'a rider', page: 'deliveries page' },
};

// The pages a signed-in account can open, offered after logging in from the Sign in button
const PAGES = {
  admin: {
    route: ROUTES.admin,
    icon: 'notebook',
    title: 'Back office',
    line: 'Orders, menu, offers and the team',
  },
  rider: { route: ROUTES.rider, icon: 'moped', title: 'Deliveries', line: 'New orders and your deliveries' },
  restaurant: {
    route: ROUTES.partner,
    icon: 'cloche',
    title: 'Kitchen',
    line: "Today's orders for your kitchen",
  },
  customer: { route: ROUTES.pilot, icon: 'cutlery', title: 'Order food', line: 'The pilot menu' },
};

const APPLICATION_LINE = {
  pending: 'Waiting for approval',
  declined: 'Not approved: see why, and apply again',
  removed: 'Access removed by the team',
};
const STATUS_STEP = { pending: 'waiting', declined: 'declined', removed: 'removed' };

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

// Log in or create an account, written into a khata (the account book a restaurant keeps for its regulars).
//   start: Log in | Create an account.
//   Log in: phone number → PIN (or: no account with this number, a new PIN after a reset, locked after five
//     wrong PINs). Once the PIN is right the sheet says what this number is: from the Sign in button, an
//     account with team pages (admin, rider, restaurant) or an application then chooses where to go; anyone
//     else is simply signed in.
//   Create an account: who it is for (customer, restaurant partner or rider; from the Sign in button only) →
//     phone number → a number already on Hungrr is stopped ("Log in instead", or "Log in and apply") → a new
//     one gives a name and a PIN (customers) or the application (restaurants and riders).
// Ordering (`reason` pilot / order) and the khata only create customer accounts. The team pages (`as`) open
// at the log in, and after the PIN show whether the account may use that page.
export function SignInDialog({ reason = 'nav', as, onSignedIn, onFinished, onClose }) {
  const { settings } = useMenu();
  const saved = loadSavedCustomer(); // details from an earlier order on this phone
  const teamPage = Boolean(as); // opened by /admin, /rider or /partner
  const fromNav = reason === 'nav';
  const [mode, setMode] = useState('login'); // login | create
  const [kind, setKind] = useState(as || 'customer'); // who a new account is for, or the page's role
  const [applyAfter, setApplyAfter] = useState(false); // "Log in and apply": the application after the PIN
  // start | kind | phone | nouser | taken | pin | open | notyet | create | reset | locked | apply | sent |
  // waiting | declined | removed | done
  const [step, setStep] = useState(teamPage ? 'phone' : 'start');
  const [phone, setPhone] = useState(() => normalizePhone(saved.phone));
  const [phoneText, setPhoneText] = useState(() => normalizePhone(saved.phone));
  const [numberStatus, setNumberStatus] = useState(''); // what the sheet said about this number
  const [name, setName] = useState(saved.name || '');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [welcomeName, setWelcomeName] = useState('');
  const [places, setPlaces] = useState({ roles: [], applications: [] }); // after logging in
  // Partners: the application form, where it stands, and the PIN already checked (an existing account applies
  // with it, so they aren't asked twice)
  const [application, setApplication] = useState(EMPTY_APPLICATION);
  const [standing, setStanding] = useState(null);
  const [knownPin, setKnownPin] = useState('');
  const finished = useRef(false);
  const account = useRef(null); // the signed-in user, once signed in
  const goAfterDone = useRef(undefined);

  const partner = PARTNER[kind];
  // Logging in for a restaurant's or rider's page: the page's role, or the role they chose to apply as
  const loginAs = PARTNER[as] ? as : applyAfter ? kind : '';

  const go = (next, message = '') => {
    setStep(next);
    setErrors({});
    setProblem(message);
    setPin('');
    setConfirm('');
  };

  const finish = (route) => {
    if (finished.current) return;
    finished.current = true;
    onFinished(account.current, route);
  };

  const helpLink = whatsappLink(
    settings.whatsapp,
    partner && step !== 'pin'
      ? `Hi Hungrr, I applied as ${partner.a} with ${formatIndianPhone(phone)}.`
      : `Hi Hungrr, I can't sign in to my khata. My number is ${formatIndianPhone(phone)}.`,
  );

  // Signed in: the user, with the team pages they may open (admin, rider, restaurant)
  const remember = (res) => {
    const user = { ...res.user, roles: res.roles || [] };
    onSignedIn({ token: res.token, user });
    account.current = user;
    setWelcomeName(firstName(res.user?.name) || 'friend');
  };

  // Close a moment after the welcome stamp lands
  useEffect(() => {
    if (step !== 'done') return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => finish(goAfterDone.current), reduced ? 900 : DONE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per arrival at the stamp
  }, [step]);

  const startWith = (next) => {
    setMode(next);
    setApplyAfter(false);
    if (next === 'create' && fromNav) return go('kind');
    setKind(as || 'customer');
    go('phone');
  };

  // A new account for a number we already know is free: straight to the name and PIN, or the application
  const toNewAccount = (who) => {
    setKnownPin('');
    setApplication(EMPTY_APPLICATION);
    go(PARTNER[who] ? 'apply' : 'create');
  };

  const pickKind = (who) => {
    setKind(who);
    if (numberStatus === 'new' && phone) return toNewAccount(who);
    go('phone');
  };

  // Where an existing number goes to log in
  const loginStep = (status) => ({ reset: 'reset', locked: 'locked' })[status] || 'pin';

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
    setNumberStatus(res.status);
    if (res.status === 'locked') setMinutes(res.minutes || 15);
    if (mode === 'login') return go(res.status === 'new' ? 'nouser' : loginStep(res.status));
    // Creating an account: a number that is already on Hungrr can't open a second one
    if (res.status === 'new') return toNewAccount(kind);
    go('taken');
  };

  // Logging in for a restaurant's or rider's page: signed in once approved, else where their application stands
  const partnerSignIn = async (withPin) => {
    const res = await signIn({ phone, pin: withPin, as: loginAs });
    if (res.ok) {
      remember(res);
      // Chose "Log in and apply" from the Sign in button, and already approved: open their page
      if (!teamPage && fromNav) goAfterDone.current = PAGES[loginAs].route;
      go('done');
      return true;
    }
    if (res.error !== 'not_approved') return res;
    setKnownPin(withPin);
    showApplication(res.application, loginAs);
    if (!res.application) go(applyAfter ? 'apply' : 'notyet');
    return true;
  };

  // An application's step, with its details ready for "apply again"
  const showApplication = (found, role) => {
    setKind(role);
    setStanding(found);
    if (!found) {
      setApplication(EMPTY_APPLICATION);
      return;
    }
    const d = { ...EMPTY_APPLICATION, ...found.details };
    setApplication({ ...d, vehicle_no: formatVehicle(d.vehicle_no), dl_no: formatLicence(d.dl_no) });
    go(STATUS_STEP[found.status] || 'waiting');
  };

  // A plain log in: from the Sign in button, an account with team pages or applications chooses where to go
  const loggedIn = (res, withPin) => {
    remember(res);
    setKnownPin(withPin);
    const found = { roles: res.roles || [], applications: res.applications || [] };
    setPlaces(found);
    go(fromNav && (found.roles.length || found.applications.length) ? 'open' : 'done');
  };

  const submitPin = async (event) => {
    event.preventDefault();
    if (pin.length < 6) {
      setErrors({ pin: 'Enter all 6 digits of your PIN.' });
      return;
    }
    setBusy(true);
    let res;
    if (loginAs) res = await partnerSignIn(pin);
    else {
      res = await signIn({ phone, pin });
      if (res.ok) {
        setBusy(false);
        return loggedIn(res, pin);
      }
    }
    setBusy(false);
    if (res === true) return;
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
    else if (res.error === 'not_found') go('nouser');
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
    if (res.ok && loginAs) {
      // A new PIN after a reset: carry on as the restaurant or rider
      const next = await partnerSignIn(values.pin);
      setBusy(false);
      if (next !== true && !next.ok) setProblem(UNAVAILABLE);
      return;
    }
    setBusy(false);
    if (res.ok) {
      if (isNew) {
        remember(res);
        return go('done');
      }
      return loggedIn(res, values.pin); // a new PIN after a reset: as any log in
    }
    if (res.error === 'exists') {
      setNumberStatus('existing');
      go('taken');
    } else if (res.error === 'weak_pin') setErrors({ pin: 'Pick a PIN that is harder to guess.' });
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
    const { values, errors: detailErrors } = validateApplication(kind, application);
    Object.assign(found, detailErrors);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = await applyAsPartner({
      phone,
      pin: accountValues.pin,
      name: accountValues.name,
      role: kind,
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
    else if (res.error === 'already_approved') {
      setApplyAfter(true);
      go('pin', `You're already approved. Enter your PIN to log in.`);
    } else if (res.error === 'wrong_pin' || res.error === 'reset' || res.error === 'exists') {
      setNumberStatus('existing');
      go('taken');
    } else if (res.error === 'locked') {
      setMinutes(res.minutes || 15);
      go('locked');
    } else setProblem(UNAVAILABLE);
  };

  // An application waiting or declined: they can still order food with the same account
  const orderInstead = async () => {
    const route = reason === 'pilot' || reason === 'order' ? undefined : ROUTES.pilot;
    if (account.current) return finish(route);
    setBusy(true);
    const res = await signIn({ phone, pin: knownPin });
    setBusy(false);
    if (!res.ok) return setProblem(UNAVAILABLE);
    remember(res);
    finish(route);
  };

  const intro = INTRO[reason] || INTRO.nav;
  const appliedOn = standing?.applied_at ? dayMonth(standing.applied_at) : '';
  const number = formatIndianPhone(phone);
  const roleTitle = ROLE_TEXT[kind]?.title || '';
  const heading = {
    start: intro,
    kind: { title: 'Create an account', text: 'Who is the account for?' },
    phone:
      mode === 'login'
        ? teamPage
          ? partner
            ? { title: `Log in as ${partner.a}`, text: intro.text }
            : intro
          : { title: 'Log in', text: 'Enter the phone number of your Hungrr account.' }
        : partner
          ? {
              title: kind === 'rider' ? 'Apply to deliver with Hungrr' : 'Apply as a restaurant partner',
              text: `Your mobile number first: we check it isn't on Hungrr yet. Your ${partner.page} opens once we approve you.`,
            }
          : {
              title: 'Create an account',
              text: "Your mobile number first: we check it isn't on Hungrr yet. You'll log in with it and a PIN.",
            },
    nouser: {
      title: 'No account with this number',
      text: `${number} isn't on Hungrr yet. Create an account with it, or try another number.`,
    },
    taken: {
      title: 'This number already has an account',
      text: partner
        ? `${number} is already on Hungrr, so it can't open a second account. Log in with its PIN, and your ${partner.who} application goes on the same account.`
        : `${number} is already on Hungrr, so it can't open a second account. Log in with its PIN instead.`,
    },
    pin: {
      title: 'Welcome back',
      text:
        applyAfter && partner
          ? `Enter the PIN of this account, then fill in your ${partner.who} application.`
          : 'Enter the 6-digit PIN you picked for this number.',
    },
    open: { title: `Welcome back, ${welcomeName}`, text: "You're logged in. Where would you like to go?" },
    notyet: partner && {
      title: `Not ${partner.a} yet`,
      text: `This account isn't ${partner.a} on Hungrr yet. Apply with your details: your ${partner.page} opens once we approve you.`,
    },
    create: {
      title: 'Open your khata',
      text: "Tell us your name and pick a PIN: you'll log in with your number and this PIN.",
    },
    reset: { title: 'Pick a new PIN', text: 'Your PIN was reset. Pick a new 6-digit PIN for this number.' },
    locked: {
      title: 'Your khata is locked',
      text: `Too many wrong PINs. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or message us if you've forgotten your PIN.`,
    },
    apply: partner && {
      title: kind === 'rider' ? 'Apply to deliver with Hungrr' : 'Apply as a restaurant partner',
      text: knownPin
        ? `We'll add this to your account. We check every application, usually within a day, before your ${partner.page} opens.`
        : `We check every application, usually within a day. Then you log in with this number and the PIN you pick here.`,
    },
    sent: partner && {
      title: 'Application sent',
      text: `Thank you! We'll check your details and message you on WhatsApp. Once approved, log in with this number and your PIN.`,
    },
    waiting: partner && {
      title: 'Waiting for approval',
      text: `Your ${partner.who} application${appliedOn ? ` from ${appliedOn}` : ''} is with the team. Your ${partner.page} opens as soon as we approve it.`,
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
  }[step] || { title: intro.title, text: '' };

  const numberLine = (
    <div className={styles.number}>
      <span className={styles.numberText}>{number}</span>
      <button type="button" onClick={() => go('phone')} className={styles.textButton}>
        Change number
      </button>
    </div>
  );

  const terms = (
    <p className={styles.fine}>
      {partner && step === 'apply' && (
        <>
          We check these numbers on the official {kind === 'rider' ? 'Parivahan' : 'GST and FSSAI'} websites
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

  const justLook = reason === 'pilot' && (
    <button type="button" onClick={onClose} className={styles.textButton}>
      Just look at the menu
    </button>
  );

  // Back to the list of places, for an account that came from it
  const backToPlaces = account.current && fromNav && step !== 'open' && (
    <button type="button" onClick={() => go('open')} className={styles.textButton}>
      Back
    </button>
  );

  return (
    <Dialog
      title={heading.title}
      description={heading.text || undefined}
      onClose={onClose}
      focusInput={reason !== 'pilot' && step !== 'start' && step !== 'kind'}
      className={styles.khata}
    >
      <div aria-hidden="true" className={styles.binding}>
        <span className={styles.stitch} />
      </div>

      {step === 'start' && (
        <div className={styles.form}>
          <ul className={styles.roles}>
            <Choice
              icon="account"
              title="Log in"
              line="I already have a Hungrr account"
              onClick={() => startWith('login')}
            />
            <Choice
              icon="plus"
              title="Create an account"
              line={fromNav ? 'New customer, restaurant or rider' : "I'm new to Hungrr"}
              onClick={() => startWith('create')}
            />
          </ul>
          {justLook}
        </div>
      )}

      {step === 'kind' && (
        <div className={styles.form}>
          <ul className={styles.roles}>
            {['customer', 'restaurant', 'rider'].map((r) => (
              <Choice
                key={r}
                icon={ROLE_TEXT[r].icon}
                title={ROLE_TEXT[r].title}
                line={ROLE_TEXT[r].line}
                onClick={() => pickKind(r)}
              />
            ))}
          </ul>
          <p className={styles.fine}>
            Restaurants and riders apply once with their details. Their pages open after the team approves
            them.
          </p>
          <button type="button" onClick={() => startWith('login')} className={styles.textButton}>
            I already have an account: log in
          </button>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={submitPhone} noValidate className={styles.form}>
          {mode === 'create' && fromNav && (
            <div className={styles.number}>
              <span className={styles.asRole}>
                <Icon name={ROLE_TEXT[kind].icon} size={20} color="var(--color-black)" />
                {roleTitle}
              </span>
              <button type="button" onClick={() => go('kind')} className={styles.textButton}>
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
              setNumberStatus('');
              setErrors({});
            }}
          />
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="arrowRight" busy={busy}>
            Continue
          </PrimaryButton>
          {mode === 'login' ? (
            (!teamPage || partner) && (
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  if (fromNav) return go('kind');
                  go('phone');
                }}
                className={styles.textButton}
              >
                {partner && teamPage
                  ? `New to Hungrr? Apply as ${partner.a}`
                  : 'New to Hungrr? Create an account'}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                go('phone');
              }}
              className={styles.textButton}
            >
              Already have an account? Log in
            </button>
          )}
          {justLook}
        </form>
      )}

      {step === 'nouser' && (
        <div className={styles.form}>
          {numberLine}
          <PrimaryButton
            icon="plus"
            onClick={() => {
              setMode('create');
              if (fromNav && !teamPage) return go('kind');
              toNewAccount(kind);
            }}
          >
            {partner && teamPage ? `Apply as ${partner.a}` : 'Create an account'}
          </PrimaryButton>
          <button type="button" onClick={() => go('phone')} className={styles.textButton}>
            Try another number
          </button>
        </div>
      )}

      {step === 'taken' && (
        <div className={styles.form}>
          {numberLine}
          {partner ? (
            <>
              <PrimaryButton
                icon="account"
                onClick={() => {
                  setMode('login');
                  setApplyAfter(true);
                  go(loginStep(numberStatus));
                }}
              >
                Log in and apply
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setApplyAfter(false);
                  go(loginStep(numberStatus));
                }}
                className={styles.textButton}
              >
                Just log in
              </button>
            </>
          ) : (
            <>
              <PrimaryButton
                icon="account"
                onClick={() => {
                  setMode('login');
                  go(loginStep(numberStatus));
                }}
              >
                Log in instead
              </PrimaryButton>
              <button type="button" onClick={() => go('phone')} className={styles.textButton}>
                Use another number
              </button>
            </>
          )}
        </div>
      )}

      {step === 'pin' && (
        <form onSubmit={submitPin} noValidate className={styles.form}>
          {numberLine}
          <input type="text" name="username" autoComplete="username" value={phone} readOnly hidden />
          <PinInput label="Your PIN" value={pin} onChange={setPin} error={errors.pin} autoFocus />
          <Problem text={problem} />
          <PrimaryButton type="submit" icon="account" busy={busy}>
            {applyAfter && partner ? 'Log in and apply' : loginAs ? `Log in as ${partner.who}` : 'Log in'}
          </PrimaryButton>
          <ExternalLink href={helpLink} className={styles.textButton}>
            Forgot your PIN? Message us on WhatsApp
          </ExternalLink>
        </form>
      )}

      {step === 'open' && (
        <div className={styles.form}>
          <ul className={styles.roles}>
            {places.roles.map((r) => (
              <Choice
                key={r.role + r.restaurant_id}
                icon={PAGES[r.role].icon}
                title={
                  r.role === 'restaurant' && r.restaurant ? `Kitchen · ${r.restaurant}` : PAGES[r.role].title
                }
                line={PAGES[r.role].line}
                onClick={() => finish(PAGES[r.role].route)}
              />
            ))}
            {places.applications.map((app) => (
              <Choice
                key={app.role}
                icon={ROLE_TEXT[app.role].icon}
                title={`${ROLE_TEXT[app.role].title} application`}
                line={APPLICATION_LINE[app.status] || APPLICATION_LINE.pending}
                onClick={() => showApplication(app, app.role)}
              />
            ))}
            <Choice
              icon={PAGES.customer.icon}
              title={PAGES.customer.title}
              line={PAGES.customer.line}
              onClick={() => finish(PAGES.customer.route)}
            />
          </ul>
          <button type="button" onClick={() => finish()} className={styles.textButton}>
            Stay on this page
          </button>
        </div>
      )}

      {step === 'notyet' && partner && (
        <div className={styles.form}>
          {numberLine}
          <PrimaryButton
            icon="pencil"
            onClick={() => {
              setApplication(EMPTY_APPLICATION);
              go('apply');
            }}
          >
            Apply as {partner.a}
          </PrimaryButton>
          <button type="button" onClick={orderInstead} className={styles.textButton} disabled={busy}>
            Order food instead
          </button>
          <Problem text={problem} />
        </div>
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
            {step === 'create' ? 'Create account' : 'Save PIN and log in'}
          </PrimaryButton>
        </form>
      )}

      {step === 'apply' && partner && (
        <form onSubmit={submitApplication} noValidate className={styles.form}>
          {numberLine}
          <input type="text" name="username" autoComplete="username" value={phone} readOnly hidden />
          {!knownPin && nameField}
          <ApplyFields
            role={kind}
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
          {backToPlaces}
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
          {knownPin ? (
            <button type="button" onClick={orderInstead} className={styles.textButton} disabled={busy}>
              Order food meanwhile
            </button>
          ) : (
            <button type="button" onClick={onClose} className={styles.textButton}>
              Close
            </button>
          )}
          {backToPlaces}
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
          {backToPlaces}
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
              {loginAs && partner ? `Signed in as ${partner.who}` : 'Welcome to your khata'}
            </span>
            <span className={styles.stampName}>{welcomeName}</span>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// One row of a list of choices: an icon, what it is, a line in handwriting
function Choice({ icon, title, line, onClick }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={styles.roleRow}>
        <span className={styles.roleIcon}>
          <Icon name={icon} size={24} color="var(--color-black)" />
        </span>
        <span className={styles.roleText}>
          <strong className={styles.roleTitle}>{title}</strong>
          <span className={styles.roleLine}>{line}</span>
        </span>
        <Icon name="chevronRight" size={22} color="var(--color-black)" />
      </button>
    </li>
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

import { useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router';
import { ROUTES } from '@/config/site';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { NAME_LIMIT, initials, memberSince, tidyName } from '@/lib/account';
import { formatIndianPhone } from '@/lib/checkout';
import { progressText } from '@/lib/deals';
import { updateName } from '@/services/accountApi';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './RegularCard.module.css';

const TEAM_PAGES = {
  admin: { to: ROUTES.admin, label: 'Back office', icon: 'notebook' },
  rider: { to: ROUTES.rider, label: 'Deliveries', icon: 'moped' },
  restaurant: { to: ROUTES.partner, label: 'Kitchen', icon: 'cloche' },
};

// The regular's card beside the khata: initials, name (the one thing that can be changed), phone number (the
// khata's key, so it can't be), a stamp card towards the automatic offer, how long they have been a regular, and
// sign out.
export function RegularCard({ progress }) {
  const { isMobile } = useLayout();
  const { user, token, setUser, signOut, forgetSignIn } = useAccount();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startEdit = () => {
    setDraft(user.name);
    setError('');
    setSaved(false);
    setEditing(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const name = tidyName(draft);
    if (name.length < 2) {
      setError('Enter at least 2 letters.');
      return;
    }
    if (name === user.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await updateName(token, name);
    setSaving(false);
    if (res.ok) {
      setUser({ ...res.user, roles: user.roles || [] });
      setEditing(false);
      setSaved(true);
    } else if (res.error === 'signed_out') forgetSignIn();
    else
      setError(res.error === 'bad_name' ? 'Enter at least 2 letters.' : "Couldn't save just now. Try again.");
  };

  const leave = () => {
    signOut();
    navigate(ROUTES.home);
  };

  const since = memberSince(user.since);
  return (
    <aside className={styles.card} aria-label="Your details">
      <span aria-hidden="true" className={styles.token}>
        {initials(user.name)}
      </span>

      {editing ? (
        <form onSubmit={save} noValidate className={styles.editForm}>
          <label htmlFor="khata-name" className={styles.editLabel}>
            Your name
          </label>
          <input
            id="khata-name"
            value={draft}
            maxLength={NAME_LIMIT}
            autoComplete="name"
            autoFocus
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'khata-name-error' : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              setError('');
            }}
            className={styles.editInput}
          />
          {error && (
            <span id="khata-name-error" className={styles.editError}>
              {error}
            </span>
          )}
          <div className={styles.editActions}>
            <button type="submit" aria-busy={saving || undefined} className={`${styles.save} btn-yellow`}>
              {saving ? <Spinner size={18} color="var(--color-black)" /> : <Icon name="check" size={18} />}
              Save name
            </button>
            <button type="button" onClick={() => setEditing(false)} className={`${styles.cancel} btn-ghost`}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.nameRow}>
          <h2 className={styles.name}>{user.name}</h2>
          <button type="button" onClick={startEdit} className={`${styles.edit} btn-ghost`}>
            <Icon name="pencil" size={isMobile ? 15 : 17} color="currentColor" />
            Edit name
          </button>
        </div>
      )}
      {saved && !editing && (
        <span role="status" className={styles.saved}>
          <Icon name="checkCircle" size={16} color="var(--color-yellow)" />
          Name saved
        </span>
      )}

      <div className={styles.phone}>
        <Icon name="lock" size={isMobile ? 16 : 18} color="var(--color-text-on-dark)" />
        <span className={styles.phoneNumber}>{formatIndianPhone(user.phone)}</span>
      </div>
      <p className={styles.phoneNote}>
        Your phone number is your khata number, so it can&apos;t be changed here. If it has changed, message
        us.
      </p>

      {progress && <StampCard progress={progress} />}

      {user.roles?.length > 0 && (
        <nav className={styles.team} aria-label="Team pages">
          <span className={styles.teamTitle}>Your team pages</span>
          {user.roles.map((r) => (
            <Link key={r.role} to={TEAM_PAGES[r.role].to} className={`${styles.teamLink} btn-ghost`}>
              <Icon name={TEAM_PAGES[r.role].icon} size={16} color="currentColor" />
              {r.role === 'restaurant' && r.restaurant ? r.restaurant : TEAM_PAGES[r.role].label}
            </Link>
          ))}
        </nav>
      )}

      <div className={clsx(styles.foot, !since && styles.footEnd)}>
        {since && <span className={styles.since}>A regular since {since}</span>}
        <button type="button" onClick={leave} className={`${styles.signOut} btn-ghost`}>
          <Icon name="logout" size={isMobile ? 16 : 18} color="currentColor" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// A restaurant's stamp card: one stamp per paid order, the last circle is the offer. (Long cards, over 10 orders,
// show just the sentence.)
function StampCard({ progress }) {
  const { isMobile } = useLayout();
  const { every_n: total, done } = progress;
  return (
    <div className={styles.stamps}>
      <span className={styles.stampsTitle}>{progress.name}</span>
      {total <= 10 && (
        <div
          className={styles.holes}
          role="img"
          aria-label={`${done} of ${total - 1} orders stamped`}
          style={{ '--holes': total }}
        >
          {Array.from({ length: total }, (_, i) => {
            const isReward = i === total - 1;
            const isStamped = i < done;
            return (
              <span
                key={i}
                className={clsx(
                  styles.hole,
                  isStamped && styles.stamped,
                  isReward && styles.reward,
                  isReward && progress.next_gets_it && styles.rewardNext,
                )}
              >
                {isReward ? (
                  <Icon name="tag" size={isMobile ? 15 : 18} color="currentColor" />
                ) : isStamped ? (
                  <Icon name="check" size={isMobile ? 15 : 18} color="var(--color-black)" />
                ) : (
                  i + 1
                )}
              </span>
            );
          })}
        </div>
      )}
      <span className={styles.stampsText}>{progressText(progress)}</span>
    </div>
  );
}

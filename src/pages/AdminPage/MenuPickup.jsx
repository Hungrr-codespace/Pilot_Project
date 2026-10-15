import { useState } from 'react';
import clsx from 'clsx';
import { CAMPUS } from '@/config/site';
import { mapsLink } from '@/lib/rider';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import a from './admin.module.css';
import styles from './MenuPage.module.css';

// Where riders pick up from this restaurant (Restaurants tab: address, map_link). Riders see it on new orders
// and on their delivery slips, with Directions: the map link if there is one, else a map search for the address.
export function MenuPickup({ restaurant: r, onSave }) {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);

  const start = () => {
    setAddress(r.address || '');
    setLink(r.map_link || '');
    setProblem('');
    setSaved(false);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const tidy = address.replace(/\s+/g, ' ').trim();
    const url = link.trim();
    if (tidy && tidy.length < 5) return setProblem('Enter the shop, street and area.');
    if (url && !/^https?:\/\//i.test(url)) return setProblem('Paste the whole link, starting with https://');
    setBusy(true);
    setProblem('');
    const res = await onSave(r.id, tidy, url);
    setBusy(false);
    if (!res.ok) {
      setProblem(
        res.error === 'bad_link'
          ? 'Paste the whole link, starting with https://'
          : "That didn't save. Check the connection and try again.",
      );
      return;
    }
    setEditing(false);
    setSaved(true);
  };

  if (editing) {
    return (
      <form className={styles.pickupForm} onSubmit={save} noValidate>
        <label className={a.label}>
          Pickup address (riders see this)
          <textarea
            rows={2}
            maxLength={160}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Shop, street and area, e.g. Shop 4, Main Road, Mesra"
            className={clsx(a.input, styles.pickupInput)}
          />
        </label>
        <label className={a.label}>
          Google Maps link (optional)
          <input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            className={a.input}
          />
        </label>
        <p className={styles.pickupHint}>
          In Google Maps, find the restaurant, tap Share and copy the link. Without a link, riders&apos;
          Directions search for the address.
        </p>
        {problem && <p className={styles.pickupProblem}>{problem}</p>}
        <div className={styles.pickupActions}>
          <button type="submit" disabled={busy} className={`${a.button} ${a.primary} btn-black`}>
            {busy && <Spinner size={16} color="var(--color-white)" />}
            {busy ? 'Saving…' : 'Save address'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={a.textButton}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={clsx(styles.pickup, !r.address && styles.pickupEmpty)}>
      <span className={styles.pickupIcon}>
        <Icon name="moped" size={20} color="var(--color-black)" />
      </span>
      <div className={styles.pickupText}>
        <span className={styles.pickupLabel}>Riders pick up from</span>
        <span className={styles.pickupAddress}>
          {r.address || 'No address yet: riders see “Address not added yet”.'}
        </span>
        <span className={styles.pickupLinks}>
          {r.address && (
            <ExternalLink href={mapsLink(r, CAMPUS)} className={a.textButton}>
              {r.map_link ? 'Open the map link' : 'See on map'}
            </ExternalLink>
          )}
          {saved && (
            <span role="status" className={styles.pickupSaved}>
              Saved. Riders see it on their next check.
            </span>
          )}
        </span>
      </div>
      <button type="button" onClick={start} className={`${a.button} ${a.small} btn-light`}>
        <Icon name="pencil" size={15} color="var(--color-black)" />
        {r.address ? 'Edit' : 'Add address'}
      </button>
    </div>
  );
}

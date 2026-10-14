import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Switch } from '@/components/ui/Switch/Switch';
import { OrnamentHeading } from '@/features/ordering/components/OrnamentHeading';
import a from './admin.module.css';
import styles from './MenuService.module.css';

// The front of the admin menu: whether orders are being taken today (with the message customers see while
// paused), and the notice board: the one line at the top of every page, previewed as customers will see it.
export function MenuService({ data, call, reload }) {
  const [paused, setPaused] = useState(data.paused);
  const [message, setMessage] = useState(data.pause_message);
  const [banner, setBanner] = useState(data.banner);
  const [state, setState] = useState({ busy: '', done: '' });
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });

  const save = async (key, payload, done) => {
    setState({ busy: key, done: '' });
    const res = await call('shop_set', payload);
    await reload({ quiet: true });
    setState({
      busy: '',
      done: res.ok ? `${done} Customers see it within about a minute.` : "Didn't save. Try again.",
      where: key === 'banner' ? 'notice' : 'status',
      ok: res.ok,
    });
  };

  const saved = data.banner.trim();
  const draft = banner.trim();
  const noticeState = draft !== saved ? 'Preview · not saved yet' : saved ? 'Showing on every page' : '';

  return (
    <div className={styles.service}>
      <div className={styles.top}>
        <span className={styles.heading}>Today&apos;s service</span>
        <span className={styles.date}>{today}</span>
      </div>

      <div className={clsx(styles.status, paused && styles.paused)}>
        <div className={styles.statusRow}>
          <span aria-hidden="true" className={styles.lamp} />
          <span className={styles.statusText}>
            <span className={styles.statusTitle}>{paused ? 'Orders are paused' : 'Taking orders'}</span>
            <span className={styles.statusNote}>
              {paused
                ? 'Customers can look at the menu, but not order.'
                : 'Within the opening hours in Settings.'}
            </span>
          </span>
          <Switch
            checked={!paused}
            onChange={(open) => {
              setPaused(!open);
              save(
                'pause',
                { paused: !open, pause_message: message },
                open ? 'Orders are open again.' : 'Orders paused.',
              );
            }}
            busy={state.busy === 'pause'}
            label="Taking orders"
            onLabel="Open"
            offLabel="Paused"
          />
        </div>
        {state.done && state.where === 'status' && <Done state={state} />}
        {paused && (
          <div className={styles.messageRow}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
              placeholder="Message for customers, e.g. Back at 6 PM after the rain."
              aria-label="Message while paused"
              className={a.input}
            />
            <button
              type="button"
              onClick={() => save('message', { pause_message: message }, 'Message saved.')}
              aria-busy={state.busy === 'message' || undefined}
              className={`${a.button} btn-light`}
            >
              {state.busy === 'message' ? <Spinner size={14} color="var(--color-black)" /> : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.notice}>
        <OrnamentHeading>Notice board</OrnamentHeading>
        <div className={clsx(styles.preview, !draft && styles.previewEmpty)}>
          <Icon name="info" size={17} color={draft ? 'var(--color-yellow)' : 'var(--color-text-faint)'} />
          <span>{draft || 'No notice on the site'}</span>
        </div>
        <div className={styles.messageRow}>
          <input
            value={banner}
            onChange={(e) => setBanner(e.target.value)}
            maxLength={140}
            placeholder="One line for every page, e.g. Rain today: deliveries 20 min late."
            aria-label="Notice at the top of the site"
            className={a.input}
          />
          <button
            type="button"
            onClick={() => save('banner', { banner }, banner.trim() ? 'Notice saved.' : 'Notice hidden.')}
            aria-busy={state.busy === 'banner' || undefined}
            className={`${a.button} ${a.primary} btn-black`}
          >
            {state.busy === 'banner' ? (
              <Spinner size={14} color="var(--color-yellow)" />
            ) : (
              <Icon name="check" size={15} color="var(--color-yellow)" />
            )}
            Save
          </button>
        </div>
        {(noticeState || saved) && (
          <div className={styles.noticeFoot}>
            <span className={draft !== saved ? styles.unsaved : undefined}>{noticeState}</span>
            {saved && (
              <button
                type="button"
                onClick={() => {
                  setBanner('');
                  save('banner', { banner: '' }, 'Notice hidden.');
                }}
                className={a.textButton}
              >
                Take it down
              </button>
            )}
          </div>
        )}
        {state.done && state.where === 'notice' && <Done state={state} />}
      </div>
    </div>
  );
}

function Done({ state }) {
  return (
    <p role="status" className={state.ok ? styles.done : styles.failed}>
      {state.done}
    </p>
  );
}

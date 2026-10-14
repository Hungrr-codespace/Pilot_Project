import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './InstallPrompt.module.css';

const DISMISS_KEY = 'hungrr-install-dismissed';
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 4000;
const PAGES = [ROUTES.home, ROUTES.pilot, ROUTES.account, ROUTES.track];

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

// "Add Hungrr to your home screen", on phones: a card at the bottom a few seconds after arriving. On Android
// (Chrome) the Add button opens the browser's own install prompt; iPhones can't do that from a website, so the
// card says how (Share → Add to Home Screen). Not shown once installed, and hidden for 14 days after closing.
export function InstallPrompt() {
  const { isMobile, scale } = useLayout();
  const { pathname } = useLocation();
  const [event, setEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ios] = useState(isIos);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return undefined;
    const onPrompt = (e) => {
      e.preventDefault(); // keep the browser's mini bar away; our card offers it instead
      setEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timer);
    };
  }, []);

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage blocked */
    }
  };

  const install = async () => {
    if (!event) return;
    event.prompt();
    const choice = await event.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setVisible(false);
    setEvent(null);
  };

  if (!visible || !isMobile || !PAGES.includes(pathname) || (!event && !ios)) return null;

  return (
    <aside className={styles.card} style={{ zoom: scale }} aria-label="Add Hungrr to your home screen">
      <span className={styles.icon}>
        <Icon name="moped" size={26} color="var(--color-black)" />
      </span>
      <span className={styles.text}>
        <strong className={styles.title}>Add Hungrr to your home screen</strong>
        {ios ? (
          <span className={styles.body}>
            Tap <Icon name="share" size={16} color="currentColor" className={styles.inline} /> Share at the
            bottom of Safari, then <b>Add to Home Screen</b>.
          </span>
        ) : (
          <span className={styles.body}>It opens like an app, straight to the menu and your khata.</span>
        )}
      </span>
      {!ios && (
        <button type="button" onClick={install} className={`${styles.add} btn-black`}>
          Add
        </button>
      )}
      <button type="button" onClick={close} aria-label="Not now" className={`${styles.close} btn-soft`}>
        <Icon name="close" size={18} color="var(--color-black)" />
      </button>
    </aside>
  );
}

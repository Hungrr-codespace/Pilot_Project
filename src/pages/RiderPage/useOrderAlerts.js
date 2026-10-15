import { useCallback, useEffect, useRef, useState } from 'react';

const SAVED = 'hungrr-rider-alerts'; // this phone remembers the switch

const read = () => {
  try {
    return localStorage.getItem(SAVED) === 'on';
  } catch {
    return false;
  }
};
const save = (on) => {
  try {
    localStorage.setItem(SAVED, on ? 'on' : 'off');
  } catch {
    /* private window: the switch resets next time */
  }
};
const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

// New-order alerts on the rider's phone while the rider page is open: a chime, a buzz (Android) and, when the
// page is in the background, a phone notification that opens the page's new orders. A website can't alert a
// phone once the page is closed; the riders' Telegram group (see SETUP.md) covers that.
//   status: 'off' | 'on' | 'ask' (notifications not allowed yet) | 'blocked' (chime only) | 'no_notifications'
export function useOrderAlerts() {
  const [on, setOnState] = useState(read);
  const [permission, setPermission] = useState(() => (canNotify() ? Notification.permission : 'unsupported'));
  const audio = useRef(null);

  const wakeAudio = useCallback(() => {
    try {
      if (!audio.current) audio.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.current.state === 'suspended') return audio.current.resume().catch(() => {});
    } catch {
      /* no sound on this browser */
    }
    return Promise.resolve();
  }, []);

  // Browsers allow sound only after a tap on the page: after a reload with alerts on, the first tap does it
  useEffect(() => {
    if (!on) return undefined;
    window.addEventListener('pointerdown', wakeAudio, { once: true });
    return () => window.removeEventListener('pointerdown', wakeAudio);
  }, [on, wakeAudio]);

  const setOn = useCallback(
    async (next) => {
      setOnState(next);
      save(next);
      if (!next) return;
      // Inside the tap, so the sound is allowed; then one chime so the rider hears what an alert sounds like
      wakeAudio().then(() => chime(audio.current));
      if (canNotify() && Notification.permission === 'default') {
        try {
          setPermission(await Notification.requestPermission());
        } catch {
          /* older browsers: chime only */
        }
      }
    },
    [wakeAudio],
  );

  const ring = useCallback(
    ({ title, body, tag }) => {
      if (!on) return;
      chime(audio.current);
      try {
        navigator.vibrate?.([220, 120, 220]);
      } catch {
        /* no vibration */
      }
      if (permission === 'granted' && document.visibilityState !== 'visible') notify(title, body, tag);
    },
    [on, permission],
  );

  const status = !on
    ? 'off'
    : { granted: 'on', denied: 'blocked', unsupported: 'no_notifications' }[permission] || 'ask';
  return { on, setOn, status, ring };
}

// Three rising notes, a little longer than the kitchen's, so a rider can tell it apart in a noisy place
function chime(c) {
  if (!c || c.state !== 'running') return;
  [660, 880, 1320].forEach((freq, i) => {
    const at = c.currentTime + i * 0.16;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.34);
    osc.connect(gain).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.36);
  });
}

// A phone notification. Through the service worker where there is one (Android needs that); tapping it brings
// the rider page forward on its New orders tab (public/sw.js).
async function notify(title, body, tag) {
  const options = { body, tag, renotify: true, icon: '/icons/icon-192.png', data: { url: '/rider?tab=new' } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* the chime still played */
  }
}

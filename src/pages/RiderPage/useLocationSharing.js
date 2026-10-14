import { useCallback, useEffect, useRef, useState } from 'react';

const SEND_MS = 20000; // the rider's position goes to the sheet about every 20 seconds

// Shares the rider's position while `on`: watches it with the phone's location (GPS), sends it every 20 seconds
// through `send(position)`, and keeps the screen awake (a website can't share location with the screen off).
//   status: 'off' | 'starting' | 'sharing' | 'blocked' | 'unsupported' | 'failed'
export function useLocationSharing(send) {
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState('off');
  const [sentAt, setSentAt] = useState(0);
  const latest = useRef(null);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  const push = useCallback(async () => {
    const pos = latest.current;
    if (!pos) return;
    const res = await sendRef.current(pos);
    if (res?.ok) {
      setSentAt(Date.now());
      setStatus('sharing');
    } else setStatus('failed');
  }, []);

  useEffect(() => {
    if (!on) {
      setStatus('off');
      return undefined;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return undefined;
    }
    setStatus('starting');
    let lastSent = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        latest.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
        };
        if (Date.now() - lastSent >= SEND_MS) {
          lastSent = Date.now();
          push();
        }
      },
      (err) => setStatus(err.code === 1 ? 'blocked' : 'failed'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    // Keep the position fresh on the customer's map even when the rider is standing still
    const timer = setInterval(() => {
      lastSent = Date.now();
      push();
    }, SEND_MS);

    // Keep the screen on while sharing (Screen Wake Lock, where the browser has it)
    let lock = null;
    const wake = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible')
          lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not allowed (battery saver) */
      }
    };
    wake();
    document.addEventListener('visibilitychange', wake);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', wake);
      lock?.release?.().catch(() => {});
    };
  }, [on, push]);

  return { on, setOn, status, sentAt };
}

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ICONS } from '@/components/ui/Icon/icons';
import styles from './RiderMap.module.css';

// The rider's last position on an OpenStreetMap map (free; the tiles come from tile.openstreetmap.org). The page
// is scaled with CSS zoom, which Leaflet's dragging doesn't understand, so the map follows the rider and only
// the + / − buttons change the view. Loaded only when a customer's order is out for delivery.
export default function RiderMap({ lat, lng, name }) {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, {
      center: [lat, lng],
      zoom: 16,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    pin.current = L.marker([lat, lng], {
      icon: L.divIcon({
        className: styles.pin,
        html: `<span class="${styles.pulse}"></span><span class="${styles.dot}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#000" d="${ICONS.moped}"/></svg></span>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
      title: name,
      keyboard: false,
    }).addTo(m);
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is made once; the effect below moves the pin
  }, []);

  useEffect(() => {
    pin.current?.setLatLng([lat, lng]);
    map.current?.panTo([lat, lng], { animate: true });
  }, [lat, lng]);

  return <div ref={box} className={styles.map} role="img" aria-label={`Map showing where ${name} is now`} />;
}

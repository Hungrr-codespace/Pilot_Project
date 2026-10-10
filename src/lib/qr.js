// QR codes drawn as one SVG path (crisp at any size, no image files).
import qrcode from 'qrcode-generator';

const QUIET_ZONE = 4; // white border, in modules
const cache = new Map();

// Returns { path, viewBox } for an <svg>, or null when the text cannot be encoded.
export function qrCodePath(text) {
  if (cache.has(text)) return cache.get(text);
  let result = null;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const size = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    const box = size + QUIET_ZONE * 2;
    result = { path, viewBox: `0 0 ${box} ${box}` };
  } catch {
    result = null;
  }
  cache.set(text, result);
  return result;
}

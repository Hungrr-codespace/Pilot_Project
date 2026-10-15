// [['/assets/x-360.webp', 360], ['/assets/x-680.webp', 680]] → "/assets/x-360.webp 360w, /assets/x-680.webp 680w"
export const srcSet = (list) => list.map(([url, width]) => `${url} ${width}w`).join(', ');

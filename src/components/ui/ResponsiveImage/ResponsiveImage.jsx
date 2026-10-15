import { srcSet } from '@/lib/images';

// A picture in several sizes: the browser downloads the smallest WebP that is still sharp on this screen
// (`sizes` says how wide it shows), and browsers without WebP get the original file.
//   image: { src: '/assets/x.png', webp: [['/assets/x-360.webp', 360], …], sizes: '(max-width: 1023.98px) 46vw, 24vw' }
// `priority` asks the browser to fetch it before other pictures (only for the first thing people see).
export function ResponsiveImage({ image, alt, className, priority = false }) {
  return (
    <picture style={{ display: 'contents' }}>
      <source type="image/webp" srcSet={srcSet(image.webp)} sizes={image.sizes} />
      <img src={image.src} alt={alt} className={className} {...(priority && { fetchpriority: 'high' })} />
    </picture>
  );
}

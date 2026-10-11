import { useRef } from 'react';
import { useLayout } from '@/context/layout';
import { useScrollMorph } from '@/hooks/useScrollMorph';
import { useReveal } from '@/hooks/useReveal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { Hero } from '@/sections/Hero/Hero';
import { About } from '@/sections/About/About';
import { Pilot } from '@/sections/Pilot/Pilot';
import { WhyHungrr } from '@/sections/WhyHungrr/WhyHungrr';
import { Faq } from '@/sections/Faq/Faq';
import { Footer } from '@/sections/Footer/Footer';

// The main page: what Hungrr is, the pilot (how ordering works, timings, and the way into the pilot menu),
// why Hungrr, and the FAQ.
export function HomePage() {
  useDocumentTitle('Hungrr – Order smarter, not harder');
  const { isMobile } = useLayout();
  const canvasRef = useRef(null);
  useScrollMorph(canvasRef, isMobile); // mobile: sections morph into each other
  useReveal(canvasRef, isMobile ? 'mobile' : 'desktop'); // both designs: elements animate in and out of view

  // Keyed by layout: crossing the breakpoint (e.g. rotating a tablet) mounts the other design fresh instead of
  // animating the old one into it. Ordering state lives in context, so nothing is lost.
  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'} canvasRef={canvasRef}>
      <Hero />
      <About />
      <Pilot />
      <WhyHungrr />
      <Faq />
      <Footer />
    </PageCanvas>
  );
}

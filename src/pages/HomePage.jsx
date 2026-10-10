import { useRef } from 'react';
import { useLayout } from '@/context/layout';
import { useScrollMorph } from '@/hooks/useScrollMorph';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { Hero } from '@/sections/Hero/Hero';
import { HowItWorks } from '@/sections/HowItWorks/HowItWorks';
import { Restaurants } from '@/sections/Restaurants/Restaurants';
import { WhyHungrr } from '@/sections/WhyHungrr/WhyHungrr';
import { Faq } from '@/sections/Faq/Faq';
import { Footer } from '@/sections/Footer/Footer';
import { useReveal } from '@/hooks/useReveal';
import { RouteDivider } from '@/components/layout/RouteDivider/RouteDivider';

// The landing page, top to bottom.
export function HomePage() {
  const { isMobile } = useLayout();
  const canvasRef = useRef(null);
  useScrollMorph(canvasRef, isMobile);
  useReveal(canvasRef, !isMobile); // desktop: headings and cards fade up into view

  // Keyed by layout: crossing the breakpoint (e.g. rotating a tablet) mounts the other design fresh instead of
  // animating the old one into it. Ordering state lives in context, so nothing is lost.
  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'} canvasRef={canvasRef}>
      <Hero />
      <HowItWorks />
      <RouteDivider />
      <Restaurants />
      <RouteDivider />
      <WhyHungrr />
      <RouteDivider />
      <Faq />
      <Footer />
    </PageCanvas>
  );
}

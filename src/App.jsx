import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ROUTES } from '@/config/site';
import { AccountProvider } from '@/context/AccountProvider';
import { LayoutProvider } from '@/context/LayoutProvider';
import { MenuProvider } from '@/context/MenuProvider';
import { OrderProvider } from '@/context/OrderProvider';
import { ShopStatusProvider } from '@/context/ShopStatusProvider';
import { ScrollManager } from '@/components/layout/ScrollManager/ScrollManager';
import { HomePage } from '@/pages/HomePage';

// The pilot page (menu, cart, payment) and the policy pages load only when someone opens them.
const PilotPage = lazy(() => import('@/pages/PilotPage/PilotPage').then((m) => ({ default: m.PilotPage })));
const TrackPage = lazy(() => import('@/pages/TrackPage/TrackPage').then((m) => ({ default: m.TrackPage })));
const FeedbackPage = lazy(() =>
  import('@/pages/FeedbackPage/FeedbackPage').then((m) => ({ default: m.FeedbackPage })),
);
const AccountPage = lazy(() =>
  import('@/pages/AccountPage/AccountPage').then((m) => ({ default: m.AccountPage })),
);
const LegalPage = lazy(() => import('@/pages/LegalPage/LegalPage').then((m) => ({ default: m.LegalPage })));

// Providers wrap every page, so a cart started on the pilot page survives a visit back to the main page, and the
// sign-in is known everywhere (the account sits outside ordering, which needs it at "Confirm order").
export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <LayoutProvider>
        <MenuProvider>
          <ShopStatusProvider>
            <AccountProvider>
              <OrderProvider>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path={ROUTES.home} element={<HomePage />} />
                    <Route path={ROUTES.pilot} element={<PilotPage />} />
                    <Route path={ROUTES.track} element={<TrackPage />} />
                    <Route path={ROUTES.feedback} element={<FeedbackPage />} />
                    <Route path={ROUTES.account} element={<AccountPage />} />
                    <Route path={ROUTES.privacy} element={<LegalPage docId="privacy" />} />
                    <Route path={ROUTES.terms} element={<LegalPage docId="terms" />} />
                    <Route path={ROUTES.refunds} element={<LegalPage docId="refunds" />} />
                    <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
                  </Routes>
                </Suspense>
              </OrderProvider>
            </AccountProvider>
          </ShopStatusProvider>
        </MenuProvider>
      </LayoutProvider>
    </BrowserRouter>
  );
}

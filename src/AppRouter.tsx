import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { MobileBottomNav } from "./components/MobileBottomNav";

// The landing feed is eagerly loaded — it's what most visitors hit first.
import Index from "./pages/Index";

// Everything else is code-split so it only downloads/parses when visited.
// This keeps the initial JS bundle small, which makes the whole app — including
// the first paint and subsequent navigation — feel noticeably faster.
const NIP19Page = lazy(() => import("./pages/NIP19Page").then(m => ({ default: m.NIP19Page })));
const DirectMessagesPage = lazy(() => import("./pages/DirectMessagesPage").then(m => ({ default: m.DirectMessagesPage })));
const HashtagPage = lazy(() => import("./pages/HashtagPage").then(m => ({ default: m.HashtagPage })));
const MobileComposePage = lazy(() => import("./pages/MobileComposePage").then(m => ({ default: m.MobileComposePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage").then(m => ({ default: m.ExplorePage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const CommunitiesPage = lazy(() => import("./pages/CommunitiesPage").then(m => ({ default: m.CommunitiesPage })));
const CirclesPage = lazy(() => import("./pages/CirclesPage").then(m => ({ default: m.CirclesPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL?.replace(/\/$/, '') || '/'}>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/messages" element={<DirectMessagesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/compose" element={<MobileComposePage />} />
          <Route path="/t/:tag" element={<HashtagPage />} />
          <Route path="/hashtag/:tag" element={<HashtagPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/circles" element={<CirclesPage />} />
          {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
          <Route path="/:nip19" element={<NIP19Page />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {/* Global mobile bottom nav — fixed, rendered on every route */}
      <MobileBottomNav />
    </BrowserRouter>
  );
}
export default AppRouter;

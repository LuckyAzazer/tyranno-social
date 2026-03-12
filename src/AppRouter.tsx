import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import { NIP19Page } from "./pages/NIP19Page";
import { DirectMessagesPage } from "./pages/DirectMessagesPage";
import { HashtagPage } from "./pages/HashtagPage";
import { MobileNotificationsPage } from "./pages/MobileNotificationsPage";
import { MobileComposePage } from "./pages/MobileComposePage";
import SettingsPage from "./pages/SettingsPage";
import { ExplorePage } from "./pages/ExplorePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter basename="/tyranno-social">
      <ScrollToTop />
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
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
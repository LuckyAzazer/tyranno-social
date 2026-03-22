/**
 * MobileComposeFAB
 *
 * A floating action button (FAB) shown only on mobile/tablet that opens
 * the ComposePost form in a bottom sheet modal.
 *
 * Sits above the MobileBottomNav (bottom-20 to clear the nav bar).
 * Hidden on lg+ screens where the sidebar compose card is already visible.
 */

import { useState } from 'react';
import { PenSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ComposePost } from '@/components/ComposePost';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';

interface MobileComposeFABProps {
  onPostPublished?: () => void;
}

export function MobileComposeFAB({ onPostPublished }: MobileComposeFABProps) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();

  const handlePostPublished = () => {
    setOpen(false);
    onPostPublished?.();
  };

  return (
    <>
      {/* Floating button — above the bottom nav, hidden on large screens */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <Button
          onClick={() => setOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 text-primary-foreground p-0 border-2 border-background/30 transition-all duration-200 active:scale-95 hover:scale-105"
          aria-label="Compose new post"
        >
          <PenSquare className="h-6 w-6" />
        </Button>
      </div>

      {/* Compose modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-base">
              <PenSquare className="h-4 w-4 text-primary" />
              New Post
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4">
            {user ? (
              <ComposePost onPostPublished={handlePostPublished} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <PenSquare className="h-10 w-10 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Log in to compose a post</p>
                <LoginArea className="max-w-56" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarContent } from '@/components/Sidebar';
import type { FeedCategory } from '@/components/Sidebar';

interface SidebarDrawerProps {
  selectedCategory: FeedCategory;
  onCategoryChange: (category: FeedCategory) => void;
  onCircleSelect?: (pubkeys: string[] | null, label: string | null) => void;
  selectedCircleDTag?: string | null;
  /**
   * Optional controlled open state. When provided, the internal hamburger
   * button is still rendered but external callers can also open the drawer
   * (e.g. from MobileBottomNav).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A hamburger-triggered drawer that renders SidebarContent inside a left-side Sheet.
 * Works identically on mobile and desktop.
 *
 * Usage (uncontrolled — hamburger in header):
 *   <SidebarDrawer ... />
 *
 * Usage (partially controlled — additionally opened by bottom nav):
 *   const [sidebarOpen, setSidebarOpen] = useState(false);
 *   <SidebarDrawer open={sidebarOpen} onOpenChange={setSidebarOpen} ... />
 *   <MobileBottomNav onMenuOpen={() => setSidebarOpen(true)} />
 */
export function SidebarDrawer({
  selectedCategory,
  onCategoryChange,
  onCircleSelect,
  selectedCircleDTag,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SidebarDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // If caller passes open/onOpenChange use those, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    controlledOnOpenChange?.(v);
  };

  return (
    <>
      {/* Hamburger trigger button — always visible in the header */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="shrink-0"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-80 sm:w-96 p-0 flex flex-col"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/icon-512.png"
                alt="Tyrannosocial"
                className="h-8 w-8 rounded-full"
              />
              <SheetTitle className="text-lg font-bold">Tyrannosocial</SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-4">
            <SidebarContent
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
              onCircleSelect={onCircleSelect}
              selectedCircleDTag={selectedCircleDTag}
              onNavigate={() => setOpen(false)}
            />
            {/* bottom breathing room */}
            <div className="h-8" />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { RelayListManager } from '@/components/RelayListManager';
import { PostCard } from '@/components/PostCard';
import { PostDetailDialog } from '@/components/PostDetailDialog';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  Moon,
  Sun,
  Wifi,
  Bell,
  Bookmark,
  FileText,
  Image,
  Music,
  Video,
  Hash,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

export type FeedCategory = 'following' | 'text' | 'articles' | 'photos' | 'music' | 'videos';

interface SidebarProps {
  selectedCategory: FeedCategory;
  onCategoryChange: (category: FeedCategory) => void;
}

export function Sidebar({ selectedCategory, onCategoryChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { config } = useAppContext();
  const { data: bookmarksData, isLoading: isLoadingBookmarks } = useBookmarks();
  const [relaysOpen, setRelaysOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<NostrEvent | null>(null);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const isDark = theme === 'dark';

  const handleBookmarkClick = (event: NostrEvent) => {
    setSelectedBookmark(event);
    setBookmarkDialogOpen(true);
  };

  const categories: Array<{ id: FeedCategory; label: string; icon: typeof FileText; kinds: number[] }> = [
    { id: 'following', label: 'My Feed', icon: Users, kinds: [1] },
    { id: 'text', label: 'Text Notes', icon: FileText, kinds: [1] },
    { id: 'articles', label: 'Articles', icon: FileText, kinds: [30023] },
    { id: 'photos', label: 'Photos', icon: Image, kinds: [1] },
    { id: 'music', label: 'Music', icon: Music, kinds: [31337] },
    { id: 'videos', label: 'Videos', icon: Video, kinds: [34235] },
  ];

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <aside className="w-80 shrink-0 hidden lg:block">
      <div className="sticky top-4 space-y-4">
        {/* Theme Toggle */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
                <Label htmlFor="theme-toggle" className="cursor-pointer font-medium">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={isDark}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feed Categories */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start ${
                    isActive
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => onCategoryChange(category.id)}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {category.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Relays */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Relays
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                {config.relayMetadata.relays.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground space-y-1">
                {config.relayMetadata.relays.slice(0, 2).map((relay) => (
                  <div key={relay.url} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono truncate">
                      {relay.url.replace('wss://', '')}
                    </span>
                  </div>
                ))}
                {config.relayMetadata.relays.length > 2 && (
                  <div className="text-xs text-muted-foreground pl-4">
                    +{config.relayMetadata.relays.length - 2} more
                  </div>
                )}
              </div>
              <Sheet open={relaysOpen} onOpenChange={setRelaysOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Manage Relays
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-primary" />
                      Manage Relays
                    </SheetTitle>
                    <SheetDescription>
                      Connect to Nostr relays to read and publish events
                    </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                    <RelayListManager />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Bell className="h-4 w-4 mr-2" />
                  View Notifications
                  <Badge variant="destructive" className="ml-auto">
                    0
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notifications
                  </SheetTitle>
                  <SheetDescription>
                    Stay updated with mentions, replies, and reactions
                  </SheetDescription>
                </SheetHeader>
                <Separator className="my-4" />
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center space-y-2">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground">
                        You'll see mentions and replies here
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {/* Bookmarks */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Bookmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sheet open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved Posts
                  <Badge variant="secondary" className="ml-auto">
                    {bookmarksData?.events.length || 0}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-primary" />
                    Bookmarks
                  </SheetTitle>
                  <SheetDescription>
                    Your saved posts (public and private)
                  </SheetDescription>
                </SheetHeader>
                <Separator className="my-4" />
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                  {isLoadingBookmarks ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-4/5" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : bookmarksData && bookmarksData.events.length > 0 ? (
                    <div className="space-y-3">
                      {bookmarksData.events.map((event) => (
                        <PostCard
                          key={event.id}
                          event={event}
                          onClick={() => handleBookmarkClick(event)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-2">
                        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No bookmarks yet</p>
                        <p className="text-xs text-muted-foreground">
                          Save posts to read them later
                        </p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

      </div>

      {/* Bookmark Detail Dialog */}
      <PostDetailDialog
        event={selectedBookmark}
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
      />
    </aside>
  );
}

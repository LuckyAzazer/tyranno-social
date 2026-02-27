import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useBookmarkSets, useBookmarkSetItems } from '@/hooks/useBookmarkSets';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RelayListManager } from '@/components/RelayListManager';
import { PostCard } from '@/components/PostCard';
import { PostDetailDialog } from '@/components/PostDetailDialog';
import { NotificationItem } from '@/components/NotificationItem';
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
  Lock,
  Globe,
  FolderOpen,
  RefreshCw,
  CheckCheck,
  AlertTriangle,
  MessageCircle,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { nip19 } from 'nostr-tools';

export type FeedCategory = 'following' | 'text' | 'articles' | 'photos' | 'music' | 'videos';

interface SidebarProps {
  selectedCategory: FeedCategory;
  onCategoryChange: (category: FeedCategory) => void;
}

function BookmarkSetContent({ setId }: { setId: string }) {
  const { data: items, isLoading } = useBookmarkSetItems(setId);
  const [selectedEvent, setSelectedEvent] = useState<NostrEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEventClick = (event: NostrEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No posts in this list</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 pt-2">
        {items.map((event) => (
          <PostCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
        ))}
      </div>
      <PostDetailDialog event={selectedEvent} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

export function Sidebar({ selectedCategory, onCategoryChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { data: bookmarkSets, isLoading: isLoadingBookmarks, refetch: refetchBookmarks } = useBookmarkSets();
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications();
  const [relaysOpen, setRelaysOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  const totalBookmarks = bookmarkSets?.reduce((sum, set) => sum + set.itemCount, 0) || 0;

  const handleRefreshBookmarks = async () => {
    setIsRefreshing(true);
    await refetchBookmarks();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNotificationClick = (notification: any) => {
    // Get the event ID that the notification references
    const eventTag = notification.tags.find(([name]: string[]) => name === 'e');
    if (eventTag && eventTag[1]) {
      // Close the notifications panel and navigate to the event
      setNotificationsOpen(false);
      const noteId = nip19.noteEncode(eventTag[1]);
      navigate(`/${noteId}`);
    }
  };

  const handleMarkAllAsRead = () => {
    // In a real implementation, this would mark notifications as read in storage
    // For now, we'll just close the panel as a visual indication
    setNotificationsOpen(false);
  };

  const categories: Array<{ id: FeedCategory; label: string; icon: typeof FileText; kinds: number[] }> = [
    { id: 'following', label: 'All Notes', icon: Users, kinds: [1] },
    { id: 'text', label: 'Text Notes', icon: FileText, kinds: [1] },
    { id: 'articles', label: 'Articles', icon: FileText, kinds: [30023] },
    { id: 'photos', label: 'Photos', icon: Image, kinds: [1] },
    { id: 'music', label: 'Music', icon: Music, kinds: [31337] },
    { id: 'videos', label: 'Videos', icon: Video, kinds: [34235] },
  ];

  const selectedCategoryData = categories.find(c => c.id === selectedCategory) || categories[0];
  const SelectedIcon = selectedCategoryData.icon;

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const toggleContentWarnings = () => {
    updateConfig((current) => ({
      ...current,
      showContentWarnings: !config.showContentWarnings,
    }));
  };

  return (
    <aside className="w-80 shrink-0 hidden lg:block">
      <div className="sticky top-4 space-y-4">
        {/* Theme Toggle */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-rose-50/30 dark:from-card dark:to-card">
          <CardContent className="pt-6 space-y-4">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <Label htmlFor="content-warnings-toggle" className="cursor-pointer font-medium">
                  Content Warnings
                </Label>
              </div>
              <Switch
                id="content-warnings-toggle"
                checked={config.showContentWarnings}
                onCheckedChange={toggleContentWarnings}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feed Categories */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-orange-50/20 dark:from-card dark:to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Feed Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCategory} onValueChange={(value) => onCategoryChange(value as FeedCategory)}>
              <SelectTrigger className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-colors">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedCategoryData.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Relays */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-blue-50/20 dark:from-card dark:to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                Relays
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 dark:bg-card dark:from-card dark:to-card dark:text-foreground dark:border-border">
                {config.relayMetadata.relays.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground space-y-1">
                {config.relayMetadata.relays.slice(0, 2).map((relay) => (
                  <div key={relay.url} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm shadow-green-500/50 animate-pulse" />
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

        {/* Direct Messages */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-indigo-50/20 dark:from-card dark:to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Direct Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full group"
              onClick={() => navigate('/messages')}
            >
              <MessageCircle className="h-4 w-4 mr-2 group-hover:text-indigo-500 transition-colors" />
              Open Messages
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full group">
                  <Bell className="h-4 w-4 mr-2 group-hover:text-purple-500 transition-colors" />
                  View Notifications
                  {notifications && notifications.length > 0 && (
                    <Badge variant="destructive" className="ml-auto bg-gradient-to-r from-red-500 to-pink-500 shadow-sm dark:from-red-600 dark:to-pink-600 dark:text-white">
                      {notifications.length > 99 ? '99+' : notifications.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px]">
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <SheetTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notifications
                      </SheetTitle>
                      <SheetDescription>
                        Stay updated with mentions, replies, and reactions
                      </SheetDescription>
                    </div>
                    {user && notifications && notifications.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="gap-2 shrink-0"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark all read</span>
                      </Button>
                    )}
                  </div>
                </SheetHeader>
                <Separator className="my-4" />
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                  {!user ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-2">
                        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Log in to see notifications</p>
                        <p className="text-xs text-muted-foreground">
                          You'll see mentions, replies, and reactions
                        </p>
                      </div>
                    </div>
                  ) : isLoadingNotifications ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : notifications && notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-2">
                        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No notifications yet</p>
                        <p className="text-xs text-muted-foreground">
                          You'll see mentions, replies, and reactions here
                        </p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        {/* Bookmark Lists */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-pink-50/20 dark:from-card dark:to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Bookmark Lists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sheet open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full group">
                  <FolderOpen className="h-4 w-4 mr-2 group-hover:text-pink-500 transition-colors" />
                  View Lists
                  <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border-pink-200 dark:bg-card dark:from-card dark:to-card dark:text-foreground dark:border-border">
                    {totalBookmarks}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px]">
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <SheetTitle className="flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-primary" />
                        Bookmark Lists
                      </SheetTitle>
                      <SheetDescription>
                        Organize your saved posts into custom lists
                      </SheetDescription>
                    </div>
                    {user && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefreshBookmarks}
                        disabled={isRefreshing || isLoadingBookmarks}
                        className="shrink-0"
                        title="Refresh bookmarks from relays"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    )}
                  </div>
                </SheetHeader>
                <Separator className="my-4" />
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                  {!user ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-2">
                        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Log in to see your bookmark lists</p>
                      </div>
                    </div>
                  ) : isLoadingBookmarks ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="p-4 space-y-3">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <div className="flex gap-2">
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : bookmarkSets && bookmarkSets.length > 0 ? (
                    <Accordion type="multiple" className="space-y-3">
                      {bookmarkSets.map((set) => (
                        <AccordionItem
                          key={set.id}
                          value={set.id}
                          className="border rounded-lg overflow-hidden bg-card"
                        >
                          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between w-full pr-2">
                              <div className="flex-1 text-left">
                                <div className="font-medium flex items-center gap-2">
                                  <Bookmark className="h-4 w-4 text-primary" />
                                  {set.title}
                                </div>
                                {set.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {set.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {set.itemCount} {set.itemCount === 1 ? 'item' : 'items'}
                                  </Badge>
                                  {set.publicItems.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      {set.publicItems.length}
                                    </Badge>
                                  )}
                                  {set.privateItems.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <Lock className="h-3 w-3 mr-1" />
                                      {set.privateItems.length}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <Separator className="mb-3" />
                            <BookmarkSetContent setId={set.id} />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center space-y-2">
                        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No bookmark lists yet</p>
                        <p className="text-xs text-muted-foreground">
                          Create lists to organize your saved posts
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
    </aside>
  );
}

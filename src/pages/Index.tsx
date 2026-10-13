import { useState, useEffect, useRef, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { type FeedCategory } from '@/hooks/usePosts';
import { useInfinitePosts } from '@/hooks/useInfinitePosts';
import { useInfiniteMutualFollowsPosts } from '@/hooks/useInfiniteMutualFollowsPosts';
import { useMutualFollows } from '@/hooks/useMutualFollows';
import { useInfiniteConversationsFeed } from '@/hooks/useInfiniteConversationsFeed';
import { useSearchPosts } from '@/hooks/useSearchPosts';
import { useRelayFirehose } from '@/hooks/useRelayFirehose';
import { MasonryGrid } from '@/components/MasonryGrid';
import { PhotoGalleryGrid } from '@/components/PhotoGalleryGrid';
import { VideoGalleryGrid } from '@/components/VideoGalleryGrid';
import { PostModal } from '@/components/PostModal';
import { ComposePost } from '@/components/ComposePost';
import { SearchBar } from '@/components/SearchBar';
import { LoginArea } from '@/components/auth/LoginArea';
import { useSearchUsers } from '@/hooks/useSearchUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { nip19 } from 'nostr-tools';
import { NotificationItem } from '@/components/NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';
import { useEventById } from '@/hooks/useEventById';
import type { NotificationEvent } from '@/hooks/useNotifications';
import { SidebarDrawer } from '@/components/SidebarDrawer';
import { SidebarContent } from '@/components/Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ColumnSelector } from '@/components/ColumnSelector';
import { ColorPickerButton } from '@/components/ColorPickerButton';
import { ScrollToTop } from '@/components/ScrollToTop';
import { InstallPWA } from '@/components/InstallPWA';

import { MobileComposeFAB } from '@/components/MobileComposeFAB';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useUnreadDMCount } from '@/hooks/useUnreadDMCount';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sparkles, FileText, Image, Music, Video, Users, UserCheck, MessagesSquare, Loader2, ChevronDown, Wifi, MessageCircle, ShieldCheck, AlertTriangle, RefreshCw, Zap, Bell, Edit, CircleDot, X as XIcon, List, Check, User } from 'lucide-react';
import { useFollowSets } from '@/hooks/useFollowSets';
import { EditProfileForm } from '@/components/EditProfileForm';
import { WalletBalance } from '@/components/WalletBalance';
import { useAppContext } from '@/hooks/useAppContext';
import { useNavigate } from 'react-router-dom';
import { useMutedUsers } from '@/hooks/useMutedUsers';
import { useIsMobile } from '@/hooks/useIsMobile';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>('following');
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 2);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelay, setSelectedRelay] = useState<string | null>(null);
  const [isMutualFeed, setIsMutualFeed] = useState(false);
  const [isConversationsFeed, setIsConversationsFeed] = useState(false);
  const [nsfwInfoOpen, setNsfwInfoOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedCircleDTag, setSelectedCircleDTag] = useState<string | null>(null);
  const [selectedCirclePubkeys, setSelectedCirclePubkeys] = useState<string[] | null>(null);
  const [selectedCircleLabel, setSelectedCircleLabel] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const lastScrollY = useRef(0);
  const isMobile = useIsMobile();

  // Use lg breakpoint (1024px) for feed picker — matches bottom nav's lg:hidden
  const [useMobileFeedPicker, setUseMobileFeedPicker] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setUseMobileFeedPicker(mql.matches);
    mql.addEventListener('change', onChange);
    setUseMobileFeedPicker(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Hide header on scroll down, show on scroll up (mobile only)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (diff > 4 && currentScrollY > 80) {
        // Scrolling down & past the top area → hide
        setHeaderVisible(false);
      } else if (diff < -4) {
        // Scrolling up → show
        setHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useSeoMeta({
    title: 'Tyrannosocial - A Beautiful Nostr Experience',
    description: 'Discover and share moments in a stunning masonry grid layout. Built on Nostr, the decentralized social protocol.',
  });

  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const navigate = useNavigate();
  const { isMuted } = useMutedUsers();
  const unreadDMCount = useUnreadDMCount();
  const { shouldFilter } = useNSFWFilter();
  const { data: notifications, isLoading: isLoadingNotifications } = useNotifications(50);
  const { followSets } = useFollowSets();
  const { data: pendingEvent } = useEventById(pendingEventId);

  // Once the pending event loads, open the modal and clear the pending ID
  useEffect(() => {
    if (pendingEvent) {
      setSelectedPost(pendingEvent);
      setPendingEventId(null);
    }
  }, [pendingEvent]);

  const handleNotificationClick = useCallback((notification: NotificationEvent) => {
    // Find the 'e' tag — the post being replied to / reacted to / reposted / zapped
    const eTag = notification.tags.find(([name]) => name === 'e');
    if (eTag?.[1]) {
      setPendingEventId(eTag[1]);
    } else {
      // Mentions: the notification itself is a kind-1 post — open it directly
      setSelectedPost(notification);
    }
  }, []);
  
  const { 
    data: infiniteData, 
    isLoading: isLoadingFeed,
    isLoadingFollows,
    followCount,
    fetchNextPage: fetchNextFeedPage, 
    hasNextPage: hasNextFeedPage,
    isFetchingNextPage: isFetchingNextFeedPage,
    refetch: refetchFeed,
    isRefetching: isRefetchingFeed
  } = useInfinitePosts(selectedCategory);

  // Mutual follows feed
  const { data: mutualFollowsData, isLoading: isLoadingMutualFeed, fetchNextPage: fetchNextMutualPage, hasNextPage: hasNextMutualPage, isFetchingNextPage: isFetchingNextMutualPage, refetch: refetchMutual, isRefetching: isRefetchingMutual } = useInfiniteMutualFollowsPosts(selectedCategory);
  const { data: mutualFollowsPubkeys = [] } = useMutualFollows();

  // Conversations feed
  const { data: conversationsData, isLoading: isLoadingConversations, fetchNextPage: fetchNextConversationsPage, hasNextPage: hasNextConversationsPage, isFetchingNextPage: isFetchingNextConversationsPage, refetch: refetchConversations, isRefetching: isRefetchingConversations } = useInfiniteConversationsFeed();
  
  const { 
    data: relayData, 
    isLoading: isLoadingRelay,
    fetchNextPage: fetchNextRelayPage,
    hasNextPage: hasNextRelayPage,
    isFetchingNextPage: isFetchingNextRelayPage,
    refetch: refetchRelay,
    isRefetching: isRefetchingRelay
  } = useRelayFirehose(selectedRelay, selectedCategory);
  
  const { data: searchPosts, isLoading: isLoadingSearch } = useSearchPosts(searchQuery);
  const { data: searchUsers = [], isFetching: isSearchingUsers } = useSearchUsers(searchQuery);

  // Flatten infinite query pages
  const feedPosts = infiniteData?.pages.flat() ?? [];
  const relayPosts = relayData?.pages.flat() ?? [];
  const mutualPosts = mutualFollowsData?.pages.flat() ?? [];
  const conversationPosts = conversationsData?.pages.flat() ?? [];

  // Use search results if searching, relay posts if relay selected, special feeds if active, otherwise use main feed
  const rawPosts = searchQuery.trim() 
    ? searchPosts 
    : selectedRelay 
      ? relayPosts 
      : isMutualFeed
        ? mutualPosts
        : isConversationsFeed
          ? conversationPosts
          : feedPosts;

  // Filter out muted users, then optionally filter by selected circle
  const posts = rawPosts
    ?.filter(p => !isMuted(p.pubkey))
    .filter(p => !selectedCirclePubkeys || selectedCirclePubkeys.includes(p.pubkey))
    ?? rawPosts;
  
  const isLoading = searchQuery.trim() 
    ? isLoadingSearch 
    : selectedRelay 
      ? isLoadingRelay 
      : isMutualFeed
        ? isLoadingMutualFeed
        : isConversationsFeed
          ? isLoadingConversations
          : isLoadingFeed;

  const fetchNextPage = selectedRelay ? fetchNextRelayPage : isMutualFeed ? fetchNextMutualPage : isConversationsFeed ? fetchNextConversationsPage : fetchNextFeedPage;
  const hasNextPage = selectedRelay ? hasNextRelayPage : isMutualFeed ? hasNextMutualPage : isConversationsFeed ? hasNextConversationsPage : hasNextFeedPage;
  const isFetchingNextPage = selectedRelay ? isFetchingNextRelayPage : isMutualFeed ? isFetchingNextMutualPage : isConversationsFeed ? isFetchingNextConversationsPage : isFetchingNextFeedPage;
  const refetch = selectedRelay ? refetchRelay : isMutualFeed ? refetchMutual : isConversationsFeed ? refetchConversations : refetchFeed;
  const isRefetching = selectedRelay ? isRefetchingRelay : isMutualFeed ? isRefetchingMutual : isConversationsFeed ? isRefetchingConversations : isRefetchingFeed;

  const handleRefresh = () => {
    refetch();
  };

  // Pull-to-refresh for mobile — only on the main feed, not search
  const { isPulling, pullDistance, isRefreshing: isPTRRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !searchQuery.trim() && isMobile,
  });

  // Intersection observer for infinite scroll — aggressively preloads pages
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Auto-queue multiple pages: once the observer fires, keep fetching until
  // we're 3 pages ahead of where the user currently is.
  const prefetchAhead = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !searchQuery.trim()) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchQuery]);

  // Fire again shortly after each page lands to stay 3 pages ahead
  useEffect(() => {
    if (!isFetchingNextPage && hasNextPage && !searchQuery.trim()) {
      const timer = window.setTimeout(prefetchAhead, 200);
      return () => clearTimeout(timer);
    }
  }, [isFetchingNextPage, hasNextPage, prefetchAhead, searchQuery]);

  useEffect(() => {
    if (!loadMoreRef.current || searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          prefetchAhead();
        }
      },
      {
        threshold: 0,
        rootMargin: '2000px', // Start fetching 2000px before the bottom
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [prefetchAhead, searchQuery]);

  const categoryIcons: Record<FeedCategory, typeof FileText> = {
    following: Users,
    text: FileText,
    articles: FileText,
    photos: Image,
    music: Music,
    videos: Video,
  };

  const categoryLabels: Record<FeedCategory, string> = {
    following: 'My Feed',
    text: 'Text Notes',
    articles: 'Articles',
    photos: 'Photos',
    music: 'Music',
    videos: 'Videos',
  };

  const CategoryIcon = categoryIcons[selectedCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">

      {/* Hero Header - Sticky */}
      <header className={`sticky top-0 z-40 isolate relative border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm transition-transform duration-300 md:translate-y-0 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10 pointer-events-none" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Hamburger menu — opens sidebar drawer on all screen sizes */}
            <SidebarDrawer
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setSelectedCircleDTag(null);
                setSelectedCirclePubkeys(null);
                setSelectedCircleLabel(null);
                setIsMutualFeed(false);
                setIsConversationsFeed(false);
                setSelectedRelay(null);
              }}
              onCircleSelect={(pubkeys, label) => {
                if (pubkeys === null) {
                  setSelectedCircleDTag(null);
                  setSelectedCirclePubkeys(null);
                  setSelectedCircleLabel(null);
                } else {
                  setSelectedCircleDTag(label?.toLowerCase().replace(/\s+/g, '-') ?? null);
                  setSelectedCirclePubkeys(pubkeys);
                  setSelectedCircleLabel(label);
                }
              }}
              selectedCircleDTag={selectedCircleDTag}
            />

            {/* Logo and Title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 blur-xl opacity-60 animate-pulse dark:from-yellow-600 dark:via-red-900 dark:to-yellow-700 dark:opacity-50" />
                <div className="relative p-1 bg-gradient-to-br from-rose-100/50 to-pink-100/30 rounded-full dark:from-transparent dark:to-transparent">
                  <img 
                    src={`${import.meta.env.BASE_URL}icon-512.png`} 
                    alt="Tyrannosocial Logo" 
                    className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-2xl filter brightness-110 rounded-full transition-transform group-hover:scale-105"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                  Tyrannosocial
                </h1>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Powered by Nostr
                  </span>
                  <span className="opacity-30">·</span>
                  <a
                    href="https://shakespeare.diy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-rose-500 dark:text-primary" />
                    Vibed with Shakespeare
                  </a>
                </div>
              </div>
            </div>

            {/* Search Bar - Desktop (hidden on mobile, shown below) */}
            <div className="hidden md:block flex-1 max-w-sm lg:max-w-lg">
              <SearchBar onSearch={setSearchQuery} />
            </div>

            {/* Login/Avatar — always visible */}
            <div className="shrink-0 flex items-center gap-2">
              {user && <WalletBalance />}
              <LoginArea className="max-w-60" />
            </div>
          </div>

          {/* Search Bar - Mobile (below header on small screens) */}
          <div className="md:hidden mt-3">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* Toolbar row — feed selector, refresh, colors, columns */}
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              {/* Circle badge */}
              {selectedCircleLabel && (
                <Badge className="gap-1.5 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50 pr-1 shrink-0">
                  <CircleDot className="h-3 w-3" />
                  {selectedCircleLabel}
                  <button
                    onClick={() => { setSelectedCircleDTag(null); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); }}
                    className="ml-0.5 hover:bg-violet-200 dark:hover:bg-violet-800/50 rounded p-0.5 transition-colors"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {/* Feed / search label */}
              {searchQuery ? (
                <Badge variant="secondary" className="text-sm py-1 px-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 dark:from-secondary dark:to-secondary dark:text-secondary-foreground dark:border-border shrink-0">
                  Search Results
                </Badge>
              ) : useMobileFeedPicker ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFeedSheetOpen(true)}
                      className="gap-2 bg-background/90 backdrop-blur-sm text-foreground border border-border shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-background/95 dark:text-foreground dark:border-border shrink-0"
                    >
                      {selectedRelay ? (
                        <>
                          <Wifi className="h-4 w-4" />
                          {selectedRelay.replace('wss://', '').split('/')[0]}
                        </>
                      ) : isMutualFeed ? (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Mutual Follows
                        </>
                      ) : isConversationsFeed ? (
                        <>
                          <MessagesSquare className="h-4 w-4" />
                          Conversations
                        </>
                      ) : selectedCircleLabel ? (
                        <>
                          <CircleDot className="h-4 w-4 text-violet-500" />
                          {selectedCircleLabel}
                        </>
                      ) : (
                        <>
                          <CategoryIcon className="h-4 w-4" />
                          {categoryLabels[selectedCategory]}
                        </>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>

                    {/* ── Mobile full-screen feed picker sheet ── */}
                    <Sheet open={feedSheetOpen} onOpenChange={setFeedSheetOpen}>
                      <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl p-0 flex flex-col">
                        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
                          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
                          <SheetTitle className="text-center text-base font-semibold">Choose Feed</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">

                          {/* My Feed */}
                          <button
                            onClick={() => { setSelectedRelay(null); setIsMutualFeed(false); setIsConversationsFeed(false); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); setFeedSheetOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98] ${!selectedRelay && !isMutualFeed && !isConversationsFeed && !selectedCircleLabel ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'}`}
                          >
                            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                              <Users className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">My Feed</p>
                              <p className="text-xs text-muted-foreground">Posts from people you follow</p>
                            </div>
                            {!selectedRelay && !isMutualFeed && !isConversationsFeed && !selectedCircleLabel && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>

                          {user && (
                            <button
                              onClick={() => { setSelectedRelay(null); setIsMutualFeed(true); setIsConversationsFeed(false); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); setFeedSheetOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98] ${isMutualFeed ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'}`}
                            >
                              <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                                <UserCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Mutual Follows</p>
                                {mutualFollowsPubkeys.length > 0
                                  ? <p className="text-xs text-muted-foreground">{mutualFollowsPubkeys.length} mutual{mutualFollowsPubkeys.length !== 1 ? 's' : ''}</p>
                                  : <p className="text-xs text-muted-foreground">People who follow you back</p>
                                }
                              </div>
                              {isMutualFeed && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                          )}

                          {user && (
                            <button
                              onClick={() => { setSelectedRelay(null); setIsMutualFeed(false); setIsConversationsFeed(true); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); setFeedSheetOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98] ${isConversationsFeed ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'}`}
                            >
                              <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                                <MessagesSquare className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Conversations</p>
                                <p className="text-xs text-muted-foreground">Replies your follows are writing</p>
                              </div>
                              {isConversationsFeed && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                          )}

                          {/* Relay Firehose */}
                          <div className="px-1 pt-3 pb-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3">Relay Firehose</p>
                          </div>
                          {config.relayMetadata.relays.filter((relay) => {
                            try { const h = new URL(relay.url).hostname; return h !== 'localhost' && h !== '127.0.0.1' && h !== '::1'; } catch { return false; }
                          }).map((relay) => (
                            <button
                              key={relay.url}
                              onClick={() => { setSelectedRelay(relay.url); setIsMutualFeed(false); setIsConversationsFeed(false); setFeedSheetOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98] ${selectedRelay === relay.url ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'}`}
                            >
                              <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                                <Wifi className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <span className="font-medium text-sm truncate flex-1">{relay.url.replace('wss://', '')}</span>
                              {selectedRelay === relay.url && <Check className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                          ))}

                          {/* Circles */}
                          {user && followSets.length > 0 && (
                            <>
                              <div className="px-1 pt-3 pb-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 flex items-center gap-1.5">
                                  <List className="h-3 w-3" /> Circles
                                </p>
                              </div>
                              {followSets.map((circle) => (
                                <button
                                  key={circle.dTag}
                                  onClick={() => { setSelectedRelay(null); setIsMutualFeed(false); setIsConversationsFeed(false); setSelectedCirclePubkeys(circle.pubkeys); setSelectedCircleLabel(circle.title); setSelectedCircleDTag(circle.dTag); setFeedSheetOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors active:scale-[0.98] ${selectedCircleDTag === circle.dTag ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70'}`}
                                >
                                  <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                                    <CircleDot className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{circle.title}</p>
                                    <p className="text-xs text-muted-foreground">{circle.pubkeys.length} {circle.pubkeys.length === 1 ? 'member' : 'members'}</p>
                                  </div>
                                  {selectedCircleDTag === circle.dTag && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                              ))}
                            </>
                          )}

                          {/* bottom safe-area padding */}
                          <div className="h-6" />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </>
                ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="gap-2 bg-background/90 backdrop-blur-sm text-foreground border border-border shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-background/95 dark:text-foreground dark:border-border shrink-0">
                      {selectedRelay ? (
                        <>
                          <Wifi className="h-4 w-4" />
                          {selectedRelay.replace('wss://', '').split('/')[0]}
                        </>
                      ) : isMutualFeed ? (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Mutual Follows
                        </>
                      ) : isConversationsFeed ? (
                        <>
                          <MessagesSquare className="h-4 w-4" />
                          Conversations
                        </>
                      ) : selectedCircleLabel ? (
                        <>
                          <CircleDot className="h-4 w-4 text-violet-500" />
                          {selectedCircleLabel}
                        </>
                      ) : (
                        <>
                          <CategoryIcon className="h-4 w-4" />
                          {categoryLabels[selectedCategory]}
                        </>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 max-h-[70vh] overflow-y-auto">
                    {/* ── My Feed ── */}
                    <DropdownMenuItem
                      onClick={() => { setSelectedRelay(null); setIsMutualFeed(false); setIsConversationsFeed(false); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); }}
                      className={`cursor-pointer ${!selectedRelay && !isMutualFeed && !isConversationsFeed && !selectedCircleLabel ? 'bg-accent' : ''}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      My Feed (Following)
                    </DropdownMenuItem>
                    {user && (
                      <DropdownMenuItem
                        onClick={() => { setSelectedRelay(null); setIsMutualFeed(true); setIsConversationsFeed(false); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); }}
                        className={`cursor-pointer ${isMutualFeed ? 'bg-accent' : ''}`}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span>Mutual Follows</span>
                          {mutualFollowsPubkeys.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{mutualFollowsPubkeys.length} mutual{mutualFollowsPubkeys.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    )}
                    {user && (
                      <DropdownMenuItem
                        onClick={() => { setSelectedRelay(null); setIsMutualFeed(false); setIsConversationsFeed(true); setSelectedCirclePubkeys(null); setSelectedCircleLabel(null); setSelectedCircleDTag(null); }}
                        className={`cursor-pointer ${isConversationsFeed ? 'bg-accent' : ''}`}
                      >
                        <MessagesSquare className="h-4 w-4 mr-2" />
                        <div className="flex flex-col">
                          <span>Conversations</span>
                          <span className="text-[10px] text-muted-foreground">Replies your follows are writing</span>
                        </div>
                      </DropdownMenuItem>
                    )}

                    {/* ── Relay Firehose ── */}
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Relay Firehose
                    </div>
                    {config.relayMetadata.relays.filter((relay) => {
                        try { const h = new URL(relay.url).hostname; return h !== 'localhost' && h !== '127.0.0.1' && h !== '::1'; } catch { return false; }
                      }).map((relay) => (
                      <DropdownMenuItem
                        key={relay.url}
                        onClick={() => { setSelectedRelay(relay.url); setIsMutualFeed(false); setIsConversationsFeed(false); }}
                        className={`cursor-pointer ${selectedRelay === relay.url ? 'bg-accent' : ''}`}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        <span className="truncate">{relay.url.replace('wss://', '')}</span>
                      </DropdownMenuItem>
                    ))}

                    {/* ── Circles ── */}
                    {user && followSets.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <List className="h-3 w-3" />
                          Circles
                        </div>
                        {followSets.map((circle) => (
                          <DropdownMenuItem
                            key={circle.dTag}
                            onClick={() => {
                              setSelectedRelay(null);
                              setIsMutualFeed(false);
                              setIsConversationsFeed(false);
                              setSelectedCirclePubkeys(circle.pubkeys);
                              setSelectedCircleLabel(circle.title);
                              setSelectedCircleDTag(circle.dTag);
                            }}
                            className={`cursor-pointer ${selectedCircleDTag === circle.dTag ? 'bg-accent' : ''}`}
                          >
                            <CircleDot className="h-4 w-4 mr-2 text-violet-500" />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{circle.title}</span>
                              <span className="text-[10px] text-muted-foreground">{circle.pubkeys.length} {circle.pubkeys.length === 1 ? 'member' : 'members'}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Refresh + post/result count */}
              {!searchQuery ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefetching}
                    className="gap-2 shrink-0"
                    title="Refresh feed"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  {posts && (
                    <span className="text-sm text-muted-foreground shrink-0">
                      {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                    </span>
                  )}
                </>
              ) : (
                posts && (
                  <span className="text-sm text-muted-foreground truncate">
                    {posts.length} {posts.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                  </span>
                )
              )}
            </div>

            {/* Right side: Colors + Columns */}
            <div className="flex items-center gap-2 shrink-0">
              <ColorPickerButton />
              <ColumnSelector columns={columns} onColumnsChange={setColumns} />
            </div>
          </div>
        </div>
      </header>

      {/* Pull-to-refresh indicator (mobile only) */}
      {(isPulling || isPTRRefreshing) && (
        <div
          className="lg:hidden flex items-center justify-center gap-2 text-sm text-muted-foreground overflow-hidden transition-all duration-150"
          style={{ height: isPTRRefreshing ? 44 : Math.min(pullDistance, 44) }}
        >
          <RefreshCw className={`h-4 w-4 ${isPTRRefreshing ? 'animate-spin text-primary' : ''}`} style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }} />
          <span className="text-xs">{isPTRRefreshing ? 'Refreshing…' : pullDistance > 55 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 py-6 lg:pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}>
        <div className="flex gap-6">
          {/* Permanent Left Sidebar — visible on lg+ screens */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <ScrollArea className="h-[calc(100vh-7rem)] pr-1">
                <SidebarContent
                  selectedCategory={selectedCategory}
                  onCategoryChange={(cat) => {
                    setSelectedCategory(cat);
                    setSelectedCircleDTag(null);
                    setSelectedCirclePubkeys(null);
                    setSelectedCircleLabel(null);
                    setIsMutualFeed(false);
                    setIsConversationsFeed(false);
                    setSelectedRelay(null);
                  }}
                  onCircleSelect={(pubkeys, label) => {
                    if (pubkeys === null) {
                      setSelectedCircleDTag(null);
                      setSelectedCirclePubkeys(null);
                      setSelectedCircleLabel(null);
                    } else {
                      setSelectedCircleDTag(label?.toLowerCase().replace(/\s+/g, '-') ?? null);
                      setSelectedCirclePubkeys(pubkeys);
                      setSelectedCircleLabel(label);
                    }
                  }}
                  selectedCircleDTag={selectedCircleDTag}
                />
                <div className="h-8" />
              </ScrollArea>
            </div>
          </aside>

          {/* Feed Section */}
          <div className="flex-1 min-w-0 space-y-6">

          {/* Posts */}
          <div className="space-y-4">
            {!user && !searchQuery && (
              <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-red-50/30 dark:from-primary/5 dark:via-transparent dark:to-transparent relative isolate overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 -z-10 pointer-events-none" />
                <CardContent className="py-12 px-8 text-center relative">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/15 mb-2 shadow-lg">
                      <Sparkles className="h-8 w-8 text-primary drop-shadow-sm" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                      Welcome to Tyrannosocial
                    </h2>
                    <p className="text-muted-foreground">
                      A beautiful way to experience Nostr. Log in to start sharing your moments with the world.
                    </p>
                    {shouldFilter && (
                      <button
                        onClick={() => setNsfwInfoOpen(true)}
                        className="mt-4 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer w-full"
                      >
                        <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center justify-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Safe browsing mode active - NSFW content is automatically filtered
                        </p>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feed loading progress — shown while fetching follows then posts */}
            {user && (isLoadingFollows || isLoadingFeed) && !searchQuery && (
              <FeedLoadingProgress isLoadingFollows={isLoadingFollows} followCount={followCount} />
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
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
                        <Skeleton className="h-4 w-3/5" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : posts && posts.length > 0 ? (
              <>
                {/* ── User results (shown when searching) ── */}
                {searchQuery && (searchUsers.length > 0 || isSearchingUsers) && (
                  <div className="mb-6 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">People</span>
                      {isSearchingUsers && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {searchUsers.slice(0, 6).map((u) => (
                        <button
                          key={u.pubkey}
                          onClick={() => navigate(`/${u.npub}`)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group"
                        >
                          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            <AvatarImage src={u.metadata.picture} alt={u.metadata.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(u.metadata.display_name || u.metadata.name || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">
                                {u.metadata.display_name || u.metadata.name || 'Unknown'}
                              </p>
                              {u.metadata.nip05 && (
                                <span className="shrink-0 text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.5 rounded-full">✓</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.metadata.nip05 || `${u.npub.slice(0, 10)}...${u.npub.slice(-5)}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 border-b border-border/40" />
                    <p className="text-xs text-muted-foreground mt-3 mb-1 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Posts
                    </p>
                  </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {selectedCategory === 'photos' && !isConversationsFeed ? (
                    <PhotoGalleryGrid posts={posts} onPostClick={setSelectedPost} />
                  ) : selectedCategory === 'videos' && !isConversationsFeed ? (
                    <VideoGalleryGrid posts={posts} onPostClick={setSelectedPost} />
                  ) : (
                    <MasonryGrid posts={posts} columns={columns} onPostClick={setSelectedPost} />
                  )}
                </div>

                {/* Infinite scroll trigger and loading indicator */}
                {!searchQuery && (
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading more posts...</span>
                      </div>
                    ) : hasNextPage ? (
                      <Button 
                        variant="outline" 
                        onClick={() => fetchNextPage()}
                        className="gap-2"
                      >
                        Load More
                      </Button>
                    ) : posts.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        You've reached the end
                      </p>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* User results even when no posts match */}
                {searchQuery && searchUsers.length > 0 && (
                  <div className="mb-6 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">People</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {searchUsers.slice(0, 6).map((u) => (
                        <button
                          key={u.pubkey}
                          onClick={() => navigate(`/${u.npub}`)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group"
                        >
                          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            <AvatarImage src={u.metadata.picture} alt={u.metadata.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(u.metadata.display_name || u.metadata.name || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">
                                {u.metadata.display_name || u.metadata.name || 'Unknown'}
                              </p>
                              {u.metadata.nip05 && (
                                <span className="shrink-0 text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.5 rounded-full">✓</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.metadata.nip05 || `${u.npub.slice(0, 10)}...${u.npub.slice(-5)}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              <Card className="border-dashed">
                <CardContent className="py-12 px-8 text-center">
                  <div className="max-w-sm mx-auto space-y-4">
                    {isMutualFeed ? (
                      <>
                        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
                          <UserCheck className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground">No mutual follows found</p>
                        <p className="text-sm text-muted-foreground">
                          This feed shows posts from people who follow you back. Follow more people and wait for them to follow you back!
                        </p>
                      </>
                    ) : isConversationsFeed ? (
                      <>
                        <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
                          <MessagesSquare className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground">No conversations yet</p>
                        <p className="text-sm text-muted-foreground">
                          This feed shows replies your follows are writing. Check back soon or follow more people to see more conversations!
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        No posts found. Check your relay connections or wait a moment for content to load.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              </>
            )}
          </div>
          </div>

          {/* Right Sidebar — visible on xl+ screens when left sidebar is also showing */}
          <aside className="w-96 shrink-0 hidden xl:block">
            <div className="sticky top-4 space-y-4">
              {user ? (
                <ComposePost onPostPublished={handleRefresh} />
              ) : (
                <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-primary/5">
                  <CardContent className="pt-6 pb-5 space-y-3 text-center">
                    <div className="inline-flex p-3 rounded-full bg-primary/10 mb-1">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-semibold">Join Tyrannosocial</p>
                    <p className="text-sm text-muted-foreground">Log in to post, reply, react, and more.</p>
                    <LoginArea className="w-full" />
                  </CardContent>
                </Card>
              )}

              {/* Messages */}
              <button
                onClick={() => navigate('/messages')}
                className="w-full group relative overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary/40 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                      <div className="relative p-2.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
                        <MessageCircle className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Messages</p>
                      <p className="text-xs text-muted-foreground">Private conversations</p>
                    </div>
                  </div>
                  {unreadDMCount > 0 ? (
                    <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs font-bold min-w-6 h-6 flex items-center justify-center rounded-full border-2 border-background animate-pulse">
                      {unreadDMCount > 99 ? '99+' : unreadDMCount}
                    </Badge>
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary -rotate-90 group-hover:translate-x-1 transition-all duration-300" />
                  )}
                </div>
              </button>

              {/* Notifications panel */}
              {user && (
                <Card className="border-border/50 dark:border-transparent overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                    <Bell className="h-4 w-4 text-primary" />
                    <button
                      onClick={() => navigate('/notifications')}
                      className="font-semibold text-sm hover:text-primary transition-colors"
                    >
                      Notifications
                    </button>
                    {notifications && notifications.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {notifications.length}
                      </Badge>
                    )}
                  </div>

                  <div className="h-96 overflow-y-auto">
                    {isLoadingNotifications || notifications === undefined ? (
                      <div className="p-3 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <div className="space-y-1.5 flex-1">
                              <Skeleton className="h-3 w-28" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className="p-2 space-y-1.5">
                        {notifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Bell className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Post Modal */}
      {selectedPost && (
        <PostModal event={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* PWA Install Prompt */}
      <InstallPWA />



      {/* Mobile Floating Compose Button */}
      <MobileComposeFAB onPostPublished={handleRefresh} />

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your Nostr profile information
            </DialogDescription>
          </DialogHeader>
          <EditProfileForm onSuccess={() => setEditProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* NSFW Filter Info Dialog */}
      <Dialog open={nsfwInfoOpen} onOpenChange={setNsfwInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
              NSFW Content Filtering
            </DialogTitle>
            <DialogDescription className="text-base">
              How we keep your browsing experience safe
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Overview */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Safe Browsing Protection
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tyrannosocial automatically filters NSFW (Not Safe For Work) content to provide a safe browsing experience. 
                For users who aren't logged in, this filtering is always active and cannot be disabled.
              </p>
            </div>

            {/* What We Filter */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                What Gets Filtered
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Our intelligent filtering system detects and removes:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Content warnings:</strong> Posts marked with NSFW or content-warning tags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Explicit hashtags:</strong> Posts tagged with adult or explicit content markers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Image-only spam:</strong> Posts containing only image URLs with no meaningful text</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Generic promotional posts:</strong> Short phrases with images (e.g., "Bitcoin Summer is year round")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Spam patterns:</strong> Posts with promotional keywords like "premium content", "DM me", "subscribe"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Known spam domains:</strong> Links to adult content platforms and services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong>Suspicious accounts:</strong> Posts from known spam or NSFW-only accounts</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* For Logged-In Users */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                For Logged-In Users
              </h3>
              <p className="text-sm text-muted-foreground">
                Once you log in, you can control the NSFW filter from the sidebar settings. 
                The filter is enabled by default, but you can toggle it off if you prefer to see unfiltered content.
              </p>
            </div>

            {/* Not Perfect */}
            <div className="rounded-lg border border-orange-200/50 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/30 p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-orange-900 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Content Filter Limitations
              </h3>
              <p className="text-sm text-orange-900/70 dark:text-orange-400/70">
                While our filter is designed to catch most inappropriate content, no automated system is perfect. 
                Some NSFW content may occasionally slip through, and some legitimate posts may be filtered. 
                We're continuously improving our detection algorithms to provide the best experience.
              </p>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t">
              <Button 
                onClick={() => setNsfwInfoOpen(false)}
                className="w-full"
              >
                Got it, thanks!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Feed loading progress indicator ────────────────────────────────────────
function FeedLoadingProgress({ isLoadingFollows, followCount }: { isLoadingFollows: boolean; followCount: number }) {
  // Step 1 (25%): fetching contact list from relays
  // Step 2 (70%): contact list known, fetching posts
  const progress = isLoadingFollows ? 25 : 70;

  const label = isLoadingFollows
    ? 'Finding who you follow…'
    : followCount > 0
      ? `Loading posts from ${followCount} account${followCount !== 1 ? 's' : ''}…`
      : 'Loading your feed…';

  const sublabel = isLoadingFollows
    ? 'Searching relays for your contact list'
    : 'Almost there — fetching your personalised feed';

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce select-none">🦖</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default Index;

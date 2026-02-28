import { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { type FeedCategory } from '@/hooks/usePosts';
import { useInfinitePosts } from '@/hooks/useInfinitePosts';
import { useSearchPosts } from '@/hooks/useSearchPosts';
import { useRelayFirehose } from '@/hooks/useRelayFirehose';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ComposePost } from '@/components/ComposePost';
import { PostDetailDialog } from '@/components/PostDetailDialog';
import { SearchBar } from '@/components/SearchBar';
import { LoginArea } from '@/components/auth/LoginArea';
import { Sidebar } from '@/components/Sidebar';
import { ColumnSelector } from '@/components/ColumnSelector';
import { ScrollToTop } from '@/components/ScrollToTop';
import { InstallPWA } from '@/components/InstallPWA';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useUnreadDMCount } from '@/hooks/useUnreadDMCount';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, FileText, Image, Music, Video, Users, Loader2, ChevronDown, Wifi, MessageCircle, ShieldCheck, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { useNavigate } from 'react-router-dom';
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
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelay, setSelectedRelay] = useState<string | null>(null);
  const [nsfwInfoOpen, setNsfwInfoOpen] = useState(false);

  useSeoMeta({
    title: 'Tyrannosocial - A Beautiful Nostr Experience',
    description: 'Discover and share moments in a stunning masonry grid layout. Built on Nostr, the decentralized social protocol.',
  });

  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const navigate = useNavigate();
  const unreadDMCount = useUnreadDMCount();
  const { shouldFilter } = useNSFWFilter();
  
  const { 
    data: infiniteData, 
    isLoading: isLoadingFeed, 
    fetchNextPage: fetchNextFeedPage, 
    hasNextPage: hasNextFeedPage,
    isFetchingNextPage: isFetchingNextFeedPage,
    refetch: refetchFeed,
    isRefetching: isRefetchingFeed
  } = useInfinitePosts(selectedCategory);
  
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

  // Flatten infinite query pages
  const feedPosts = infiniteData?.pages.flat() ?? [];
  const relayPosts = relayData?.pages.flat() ?? [];

  // Use search results if searching, relay posts if relay selected, otherwise use feed
  const posts = searchQuery.trim() 
    ? searchPosts 
    : selectedRelay 
      ? relayPosts 
      : feedPosts;
  
  const isLoading = searchQuery.trim() 
    ? isLoadingSearch 
    : selectedRelay 
      ? isLoadingRelay 
      : isLoadingFeed;

  const fetchNextPage = selectedRelay ? fetchNextRelayPage : fetchNextFeedPage;
  const hasNextPage = selectedRelay ? hasNextRelayPage : hasNextFeedPage;
  const isFetchingNextPage = selectedRelay ? isFetchingNextRelayPage : isFetchingNextFeedPage;
  const refetch = selectedRelay ? refetchRelay : refetchFeed;
  const isRefetching = selectedRelay ? isRefetchingRelay : isRefetchingFeed;

  const handleRefresh = () => {
    refetch();
  };

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || searchQuery.trim()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '400px' // Load more posts 400px before reaching the trigger
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchQuery]);

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

  const handlePostClick = (event: NostrEvent) => {
    setSelectedPost(event);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Small Zap Link - Top Banner */}
      <div className="bg-gradient-to-r from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20 border-b border-amber-200/30 dark:border-amber-900/20">
        <div className="px-4 py-1.5">
          <div className="flex justify-center">
            <a
              href="lightning:deadwolf170@minibits.cash"
              className="text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-400/70 hover:text-amber-900 dark:hover:text-amber-300 transition-colors flex items-center gap-1.5 group"
            >
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-amber-500/50 dark:fill-amber-400/30 group-hover:fill-amber-600 dark:group-hover:fill-amber-300 transition-colors" />
              <span className="font-medium">Appreciate the Zaps!</span>
            </a>
          </div>
        </div>
      </div>
      {/* Hero Header - Sticky */}
      <header className="sticky top-0 z-40 relative border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 flex-1 sm:flex-initial">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 blur-xl opacity-60 animate-pulse dark:from-yellow-600 dark:via-red-900 dark:to-yellow-700 dark:opacity-50" />
                <div className="relative p-1 bg-gradient-to-br from-rose-100/50 to-pink-100/30 rounded-full dark:from-transparent dark:to-transparent">
                  <img 
                    src={`${import.meta.env.BASE_URL}icon-512.png`} 
                    alt="Tyrannosocial Logo" 
                    className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-2xl filter brightness-110 rounded-full"
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Tyrannosocial
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Powered by Nostr
                </p>
              </div>
            </div>

            {/* Right Side - Search, DM Button, Login and Mobile Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Bar - Desktop */}
              <div className="hidden md:block w-64 lg:w-80">
                <SearchBar onSearch={setSearchQuery} />
              </div>
              
              {/* DM Button with Unread Badge - Only show when logged in */}
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/messages')}
                  className="relative h-10 w-10"
                  aria-label={`Messages${unreadDMCount > 0 ? ` (${unreadDMCount} unread)` : ''}`}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadDMCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 bg-red-500 hover:bg-red-500 text-white text-xs border-2 border-background">
                      {unreadDMCount > 9 ? '9+' : unreadDMCount}
                    </Badge>
                  )}
                </Button>
              )}
              
              <LoginArea className="max-w-60 hidden sm:flex" />
            </div>
          </div>

          {/* Search Bar - Mobile (below header on small screens) */}
          <div className="md:hidden mt-4">
            <SearchBar onSearch={setSearchQuery} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 pb-24 lg:pb-8">
        <div className="flex gap-6">
          {/* Feed Section */}
          <div className="flex-1 min-w-0 space-y-6">
          {/* Compose Section */}
          {user && !searchQuery && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <ComposePost onPostPublished={handleRefresh} />
            </div>
          )}

          {/* Feed Selector and Column Selector */}
          {!searchQuery && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="gap-2 bg-gradient-to-r from-primary/10 to-orange-100/50 text-primary border-primary/20 dark:from-primary/20 dark:to-primary/10">
                      {selectedRelay ? (
                        <>
                          <Wifi className="h-4 w-4" />
                          {selectedRelay.replace('wss://', '').split('/')[0]}
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
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedRelay(null);
                      }}
                      className={`cursor-pointer ${!selectedRelay ? 'bg-accent' : ''}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      My Feed (Following)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Relay Firehose
                    </div>
                    {config.relayMetadata.relays.map((relay) => (
                      <DropdownMenuItem
                        key={relay.url}
                        onClick={() => {
                          setSelectedRelay(relay.url);
                        }}
                        className={`cursor-pointer ${selectedRelay === relay.url ? 'bg-accent' : ''}`}
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        <span className="truncate">{relay.url.replace('wss://', '')}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  className="gap-2"
                  title="Refresh feed"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {posts && (
                  <span className="text-sm text-muted-foreground">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ColumnSelector columns={columns} onColumnsChange={setColumns} />
              </div>
            </div>
          )}

          {/* Search Results Header */}
          {searchQuery && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1.5 px-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 dark:from-secondary dark:to-secondary dark:text-secondary-foreground dark:border-border">
                  Search Results
                </Badge>
                {posts && (
                  <span className="text-sm text-muted-foreground">
                    {posts.length} {posts.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ColumnSelector columns={columns} onColumnsChange={setColumns} />
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {!user && !searchQuery && (
              <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-red-50/30 dark:from-primary/5 dark:via-transparent dark:to-transparent relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 -z-10" />
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <MasonryGrid posts={posts} columns={columns} onPostClick={handlePostClick} />
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
              <Card className="border-dashed">
                <CardContent className="py-12 px-8 text-center">
                  <div className="max-w-sm mx-auto space-y-6">
                    <p className="text-muted-foreground">
                      No posts found. Check your relay connections or wait a moment for content to load.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </div>

          {/* Sidebar */}
          <Sidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-gradient-to-r from-background/80 via-rose-50/30 to-background/80 backdrop-blur-lg mt-16 dark:from-background/80 dark:via-background/80 dark:to-background/80">
        <div className="px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-all inline-flex items-center gap-1 hover:scale-105"
            >
              Vibed with Shakespeare
              <Sparkles className="h-3 w-3 text-rose-600 dark:text-primary" />
            </a>
          </p>
        </div>
      </footer>

      {/* Post Detail Dialog */}
      <PostDetailDialog
        event={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* PWA Install Prompt */}
      <InstallPWA />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

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

export default Index;

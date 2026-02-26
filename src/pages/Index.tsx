import { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { type FeedCategory } from '@/hooks/usePosts';
import { useInfinitePosts } from '@/hooks/useInfinitePosts';
import { useSearchPosts } from '@/hooks/useSearchPosts';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ComposePost } from '@/components/ComposePost';
import { PostDetailDialog } from '@/components/PostDetailDialog';
import { SearchBar } from '@/components/SearchBar';
import { LoginArea } from '@/components/auth/LoginArea';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { ColumnSelector } from '@/components/ColumnSelector';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Image, Music, Video, Users, Loader2 } from 'lucide-react';
import { TyrannoCoin } from '@/components/TyrannoCoin';
import type { NostrEvent } from '@nostrify/nostrify';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>('following');
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useSeoMeta({
    title: 'Tyrannosocial - A Beautiful Nostr Experience',
    description: 'Discover and share moments in a stunning masonry grid layout. Built on Nostr, the decentralized social protocol.',
  });

  const { user } = useCurrentUser();
  const { 
    data: infiniteData, 
    isLoading: isLoadingFeed, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = useInfinitePosts(selectedCategory);
  const { data: searchPosts, isLoading: isLoadingSearch } = useSearchPosts(searchQuery);

  // Flatten infinite query pages
  const feedPosts = infiniteData?.pages.flat() ?? [];

  // Use search results if searching, otherwise use feed
  const posts = searchQuery.trim() ? searchPosts : feedPosts;
  const isLoading = searchQuery.trim() ? isLoadingSearch : isLoadingFeed;

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
    <div className="min-h-screen bg-gradient-to-br from-background via-amber-50/30 to-orange-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Hero Header - Sticky */}
      <header className="sticky top-0 z-40 relative border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-amber-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 flex-1 sm:flex-initial">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 blur-xl opacity-60 animate-pulse dark:from-yellow-600 dark:via-red-900 dark:to-yellow-700 dark:opacity-50" />
                <div className="relative p-1 bg-gradient-to-br from-amber-100/50 to-orange-100/30 rounded-full dark:from-transparent dark:to-transparent">
                  <TyrannoCoin className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-2xl filter brightness-110" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Tyrannosocial
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Powered by Nostr
                </p>
              </div>
            </div>

            {/* Right Side - Search, Login and Mobile Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Bar - Desktop */}
              <div className="hidden md:block w-64 lg:w-80">
                <SearchBar onSearch={setSearchQuery} />
              </div>
              <LoginArea className="max-w-60 hidden sm:flex" />
              <MobileSidebar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>

          {/* Search Bar - Mobile (below header on small screens) */}
          <div className="md:hidden mt-4">
            <SearchBar onSearch={setSearchQuery} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="flex gap-6">
          {/* Feed Section */}
          <div className="flex-1 min-w-0 space-y-6">
          {/* Compose Section */}
          {user && !searchQuery && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <ComposePost />
            </div>
          )}

          {/* Category Badge and Column Selector */}
          {!searchQuery && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1.5 px-3 bg-gradient-to-r from-primary/10 to-orange-100/50 text-primary border-primary/20 dark:from-primary/20 dark:to-primary/10">
                  <CategoryIcon className="h-4 w-4 mr-2" />
                  {categoryLabels[selectedCategory]}
                </Badge>
                {posts && (
                  <span className="text-sm text-muted-foreground">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </span>
                )}
              </div>
              <ColumnSelector columns={columns} onColumnsChange={setColumns} />
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
              <ColumnSelector columns={columns} onColumnsChange={setColumns} />
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {!user && !searchQuery && (
              <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/30 dark:from-primary/5 dark:via-transparent dark:to-transparent relative overflow-hidden">
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
      <footer className="border-t border-border/50 bg-gradient-to-r from-background/80 via-amber-50/30 to-background/80 backdrop-blur-lg mt-16 dark:from-background/80 dark:via-background/80 dark:to-background/80">
        <div className="px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-all inline-flex items-center gap-1 hover:scale-105"
            >
              Vibed with Shakespeare
              <Sparkles className="h-3 w-3 text-amber-500 dark:text-primary" />
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
    </div>
  );
};

export default Index;

import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { usePosts, type FeedCategory } from '@/hooks/usePosts';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ComposePost } from '@/components/ComposePost';
import { LoginArea } from '@/components/auth/LoginArea';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Grid3x3, FileText, Image, Music, Video, Hash } from 'lucide-react';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory>('all');

  useSeoMeta({
    title: 'Masonry Social - A Beautiful Nostr Experience',
    description: 'Discover and share moments in a stunning masonry grid layout. Built on Nostr, the decentralized social protocol.',
  });

  const { user } = useCurrentUser();
  const { data: posts, isLoading } = usePosts(selectedCategory);

  const categoryIcons: Record<FeedCategory, typeof FileText> = {
    all: Hash,
    text: FileText,
    articles: FileText,
    photos: Image,
    music: Music,
    videos: Video,
  };

  const categoryLabels: Record<FeedCategory, string> = {
    all: 'All Posts',
    text: 'Text Notes',
    articles: 'Articles',
    photos: 'Photos',
    music: 'Music',
    videos: 'Videos',
  };

  const CategoryIcon = categoryIcons[selectedCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 -z-10" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 blur-xl opacity-50" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 p-3 rounded-2xl shadow-lg">
                  <Grid3x3 className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
                  Masonry Social
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Powered by Nostr
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LoginArea className="max-w-60 hidden sm:flex" />
              <MobileSidebar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* Feed Section */}
          <div className="flex-1 min-w-0 space-y-6">
          {/* Compose Section */}
          {user && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <ComposePost />
            </div>
          )}

          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm py-1.5 px-3">
              <CategoryIcon className="h-4 w-4 mr-2" />
              {categoryLabels[selectedCategory]}
            </Badge>
            {posts && (
              <span className="text-sm text-muted-foreground">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
            )}
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {!user && selectedCategory === 'all' && (
              <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="py-12 px-8 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Welcome to Masonry Social</h2>
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MasonryGrid posts={posts} />
              </div>
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
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-lg mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            <a
              href="https://shakespeare.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              Vibed with Shakespeare
              <Sparkles className="h-3 w-3" />
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

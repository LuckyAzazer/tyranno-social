import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useSearchPosts } from '@/hooks/useSearchPosts';
import { MasonryGrid } from '@/components/MasonryGrid';
import { PostModal } from '@/components/PostModal';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Hash, Sparkles } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [columns] = useLocalStorage<number>('masonry-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const hashtag = tag ?? '';

  useSeoMeta({
    title: `#${hashtag} - Tyrannosocial`,
    description: `Posts tagged with #${hashtag} on Tyrannosocial, the beautiful Nostr experience.`,
  });

  const { data: posts, isLoading } = useSearchPosts(`#${hashtag}`, 100);

  if (!hashtag) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 isolate relative border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10 pointer-events-none" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-orange-500/20 blur-lg rounded-full opacity-60" />
                  <div className="relative p-2 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/10">
                    <Hash className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                    #{hashtag}
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Hashtag feed
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {posts && !isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </Badge>
              )}
              <LoginArea className="max-w-60 hidden sm:flex" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 pb-24 lg:pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
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
            <MasonryGrid posts={posts} columns={columns} onPostClick={setSelectedPost} />
          </div>
        ) : (
          <Card className="border-dashed max-w-md mx-auto mt-16">
            <CardContent className="py-12 px-8 text-center">
              <div className="space-y-4">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
                  <Hash className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">No posts found for #{hashtag}</h2>
                <p className="text-muted-foreground text-sm">
                  No posts with this hashtag were found on your connected relays. Try again later or check your relay connections.
                </p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to feed
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {selectedPost && (
        <PostModal event={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

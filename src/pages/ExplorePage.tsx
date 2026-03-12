/**
 * ExplorePage — "What's Hot" global explore feed.
 *
 * Shows trending posts ranked by engagement (reactions + reposts + zaps)
 * from the last 48 hours across all connected relays.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useHotPosts } from '@/hooks/useHotPosts';
import { useTrendingHashtags } from '@/hooks/useTrendingHashtags';
import { useAuthor } from '@/hooks/useAuthor';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PostModal } from '@/components/PostModal';
import { MasonryGrid } from '@/components/MasonryGrid';
import { ColumnSelector } from '@/components/ColumnSelector';
import { NoteContent } from '@/components/NoteContent';
import { MediaContent } from '@/components/MediaContent';
import { ContentWarningWrapper } from '@/components/ContentWarningWrapper';
import { LoginArea } from '@/components/auth/LoginArea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { genUserName } from '@/lib/genUserName';
import { formatEventTime } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import {
  Flame,
  TrendingUp,
  Hash,
  Heart,
  Repeat2,
  Zap,
  ArrowLeft,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import type { HotPost } from '@/hooks/useHotPosts';

function HotPostCard({
  hotPost,
  rank,
  onClick,
}: {
  hotPost: HotPost;
  rank: number;
  onClick: (e: NostrEvent) => void;
}) {
  const { event, score, reactionCount, repostCount, zapCount } = hotPost;
  const author = useAuthor(event.pubkey);
  const meta: NostrMetadata | undefined = author.data?.metadata;
  const displayName = meta?.display_name || meta?.name || genUserName(event.pubkey);
  const npub = nip19.npubEncode(event.pubkey);
  const timeAgo = formatEventTime(event.created_at);

  const rankColors = [
    'from-yellow-400 to-amber-500',   // 1st
    'from-slate-400 to-slate-500',    // 2nd
    'from-amber-600 to-orange-700',   // 3rd
  ];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : null;

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/50 hover:border-primary/20 dark:border-transparent cursor-pointer bg-gradient-to-br from-card via-card to-rose-50/10 dark:from-card dark:via-card dark:to-card"
      onClick={() => onClick(event)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
            rankColor ? `bg-gradient-to-br ${rankColor}` : 'bg-muted text-muted-foreground'
          }`}>
            {rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : rank}
          </div>

          <Link to={`/${npub}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Avatar className="h-9 w-9 ring-2 ring-background">
              <AvatarImage src={meta?.picture} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/${npub}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-sm hover:text-primary transition-colors truncate"
              >
                {displayName}
              </Link>
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
          <NoteContent event={event} />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <ContentWarningWrapper event={event} mediaOnly>
            <MediaContent event={event} />
          </ContentWarningWrapper>
        </div>

        {/* Engagement stats */}
        <div className="flex items-center gap-3 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 text-xs text-rose-500">
            <Heart className="h-3.5 w-3.5" />
            <span className="font-medium">{reactionCount}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Repeat2 className="h-3.5 w-3.5" />
            <span className="font-medium">{repostCount}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Zap className="h-3.5 w-3.5" />
            <span className="font-medium">{zapCount}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-primary font-bold">
            <Flame className="h-3.5 w-3.5" />
            <span>{score}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ExploreTab = 'hot' | 'trending';

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useLocalStorage<ExploreTab>('explore-tab', 'hot');
  const [columns, setColumns] = useLocalStorage<number>('explore-columns', 3);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);

  useSeoMeta({
    title: 'Explore — What\'s Hot · Tyrannosocial',
    description: 'Discover trending posts and hashtags on the Nostr network.',
  });

  const { data: hotPosts, isLoading: isLoadingHot } = useHotPosts(50);
  const { data: trendingTags, isLoading: isLoadingTags } = useTrendingHashtags(30);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-rose-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-rose-500 blur-xl opacity-60 animate-pulse" />
                  <div className="relative p-2 rounded-full bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-950/40 dark:to-rose-950/40">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Explore</h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    What's hot on Nostr
                  </p>
                </div>
              </div>
            </div>
            <LoginArea className="max-w-48 hidden sm:flex" />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExploreTab)}>
              <TabsList className="bg-background/50">
                <TabsTrigger value="hot" className="gap-2 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 dark:data-[state=active]:bg-orange-950/40 dark:data-[state=active]:text-orange-400">
                  <Flame className="h-3.5 w-3.5" />
                  What's Hot
                </TabsTrigger>
                <TabsTrigger value="trending" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending Tags
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'hot' && (
              <ColumnSelector columns={columns} onColumnsChange={setColumns} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`px-4 py-6 pb-24 lg:pb-8 ${activeTab === 'trending' ? 'max-w-4xl mx-auto' : ''}`}>
        {activeTab === 'hot' && (
          <div className="space-y-4">
            {isLoadingHot ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : !hotPosts || hotPosts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Flame className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-lg">Nothing hot yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back soon — trending posts will appear here as people engage with content.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>Top {hotPosts.length} posts by engagement in the last 48 hours</span>
                </div>
                <MasonryGrid
                  posts={hotPosts.map((hp) => hp.event)}
                  columns={columns}
                  onPostClick={setSelectedPost}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="space-y-3">
            {isLoadingTags ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !trendingTags || trendingTags.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Hash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium">No trending hashtags yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Top {trendingTags.length} hashtags in the last 24 hours</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trendingTags.map((tag, i) => (
                    <Link key={tag.tag} to={`/hashtag/${encodeURIComponent(tag.tag)}`}>
                      <Card className="group hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer border-border/50 dark:border-transparent">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            i < 3
                              ? 'bg-gradient-to-br from-orange-100 to-rose-100 text-orange-700 dark:from-orange-950/40 dark:to-rose-950/40 dark:text-orange-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {i < 3 ? <Flame className="h-4 w-4" /> : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold group-hover:text-primary transition-colors truncate">
                              #{tag.tag}
                            </p>
                            <p className="text-xs text-muted-foreground">{tag.count} posts</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                            {tag.count >= 1000 ? `${(tag.count / 1000).toFixed(1)}k` : tag.count}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {selectedPost && (
        <PostModal event={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

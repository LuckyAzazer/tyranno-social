/**
 * CommunitiesPage — browse and join Nostr channels (kind 40).
 *
 * Shows active communities with message counts and recent activity,
 * plus a "Join" button that opens the channel in the group messaging UI.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useChannels } from '@/hooks/useChannels';
import { useChannelMessages } from '@/hooks/useChannelMessages';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { genUserName } from '@/lib/genUserName';
import { formatEventTime } from '@/lib/utils';
import {
  ArrowLeft,
  Hash,
  MessageCircle,
  Search,
  Users,
  Sparkles,
  ExternalLink,
  Clock,
} from 'lucide-react';
import type { Channel } from '@/hooks/useChannels';
import type { NostrMetadata } from '@nostrify/nostrify';

function ChannelActivityBadge({ channelId }: { channelId: string }) {
  const { data: messages } = useChannelMessages(channelId, 20);
  const count = messages?.length ?? 0;
  const latest = messages?.[0]?.created_at;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <MessageCircle className="h-3 w-3" />
        {count >= 20 ? '20+' : count} messages
      </span>
      {latest && (
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatEventTime(latest)}
        </span>
      )}
    </div>
  );
}

function ChannelCard({ channel, onOpen }: { channel: Channel; onOpen: (id: string) => void }) {
  const creator = useAuthor(channel.creator);
  const meta: NostrMetadata | undefined = creator.data?.metadata;
  const creatorName = meta?.display_name || meta?.name || genUserName(channel.creator);

  const name = channel.metadata.name || 'Unnamed Channel';
  const about = channel.metadata.about;
  const picture = channel.metadata.picture;

  return (
    <Card className="group hover:border-primary/30 hover:shadow-md transition-all duration-200 border-border/50 dark:border-transparent bg-gradient-to-br from-card to-indigo-50/10 dark:from-card dark:to-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Channel icon */}
          <div className="shrink-0">
            {picture ? (
              <img
                src={picture}
                alt={name}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-background"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40 flex items-center justify-center ring-2 ring-background">
                <Hash className="h-6 w-6 text-indigo-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  by {creatorName}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                onClick={() => onOpen(channel.id)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
            </div>

            {about && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
                {about}
              </p>
            )}

            <ChannelActivityBadge channelId={channel.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommunitiesPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: channels, isLoading } = useChannels(100);
  const [searchQuery, setSearchQuery] = useState('');

  useSeoMeta({
    title: 'Communities · Tyrannosocial',
    description: 'Discover and join Nostr communities and channels.',
  });

  const filtered = channels?.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.metadata.name?.toLowerCase().includes(q) ||
      c.metadata.about?.toLowerCase().includes(q)
    );
  });

  const handleOpen = (channelId: string) => {
    // Navigate to messages page with channel pre-selected
    navigate(`/messages?channel=${channelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-indigo-50/20 to-violet-50/20 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-indigo-400/30 blur-xl rounded-full" />
                  <div className="relative p-2 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40">
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Communities</h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {channels?.length ?? 0} channels found
                  </p>
                </div>
              </div>
            </div>
            <LoginArea className="max-w-48 hidden sm:flex" />
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search communities…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 lg:pb-8 max-w-3xl mx-auto space-y-4">
        {/* CTA for creating */}
        {user && (
          <Card className="border-dashed border-primary/20 bg-gradient-to-br from-indigo-50/30 to-violet-50/20 dark:from-indigo-950/10 dark:to-violet-950/10">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Create your own community</p>
                <p className="text-xs text-muted-foreground">Start a channel and invite others to join</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/messages')}
                className="shrink-0 gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0"
              >
                <Hash className="h-3.5 w-3.5" />
                Go to Channels
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <>
            {searchQuery && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
            )}
            <div className="space-y-3">
              {filtered.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} onOpen={handleOpen} />
              ))}
            </div>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center">
              <Hash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-medium text-lg">
                {searchQuery ? 'No communities found' : 'No communities yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Be the first to create a community channel!'}
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

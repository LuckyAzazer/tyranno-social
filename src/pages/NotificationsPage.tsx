/**
 * NotificationsPage — full-page notifications with type filters.
 * Accessible from the sidebar on desktop AND from mobile nav.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNotifications } from '@/hooks/useNotifications';
import { useEventById } from '@/hooks/useEventById';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NotificationItem } from '@/components/NotificationItem';
import { PostModal } from '@/components/PostModal';
import { LoginArea } from '@/components/auth/LoginArea';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Bell, AtSign, MessageCircle, Heart, Repeat2, Zap } from 'lucide-react';
import type { NotificationEvent } from '@/hooks/useNotifications';
import type { NostrEvent } from '@nostrify/nostrify';

type FilterType = 'all' | 'mention' | 'reply' | 'reaction' | 'repost' | 'zap';

const filterConfig: { value: FilterType; label: string; icon: typeof Bell; color: string }[] = [
  { value: 'all',      label: 'All',       icon: Bell,          color: '' },
  { value: 'mention',  label: 'Mentions',  icon: AtSign,        color: 'text-blue-500' },
  { value: 'reply',    label: 'Replies',   icon: MessageCircle, color: 'text-green-500' },
  { value: 'reaction', label: 'Reactions', icon: Heart,         color: 'text-pink-500' },
  { value: 'repost',   label: 'Reposts',   icon: Repeat2,       color: 'text-purple-500' },
  { value: 'zap',      label: 'Zaps',      icon: Zap,           color: 'text-yellow-500' },
];

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: notifications, isLoading } = useNotifications(200);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const { data: pendingEvent } = useEventById(pendingEventId);

  useSeoMeta({
    title: 'Notifications · Tyrannosocial',
    description: 'Your Nostr notifications — replies, reactions, reposts and zaps.',
  });

  useEffect(() => {
    if (pendingEvent) {
      setSelectedPost(pendingEvent);
      setPendingEventId(null);
    }
  }, [pendingEvent]);

  const handleClick = useCallback((notification: NotificationEvent) => {
    const eTag = notification.tags.find(([name]) => name === 'e');
    if (eTag?.[1]) setPendingEventId(eTag[1]);
    else setSelectedPost(notification);
  }, []);

  const filtered = filter === 'all'
    ? notifications
    : notifications?.filter((n) => n.notificationType === filter);

  const countFor = (type: FilterType) =>
    type === 'all' ? notifications?.length ?? 0
      : notifications?.filter((n) => n.notificationType === type).length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <div className="relative p-2 rounded-full bg-primary/10">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Notifications</h1>
                  <p className="text-xs text-muted-foreground">
                    {notifications?.length ?? 0} total
                  </p>
                </div>
              </div>
            </div>
            <LoginArea className="max-w-48 hidden sm:flex" />
          </div>

          {/* Filter tabs */}
          {user && (
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <TabsList className="bg-background/50 flex-wrap h-auto gap-1 p-1">
                {filterConfig.map(({ value, label, icon: Icon, color }) => {
                  const count = countFor(value);
                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      {label}
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono">
                          {count > 99 ? '99+' : count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 pb-24 lg:pb-8 max-w-3xl mx-auto">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bell className="h-14 w-14 text-muted-foreground opacity-20" />
            <p className="font-medium text-lg">Log in to see your notifications</p>
            <p className="text-sm text-muted-foreground">Replies, reactions, reposts and zaps will appear here</p>
            <LoginArea className="max-w-60 mt-2" />
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start p-4 rounded-xl border border-border/40">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleClick(notification)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed mt-8">
            <CardContent className="py-20 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-medium">
                {filter === 'all' ? 'No notifications yet' : `No ${filter}s yet`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'all'
                  ? 'When people interact with your posts, it will show up here.'
                  : `Switch to "All" to see everything.`}
              </p>
              {filter !== 'all' && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilter('all')}>
                  Show all notifications
                </Button>
              )}
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

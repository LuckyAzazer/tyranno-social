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
import { ArrowLeft, Bell } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { NotificationEvent } from '@/hooks/useNotifications';
import type { NostrEvent } from '@nostrify/nostrify';

export function MobileNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: notifications, isLoading } = useNotifications(100);
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const { data: pendingEvent } = useEventById(pendingEventId);

  useSeoMeta({
    title: 'Notifications - Tyrannosocial',
    description: 'Your Nostr notifications',
  });

  useEffect(() => {
    if (pendingEvent) {
      setSelectedPost(pendingEvent);
      setPendingEventId(null);
    }
  }, [pendingEvent]);

  const handleNotificationClick = useCallback((notification: NotificationEvent) => {
    const eTag = notification.tags.find(([name]) => name === 'e');
    if (eTag?.[1]) {
      setPendingEventId(eTag[1]);
    } else {
      setSelectedPost(notification);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
          {notifications && notifications.length > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">{notifications.length}</span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Bell className="h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Log in to see your notifications</p>
            <LoginArea className="max-w-60" />
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start p-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bell className="h-12 w-12 text-muted-foreground opacity-30" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              Replies, reactions, reposts and zaps will appear here
            </p>
          </div>
        )}
      </main>

      {selectedPost && (
        <PostModal event={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

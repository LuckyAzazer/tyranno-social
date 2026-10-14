/**
 * MobileNotificationsPage — lean, fast, no heavy filter UI.
 * Just shows notifications in a flat list with minimal chrome.
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
import { ArrowLeft, Bell } from 'lucide-react';
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
    title: 'Notifications · Tyrannosocial',
    description: 'Your Nostr notifications',
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

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-background/95 backdrop-blur-lg">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-accent transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Bell className="h-4 w-4 text-primary shrink-0" />
        <h1 className="text-base font-bold flex-1">Notifications</h1>
        {notifications && notifications.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{notifications.length}</span>
        )}
      </header>

      {/* Content */}
      <main className="px-3 py-2">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Bell className="h-10 w-10 text-muted-foreground opacity-25" />
            <p className="text-sm text-muted-foreground">Log in to see your notifications</p>
            <LoginArea className="max-w-60" />
          </div>
        ) : isLoading || notifications === undefined ? (
          <div className="space-y-1 pt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start p-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-1 pt-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleClick(notification)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bell className="h-10 w-10 text-muted-foreground opacity-25" />
            <p className="font-medium text-sm">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              Replies, reactions, reposts and zaps will appear here.
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

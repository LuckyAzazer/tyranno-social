import { useAuthor } from '@/hooks/useAuthor';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { genUserName } from '@/lib/genUserName';
import { Heart, MessageCircle, Repeat2, Zap, AtSign } from 'lucide-react';
import type { NotificationEvent } from '@/hooks/useNotifications';
import type { NostrMetadata } from '@nostrify/nostrify';

interface NotificationItemProps {
  notification: NotificationEvent;
  onClick?: () => void;
}

const notificationIcons = {
  mention: AtSign,
  reply: MessageCircle,
  reaction: Heart,
  repost: Repeat2,
  zap: Zap,
};

const notificationLabels = {
  mention: 'mentioned you',
  reply: 'replied to your post',
  reaction: 'reacted to your post',
  repost: 'reposted your post',
  zap: 'zapped your post',
};

const notificationColors = {
  mention: 'text-blue-500',
  reply: 'text-green-500',
  reaction: 'text-pink-500',
  repost: 'text-purple-500',
  zap: 'text-yellow-500',
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const author = useAuthor(notification.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(notification.pubkey);
  const profileImage = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at * 1000), { addSuffix: true });

  const Icon = notificationIcons[notification.notificationType];
  const label = notificationLabels[notification.notificationType];
  const iconColor = notificationColors[notification.notificationType];

  // Get reaction emoji or content preview
  let contentPreview = '';
  if (notification.notificationType === 'reaction') {
    contentPreview = notification.content || '❤️';
  } else if (notification.notificationType === 'zap') {
    // Extract zap amount from tags if available
    const amountTag = notification.tags.find(([name]) => name === 'amount');
    if (amountTag) {
      const sats = parseInt(amountTag[1]) / 1000;
      contentPreview = `${sats.toLocaleString()} sats`;
    }
  } else if (notification.content) {
    contentPreview = notification.content.slice(0, 100);
    if (notification.content.length > 100) {
      contentPreview += '...';
    }
  }

  return (
    <Card 
      className="overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{displayName}</span>
              <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                <Icon className={`h-3 w-3 ${iconColor}`} />
                {label}
              </Badge>
            </div>

            {contentPreview && (
              <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">
                {notification.notificationType === 'reaction' && (
                  <span className="text-2xl mr-1">{contentPreview}</span>
                )}
                {notification.notificationType === 'zap' && (
                  <span className="font-semibold text-yellow-500">{contentPreview}</span>
                )}
                {notification.notificationType !== 'reaction' && 
                 notification.notificationType !== 'zap' && 
                 contentPreview}
              </p>
            )}

            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

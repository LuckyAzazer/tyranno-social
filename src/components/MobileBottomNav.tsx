import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUnreadDMCount } from '@/hooks/useUnreadDMCount';
import { useNotifications } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Bell, Settings, PenSquare, MessageCircle, Flame, Users } from 'lucide-react';

export function MobileBottomNav() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const unreadDMCount = useUnreadDMCount();
  const { data: notifications } = useNotifications(50);

  const handleHome = () => {
    if (location.pathname === '/') {
      // Already on home — scroll to top and refetch feed
      window.scrollTo({ top: 0, behavior: 'smooth' });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-posts'] });
    } else {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const btnClass = (path: string) =>
    `flex-col h-auto py-2 px-3 gap-1 transition-colors ${
      isActive(path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    }`;

  const homeClass = `flex-col h-auto py-2 px-3 gap-1 transition-colors ${
    isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  }`;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">

        {/* Home — scrolls to top + refreshes */}
        <Button variant="ghost" size="sm" onClick={handleHome} className={homeClass}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Button>

        {/* Messages */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/messages')}
          className={`relative ${btnClass('/messages')}`}
        >
          <MessageCircle className="h-5 w-5" />
          {unreadDMCount > 0 && (
            <Badge className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-red-500 hover:bg-red-500 text-white text-[9px] border border-background">
              {unreadDMCount > 9 ? '9+' : unreadDMCount}
            </Badge>
          )}
          <span className="text-[10px] font-medium">Messages</span>
        </Button>

        {/* Compose — prominent centre button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/compose')}
          className={`relative ${btnClass('/compose')}`}
        >
          <div className={`p-1.5 rounded-full transition-colors ${
            isActive('/compose')
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary group-hover:bg-primary/20'
          }`}>
            <PenSquare className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Compose</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/notifications')}
          className={`relative ${btnClass('/notifications')}`}
        >
          <Bell className="h-5 w-5" />
          {notifications && notifications.length > 0 && (
            <Badge className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-red-500 hover:bg-red-500 text-white text-[9px] border border-background">
              {notifications.length > 9 ? '9+' : notifications.length}
            </Badge>
          )}
          <span className="text-[10px] font-medium">Alerts</span>
        </Button>

        {/* Explore */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/explore')}
          className={btnClass('/explore')}
        >
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-[10px] font-medium">Explore</span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className={btnClass('/settings')}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Button>

      </div>
    </div>
  );
}

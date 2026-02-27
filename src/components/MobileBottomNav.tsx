import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadDMCount } from '@/hooks/useUnreadDMCount';
import { MobileSettings } from '@/components/MobileSettings';
import { Home, MessageCircle, User, LogIn } from 'lucide-react';

export function MobileBottomNav() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const unreadDMCount = useUnreadDMCount();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg shadow-lg">
      <div className="flex items-center justify-around px-4 py-3">
        {/* Home */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex-col h-auto py-2 px-3 gap-1"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Button>

        {/* Messages */}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/messages')}
            className="flex-col h-auto py-2 px-3 gap-1 relative"
          >
            <MessageCircle className="h-5 w-5" />
            {unreadDMCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 hover:bg-red-500 text-white text-[9px] border border-background">
                {unreadDMCount > 9 ? '9+' : unreadDMCount}
              </Badge>
            )}
            <span className="text-[10px] font-medium">Messages</span>
          </Button>
        )}

        {/* Settings */}
        <MobileSettings />

        {/* Profile or Login */}
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/profile/${user.npub}`)}
            className="flex-col h-auto py-2 px-3 gap-1"
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Scroll to login area
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-col h-auto py-2 px-3 gap-1"
          >
            <LogIn className="h-5 w-5" />
            <span className="text-[10px] font-medium">Login</span>
          </Button>
        )}
      </div>
    </div>
  );
}

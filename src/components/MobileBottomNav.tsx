import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUnreadDMCount } from '@/hooks/useUnreadDMCount';
import { useNotifications } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { Home, Bell, Settings, MessageCircle, Flame } from 'lucide-react';

export function MobileBottomNav() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const unreadDMCount = useUnreadDMCount();
  const { data: notifications } = useNotifications(50);

  const handleHome = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-posts'] });
    } else {
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const unreadNotifCount = notifications?.length ?? 0;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background shadow-[0_-1px_0_0_hsl(var(--border)/0.3)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">

        {/* Home */}
        <NavButton
          label="Home"
          active={isActive('/')}
          onClick={handleHome}
        >
          <Home className="h-[22px] w-[22px]" />
        </NavButton>

        {/* Messages */}
        <NavButton
          label="Messages"
          active={isActive('/messages')}
          onClick={() => navigate('/messages')}
          badge={unreadDMCount > 0 ? (unreadDMCount > 9 ? '9+' : String(unreadDMCount)) : undefined}
        >
          <MessageCircle className="h-[22px] w-[22px]" />
        </NavButton>

        {/* Explore */}
        <NavButton
          label="Explore"
          active={isActive('/explore')}
          onClick={() => navigate('/explore')}
        >
          <Flame className={`h-[22px] w-[22px] ${isActive('/explore') ? '' : 'text-orange-500'}`} />
        </NavButton>

        {/* Notifications */}
        <NavButton
          label="Alerts"
          active={isActive('/notifications')}
          onClick={() => navigate('/notifications')}
          badge={unreadNotifCount > 0 ? (unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)) : undefined}
        >
          <Bell className="h-[22px] w-[22px]" />
        </NavButton>

        {/* Settings */}
        <NavButton
          label="Settings"
          active={isActive('/settings')}
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-[22px] w-[22px]" />
        </NavButton>

      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  children: React.ReactNode;
}

function NavButton({ label, active, onClick, badge, children }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        // Full-height flex column for easy centering
        'relative flex flex-col items-center justify-center gap-[3px]',
        // Generous tap target — min 48px tall, flex-1 wide
        'flex-1 min-h-[52px] py-2',
        // Snappy press effect (no hover jank on mobile)
        'transition-all duration-100 active:scale-90 active:opacity-70',
        // Colour
        active
          ? 'text-primary'
          : 'text-muted-foreground',
        // Remove browser tap highlight — we have our own feedback
        'outline-none select-none',
      ].join(' ')}
    >
      {/* Icon wrapper — relative for badge positioning */}
      <span className="relative">
        {children}
        {badge && (
          <span className="absolute -top-1.5 -right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white border border-background">
            {badge}
          </span>
        )}
      </span>

      {/* Label */}
      <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>

      {/* Active dot indicator */}
      {active && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-primary" />
      )}
    </button>
  );
}

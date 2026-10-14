/**
 * MobileBottomNav — 4-tab minimal bar for mobile.
 *
 * Tabs: Home · Explore · Notifications · Profile
 *
 * Profile tab opens MobileProfileSheet (account switch + wallpaper + dark mode).
 * No heavy hooks beyond what's needed for badge counts.
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthor } from '@/hooks/useAuthor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileProfileSheet } from '@/components/MobileProfileSheet';
import { Home, Flame, Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { genUserName } from '@/lib/genUserName';

// ─── ProfileIcon ─────────────────────────────────────────────────────────────

/** Clean person-silhouette icon matching the weight of Home / Bell / Flame. */
function ProfileIcon({ active }: { active: boolean }) {
  const sw = active ? 2.25 : 1.8;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="12" cy="8" r="4" />
      {/* Shoulders */}
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function MobileBottomNav() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: notifications } = useNotifications(50);
  const author = useAuthor(user?.pubkey ?? '');
  const [profileOpen, setProfileOpen] = useState(false);

  const meta = author.data?.metadata;
  const displayName = meta?.display_name ?? meta?.name ?? (user ? genUserName(user.pubkey) : '');

  const unreadNotifCount = notifications?.length ?? 0;

  const isActive = (path: string) => location.pathname === path;

  const handleHome = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      queryClient.invalidateQueries({ queryKey: ['infinite-posts'] });
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around h-[52px]">

          {/* Home */}
          <NavBtn label="Home" active={isActive('/')} onClick={handleHome}>
            <Home className="h-[22px] w-[22px]" strokeWidth={isActive('/') ? 2.5 : 1.8} />
          </NavBtn>

          {/* Explore */}
          <NavBtn label="Explore" active={isActive('/explore')} onClick={() => navigate('/explore')}>
            <Flame className={`h-[22px] w-[22px] ${isActive('/explore') ? '' : 'text-orange-500'}`} strokeWidth={isActive('/explore') ? 2.5 : 1.8} />
          </NavBtn>

          {/* Notifications */}
          <NavBtn
            label="Alerts"
            active={isActive('/notifications')}
            onClick={() => navigate('/notifications')}
            badge={unreadNotifCount > 0 ? (unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)) : undefined}
          >
            <Bell className="h-[22px] w-[22px]" strokeWidth={isActive('/notifications') ? 2.5 : 1.8} />
          </NavBtn>

          {/* Profile / Account */}
          <NavBtn
            label="Profile"
            active={profileOpen}
            onClick={() => setProfileOpen(true)}
          >
            {user && meta?.picture ? (
              <Avatar className="h-[26px] w-[26px] ring-2 ring-offset-1 ring-offset-background ring-transparent data-[active=true]:ring-primary transition-all"
                data-active={profileOpen}
              >
                <AvatarImage src={meta.picture} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <ProfileIcon active={profileOpen} />
            )}
          </NavBtn>

        </div>
      </nav>

      <MobileProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

// ─── NavBtn ───────────────────────────────────────────────────────────────────

interface NavBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  children: React.ReactNode;
}

function NavBtn({ label, active, onClick, badge, children }: NavBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'relative flex flex-col items-center justify-center gap-[3px]',
        'flex-1 py-2',
        'transition-all duration-100 active:scale-90 active:opacity-70',
        active ? 'text-primary' : 'text-muted-foreground',
        'outline-none select-none',
      ].join(' ')}
    >
      <span className="relative">
        {children}
        {badge && (
          <span className="absolute -top-1.5 -right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white border border-background">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-primary" />
      )}
    </button>
  );
}

/**
 * MobileProfileSheet
 *
 * A lightweight bottom-sheet that handles:
 *   • Account switching (the two must-haves on mobile)
 *   • Custom wallpaper upload / removal
 *   • Dark / light toggle
 *   • Login prompt when logged out
 *
 * Opened by tapping the avatar/profile tab in MobileBottomNav.
 * Zero heavy dependencies — no relay manager, no topic filters, etc.
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Moon, Sun, ImagePlus, ImageOff, LogOut, Settings,
  Check, User, ChevronRight,
} from 'lucide-react';
import type { NostrMetadata } from '@nostrify/nostrify';

interface MobileProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileProfileSheet({ open, onOpenChange }: MobileProfileSheetProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const hasWallpaper = !!config.personalizedTheme;

  const currentMeta: NostrMetadata = currentUser?.metadata ?? {};
  const displayName = currentMeta.display_name ?? currentMeta.name ?? (currentUser ? genUserName(currentUser.pubkey) : '');

  const handleWallpaperFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateConfig((c) => ({
        ...c,
        personalizedTheme: {
          wallpaperUrl: dataUrl,
          wallpaperOpacity: c.personalizedTheme?.wallpaperOpacity ?? 0.15,
          wallpaperBlur: c.personalizedTheme?.wallpaperBlur ?? 0,
          wallpaperPosition: c.personalizedTheme?.wallpaperPosition ?? '50% 50%',
        },
      }));
      toast({ title: 'Wallpaper set!', description: 'Reload to see the full effect.' });
      setTimeout(() => window.location.reload(), 400);
    };
    reader.readAsDataURL(file);
  };

  const removeWallpaper = () => {
    updateConfig((c) => { const n = { ...c }; delete n.personalizedTheme; return n; });
    setTimeout(() => window.location.reload(), 100);
  };

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85dvh] overflow-y-auto p-0 flex flex-col"
      >
        {/* Drag handle */}
        <div className="shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        <SheetHeader className="px-5 pt-1 pb-3 shrink-0">
          <SheetTitle className="text-base font-semibold">Profile & Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">

          {/* ── Account section ─────────────────────────────────────── */}
          {user ? (
            <div className="space-y-3">
              {/* Current account */}
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15 active:bg-primary/10 transition-colors"
                onClick={() => {
                  close();
                  navigate(`/${nip19.npubEncode(user.pubkey)}`);
                }}
              >
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
                  <AvatarImage src={currentMeta.picture} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm truncate">{displayName}</p>
                  {currentMeta.name && currentMeta.display_name && (
                    <p className="text-xs text-muted-foreground truncate">@{currentMeta.name}</p>
                  )}
                  {currentMeta.nip05 && (
                    <p className="text-xs text-emerald-500 truncate flex items-center gap-1 mt-0.5">
                      <Check className="h-3 w-3 shrink-0" />
                      {currentMeta.nip05}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              {/* Other accounts */}
              {otherUsers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Switch Account
                  </p>
                  {otherUsers.map((account) => {
                    const meta = account.metadata ?? {};
                    const name = meta.display_name ?? meta.name ?? genUserName(account.pubkey);
                    return (
                      <div key={account.id} className="flex items-center gap-3">
                        <button
                          className="flex-1 flex items-center gap-3 p-2.5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-accent/50 active:bg-accent transition-colors text-left"
                          onClick={() => { setLogin(account.id); close(); }}
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={meta.picture} alt={name} />
                            <AvatarFallback className="bg-muted text-sm font-medium">
                              {name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            {meta.name && meta.display_name && (
                              <p className="text-xs text-muted-foreground truncate">@{meta.name}</p>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => removeLogin(account.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          aria-label="Remove account"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add account */}
              <div className="pt-1">
                <LoginArea className="w-full" />
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-3">
              <div className="inline-flex p-4 rounded-full bg-muted mb-1">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Log in to use Tyrannosocial</p>
              <LoginArea className="max-w-64 mx-auto" />
            </div>
          )}

          <Separator />

          {/* ── Dark mode ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-3">
              {isDark
                ? <Moon className="h-5 w-5 text-primary" />
                : <Sun className="h-5 w-5 text-primary" />
              }
              <span className="font-medium text-sm">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <Separator />

          {/* ── Wallpaper ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Wallpaper
            </p>

            {hasWallpaper ? (
              <div className="space-y-2">
                {/* Preview strip */}
                <div
                  className="h-20 rounded-xl overflow-hidden border border-border/60 relative"
                  style={{
                    backgroundImage: `url(${config.personalizedTheme?.wallpaperUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: config.personalizedTheme?.wallpaperPosition ?? '50% 50%',
                  }}
                >
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-foreground/80">Current Wallpaper</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Change
                  </button>
                  <button
                    onClick={removeWallpaper}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
                  >
                    <ImageOff className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <ImagePlus className="h-4 w-4" />
                Set Custom Wallpaper
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleWallpaperFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <Separator />

          {/* ── Full settings link ───────────────────────────────────── */}
          <button
            onClick={() => { close(); navigate('/settings'); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-border/60 hover:bg-accent hover:border-primary/30 active:bg-accent/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Full Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

        </div>
      </SheetContent>
    </Sheet>
  );
}

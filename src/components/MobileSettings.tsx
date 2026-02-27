import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { useWebOfTrust } from '@/hooks/useWebOfTrust';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, Moon, Sun, AlertTriangle, ShieldCheck, Users } from 'lucide-react';

export function MobileSettings() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { shouldFilter, filterEnabled, setFilterEnabled, canToggle } = useNSFWFilter();
  const { isActive: wotActive, wotEnabled, setWotEnabled, canUseWoT } = useWebOfTrust();

  const isDark = theme === 'dark';
  const hasPersonalizedTheme = !!config.personalizedTheme;

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    
    // If personalized mode is active, turn it off when toggling theme
    if (hasPersonalizedTheme) {
      updateConfig((current) => {
        const newConfig = { ...current };
        delete newConfig.personalizedTheme;
        return newConfig;
      });
      
      // Remove personalized theme from DOM
      const root = document.documentElement;
      root.classList.remove('personalized-theme');
      root.style.removeProperty('--wallpaper-url');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex-col h-auto py-2 px-3 gap-1"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Quick Settings
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div>
                <Label htmlFor="mobile-theme-toggle" className="cursor-pointer font-medium">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Label>
                {hasPersonalizedTheme && (
                  <p className="text-xs text-muted-foreground">Will disable personalized theme</p>
                )}
              </div>
            </div>
            <Switch
              id="mobile-theme-toggle"
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* NSFW Filter Toggle */}
          {canToggle && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="mobile-nsfw-toggle" className="cursor-pointer font-medium">
                    NSFW Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {shouldFilter ? 'Filtering enabled' : 'Showing all content'}
                  </p>
                </div>
              </div>
              <Switch
                id="mobile-nsfw-toggle"
                checked={filterEnabled}
                onCheckedChange={setFilterEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}

          {/* Web of Trust Toggle */}
          {canUseWoT && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="mobile-wot-toggle" className="cursor-pointer font-medium">
                    Web of Trust
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {wotActive ? 'Filtering active' : 'Show all users'}
                  </p>
                </div>
              </div>
              <Switch
                id="mobile-wot-toggle"
                checked={wotEnabled}
                onCheckedChange={setWotEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}

          {/* Content Warnings Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="mobile-cw-toggle" className="cursor-pointer font-medium">
                  Content Warnings
                </Label>
                <p className="text-xs text-muted-foreground">
                  {config.hideContentWarnings ? 'Auto-hide enabled' : 'Always visible'}
                </p>
              </div>
            </div>
            <Switch
              id="mobile-cw-toggle"
              checked={config.hideContentWarnings ?? false}
              onCheckedChange={(checked) => {
                updateConfig((current) => ({
                  ...current,
                  hideContentWarnings: checked,
                }));
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

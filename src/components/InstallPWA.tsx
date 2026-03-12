import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, BookmarkPlus, Menu } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type BrowserType = 'chrome-like' | 'firefox' | 'safari' | 'unknown';

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  // Firefox and forks (Floorp, Zen, LibreWolf, etc.)
  if (ua.includes('firefox') || ua.includes('floorp') || ua.includes('librewolf') || ua.includes('zen/')) {
    return 'firefox';
  }
  // Safari (but not Chrome on iOS which also includes safari)
  if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    return 'safari';
  }
  // Chrome, Edge, Brave, Opera, Vivaldi, etc.
  if (ua.includes('chrome') || ua.includes('chromium') || ua.includes('edg/') || ua.includes('brave')) {
    return 'chrome-like';
  }
  return 'unknown';
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browserType, setBrowserType] = useState<BrowserType>('unknown');

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const browser = detectBrowser();
    setBrowserType(browser);

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    if (browser === 'firefox') {
      // Firefox doesn't fire beforeinstallprompt — show manual instructions after a short delay
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Chrome-like browsers: wait for the native prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  // Firefox / Floorp manual install instructions
  if (browserType === 'firefox') {
    return (
      <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-primary/20 to-orange-500/20">
              <BookmarkPlus className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-bold text-sm">Install Tyrannosocial</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  To install on Firefox/Floorp:
                </p>
                <ol className="text-xs text-muted-foreground mt-1.5 space-y-1 list-decimal list-inside">
                  <li>
                    Click the <Menu className="inline h-3 w-3 mx-0.5 align-middle" /> menu (top-right)
                  </li>
                  <li>Select <strong>"Install site as app…"</strong></li>
                  <li>Click <strong>"Install"</strong> to confirm</li>
                </ol>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Maybe later
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Chrome-like browsers: native prompt available
  return (
    <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-primary/20 to-orange-500/20">
            <Download className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-bold text-sm">Install Tyrannosocial</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Install this app for a better experience. Works offline and launches like a native app!
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

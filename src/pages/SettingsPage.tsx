import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RelayListManager } from '@/components/RelayListManager';
import { TopicFilterManager } from '@/components/TopicFilterManager';
import { PersonalizedThemeManager } from '@/components/PersonalizedThemeManager';
import { LoginArea } from '@/components/auth/LoginArea';
import LoginDialog from '@/components/auth/LoginDialog';
import { ColorThemeSelector } from '@/components/ColorThemeSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Moon,
  Sun,
  Wifi,
  AlertTriangle,
  ArrowLeft,
  Type,
  Sparkles,
  User,
  Check,
  Mail,
  Link as LinkIcon,
  Zap,
  UserPlus,
  LogOut,
  Filter,
  Palette,
} from 'lucide-react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

const fontOptions = [
  { value: 'inter', label: 'Inter (Default)', family: 'Inter Variable, Inter, system-ui, sans-serif' },
  { value: 'system', label: 'System', family: 'system-ui, -apple-system, sans-serif' },
  { value: 'serif', label: 'Serif', family: 'Georgia, serif' },
  { value: 'mono', label: 'Monospace', family: 'ui-monospace, monospace' },
  { value: 'caveat', label: 'Caveat (Handwriting)', family: 'Caveat, cursive' },
  { value: 'dancing-script', label: 'Dancing Script (Elegant)', family: 'Dancing Script, cursive' },
  { value: 'pacifico', label: 'Pacifico (Playful)', family: 'Pacifico, cursive' },
  { value: 'kalam', label: 'Kalam (Casual)', family: 'Kalam, cursive' },
  { value: 'indie-flower', label: 'Indie Flower (Quirky)', family: 'Indie Flower, cursive' },
  { value: 'permanent-marker', label: 'Permanent Marker (Bold)', family: 'Permanent Marker, cursive' },
  { value: 'patrick-hand-sc', label: 'Patrick Hand SC (Comic)', family: 'Patrick Hand SC, cursive' },
];

const fontSizes = [
  { value: 'xs', label: 'Extra Small', size: '12px' },
  { value: 'sm', label: 'Small', size: '14px' },
  { value: 'base', label: 'Medium (Default)', size: '16px' },
  { value: 'lg', label: 'Large', size: '18px' },
  { value: 'xl', label: 'Extra Large', size: '20px' },
  { value: '2xl', label: 'Huge', size: '24px' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const [relaysExpanded, setRelaysExpanded] = useState(false);
  const [topicFilterExpanded, setTopicFilterExpanded] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [showPersonalizedUploader, setShowPersonalizedUploader] = useState(false);

  // Get metadata for current user (only if user exists)
  const currentUserProfile = useAuthor(currentUser?.pubkey ?? '');
  const currentMetadata: NostrMetadata | undefined = currentUser ? currentUserProfile.data?.metadata : undefined;

  useSeoMeta({
    title: 'Settings - Tyrannosocial',
    description: 'Customize your Tyrannosocial experience',
  });

  const isDark = theme === 'dark';
  const hasPersonalizedTheme = !!config.personalizedTheme;

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const toggleContentWarnings = () => {
    updateConfig((current) => ({
      ...current,
      showContentWarnings: !config.showContentWarnings,
    }));
  };

  const togglePersonalizedMode = (checked: boolean) => {
    if (checked) {
      // Show the uploader
      setShowPersonalizedUploader(true);
    } else {
      // Remove personalized theme
      updateConfig((current) => {
        const newConfig = { ...current };
        delete newConfig.personalizedTheme;
        return newConfig;
      });
      
      // Remove wallpaper from DOM
      const root = document.documentElement;
      root.classList.remove('personalized-theme');
      root.style.removeProperty('--wallpaper-url');
      
      // Hide uploader
      setShowPersonalizedUploader(false);
    }
  };

  const handleFontChange = (fontValue: string) => {
    const font = fontOptions.find(f => f.value === fontValue);
    if (font) {
      updateConfig((current) => ({
        ...current,
        fontFamily: font.family,
      }));
      // Apply to document
      document.documentElement.style.fontFamily = font.family;
    }
  };

  const handleFontSizeChange = (sizeValue: string) => {
    const size = fontSizes.find(s => s.value === sizeValue);
    if (size) {
      updateConfig((current) => ({
        ...current,
        fontSize: size.size,
      }));
      // Apply to document
      document.documentElement.style.fontSize = size.size;
    }
  };

  // Get current font and size
  const currentFont = fontOptions.find(f => f.family === config.fontFamily)?.value || 'inter';
  const currentSize = fontSizes.find(s => s.size === config.fontSize)?.value || 'base';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button and Title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 blur-xl opacity-60 animate-pulse dark:from-yellow-600 dark:via-red-900 dark:to-yellow-700 dark:opacity-50" />
                  <div className="relative p-1 bg-gradient-to-br from-rose-100/50 to-pink-100/30 rounded-full dark:from-transparent dark:to-transparent">
                    <img 
                      src={`${import.meta.env.BASE_URL}icon-512.png`} 
                      alt="Tyrannosocial Logo" 
                      className="h-10 w-10 drop-shadow-2xl filter brightness-110 rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Settings
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Customize your experience
                  </p>
                </div>
              </div>
            </div>

            {/* Login Area */}
            <LoginArea className="max-w-60 hidden sm:flex" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Account Section */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your Nostr account and profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentUser ? (
                <div className="space-y-6">
                  {/* Current Account */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Current Account</Label>
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20 shrink-0">
                        <AvatarImage src={currentMetadata?.picture} alt={currentMetadata?.name || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg">
                          {(currentMetadata?.name || currentMetadata?.display_name || genUserName(currentUser.pubkey))[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg truncate">
                            {currentMetadata?.display_name || currentMetadata?.name || genUserName(currentUser.pubkey)}
                          </h3>
                          {currentMetadata?.name && currentMetadata?.display_name && (
                            <p className="text-sm text-muted-foreground truncate">@{currentMetadata.name}</p>
                          )}
                        </div>
                        {currentMetadata?.nip05 && (
                          <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
                            <Check className="h-3 w-3" />
                            {currentMetadata.nip05}
                          </Badge>
                        )}
                        {currentMetadata?.about && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {currentMetadata.about}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {currentMetadata?.website && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <LinkIcon className="h-3 w-3" />
                              Website
                            </Badge>
                          )}
                          {(currentMetadata?.lud16 || currentMetadata?.lud06) && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Zap className="h-3 w-3" />
                              Lightning
                            </Badge>
                          )}
                        </div>
                        <div className="pt-2">
                          <code className="text-xs text-muted-foreground font-mono">
                            {nip19.npubEncode(currentUser.pubkey)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Accounts */}
                  {otherUsers.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">Other Accounts</Label>
                        <div className="space-y-2">
                          {otherUsers.map((account) => {
                            const displayName = account.metadata?.display_name || account.metadata?.name || genUserName(account.pubkey);
                            const username = account.metadata?.name || genUserName(account.pubkey);
                            const isActive = account.id === currentUser.id;

                            return (
                              <div
                                key={account.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors"
                              >
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarImage src={account.metadata?.picture} alt={displayName} />
                                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50">
                                    {displayName[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{displayName}</p>
                                  <p className="text-xs text-muted-foreground truncate">@{username}</p>
                                </div>
                                {isActive ? (
                                  <Badge variant="default" className="gap-1">
                                    <Check className="h-3 w-3" />
                                    Active
                                  </Badge>
                                ) : (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setLogin(account.id)}
                                      className="h-8"
                                    >
                                      Switch
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeLogin(account.id)}
                                      className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                      <LogOut className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Account Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/${nip19.npubEncode(currentUser.pubkey)}`)}
                      className="flex-1"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLoginDialogOpen(true)}
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    Log in to access account settings
                  </p>
                  <LoginArea className="max-w-60 mx-auto" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-rose-50/30 dark:from-card dark:to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personalized Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="personalized-toggle" className="cursor-pointer font-medium flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Personalized
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use a custom wallpaper with auto-generated colors
                  </p>
                </div>
                <Switch
                  id="personalized-toggle"
                  checked={hasPersonalizedTheme}
                  onCheckedChange={togglePersonalizedMode}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Personalized Theme Manager - show when enabled OR when user toggled it on */}
              {(hasPersonalizedTheme || showPersonalizedUploader) && (
                <>
                  <PersonalizedThemeManager />
                  <Separator />
                </>
              )}

              {/* Theme Toggle - disabled when personalized */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="theme-toggle" 
                    className={`cursor-pointer font-medium ${hasPersonalizedTheme ? 'opacity-50' : ''}`}
                  >
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {hasPersonalizedTheme 
                      ? 'Disabled in personalized mode' 
                      : 'Switch between light and dark themes'
                    }
                  </p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  disabled={hasPersonalizedTheme}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <Separator />

              {/* Theme Colors - disabled when personalized */}
              <div className="space-y-2">
                <Label className={`flex items-center gap-2 ${hasPersonalizedTheme ? 'opacity-50' : ''}`}>
                  <Sparkles className="h-4 w-4 text-primary" />
                  Theme Colors
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {hasPersonalizedTheme
                    ? 'Colors are auto-generated from your wallpaper'
                    : 'Customize the color scheme of the app'
                  }
                </p>
                {hasPersonalizedTheme ? (
                  <div className="flex gap-2 p-3 rounded-md border bg-muted/20">
                    <div
                      className="h-8 w-8 rounded-md border-2 border-border"
                      style={{ backgroundColor: config.personalizedTheme!.primaryColor }}
                    />
                    <div
                      className="h-8 w-8 rounded-md border-2 border-border"
                      style={{ backgroundColor: config.personalizedTheme!.secondaryColor }}
                    />
                    <div
                      className="h-8 w-8 rounded-md border-2 border-border"
                      style={{ backgroundColor: config.personalizedTheme!.accentColor }}
                    />
                  </div>
                ) : (
                  <ColorThemeSelector />
                )}
              </div>

              <Separator />

              {/* Font Family */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  Font Type
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your preferred font family
                </p>
                <Select value={currentFont} onValueChange={handleFontChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.family }}>
                          {font.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Font Size */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  Font Size
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Adjust the base text size
                </p>
                <Select value={currentSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content Section */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-orange-50/20 dark:from-card dark:to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Content
              </CardTitle>
              <CardDescription>
                Manage content filtering and warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="content-warnings-toggle" className="cursor-pointer font-medium">
                    Content Warnings
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show warnings for sensitive content
                  </p>
                </div>
                <Switch
                  id="content-warnings-toggle"
                  checked={config.showContentWarnings}
                  onCheckedChange={toggleContentWarnings}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Topic Filter Section */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Topic Filter
                  </CardTitle>
                  <CardDescription>
                    Block posts by keywords, hashtags, and emojis
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTopicFilterExpanded(!topicFilterExpanded)}
                >
                  {topicFilterExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            {topicFilterExpanded && (
              <CardContent>
                <TopicFilterManager />
              </CardContent>
            )}
            {!topicFilterExpanded && (
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {(config.topicFilter?.keywords.length || 0) + (config.topicFilter?.hashtags.length || 0) + (config.topicFilter?.emojis.length || 0)} filters active
                  </p>
                  {config.topicFilter && (config.topicFilter.keywords.length > 0 || config.topicFilter.hashtags.length > 0 || config.topicFilter.emojis.length > 0) && (
                    <div className="space-y-1">
                      {config.topicFilter.keywords.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Keywords: {config.topicFilter.keywords.slice(0, 3).join(', ')}
                          {config.topicFilter.keywords.length > 3 && ` +${config.topicFilter.keywords.length - 3} more`}
                        </p>
                      )}
                      {config.topicFilter.hashtags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Hashtags: #{config.topicFilter.hashtags.slice(0, 3).join(', #')}
                          {config.topicFilter.hashtags.length > 3 && ` +${config.topicFilter.hashtags.length - 3} more`}
                        </p>
                      )}
                      {config.topicFilter.emojis.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Emojis: {config.topicFilter.emojis.slice(0, 5).join(' ')}
                          {config.topicFilter.emojis.length > 5 && ` +${config.topicFilter.emojis.length - 5} more`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Relays Section */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-blue-50/20 dark:from-card dark:to-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-primary" />
                    Relays
                  </CardTitle>
                  <CardDescription>
                    Manage your Nostr relay connections
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRelaysExpanded(!relaysExpanded)}
                >
                  {relaysExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            {relaysExpanded && (
              <CardContent>
                <RelayListManager />
              </CardContent>
            )}
            {!relaysExpanded && (
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {config.relayMetadata.relays.length} {config.relayMetadata.relays.length === 1 ? 'relay' : 'relays'} configured
                  </p>
                  <div className="space-y-1">
                    {config.relayMetadata.relays.slice(0, 3).map((relay) => (
                      <div key={relay.url} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm shadow-green-500/50 animate-pulse" />
                        <span className="text-xs font-mono text-muted-foreground">
                          {relay.url.replace('wss://', '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>

      {/* Login Dialog */}
      <LoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLogin={() => setLoginDialogOpen(false)}
      />
    </div>
  );
}

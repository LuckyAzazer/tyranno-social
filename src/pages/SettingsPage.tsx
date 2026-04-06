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
import { AppearancePanel } from '@/components/AppearancePanel';
import { BackupManager } from '@/components/BackupManager';
import { LoginArea } from '@/components/auth/LoginArea';

import {
  Moon,
  Sun,
  Wifi,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  User,
  Check,
  Mail,
  Link as LinkIcon,
  Zap,
  LogOut,
  Filter,
  Database,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';



export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const [relaysExpanded, setRelaysExpanded] = useState(false);
  const [topicFilterExpanded, setTopicFilterExpanded] = useState(false);
  const [backupExpanded, setBackupExpanded] = useState(false);

  // Get metadata for current user (only if user exists)
  const currentUserProfile = useAuthor(currentUser?.pubkey ?? '');
  const currentMetadata: NostrMetadata | undefined = currentUser ? currentUserProfile.data?.metadata : undefined;

  useSeoMeta({
    title: 'Settings - Tyrannosocial',
    description: 'Customize your Tyrannosocial experience',
  });

  const isDark = theme === 'dark';

  const toggleContentWarnings = () => {
    updateConfig((current) => ({
      ...current,
      showContentWarnings: !config.showContentWarnings,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10" />
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="shrink-0 -ml-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 blur-xl opacity-60 animate-pulse dark:opacity-50" />
                  <div className="relative p-0.5 bg-gradient-to-br from-rose-100/50 to-pink-100/30 rounded-full dark:from-transparent dark:to-transparent">
                    <img
                      src="/icon-512.png"
                      alt="Tyrannosocial Logo"
                      className="h-8 w-8 drop-shadow-2xl filter brightness-110 rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">Settings</h1>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    Customize your experience
                  </p>
                </div>
              </div>
            </div>

            {/* Login area — visible on all sizes; LoginArea handles add-account internally */}
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-5xl mx-auto pb-24">
        <div className="space-y-5">

          {/* ── Account ── */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Account
              </CardTitle>
              <CardDescription className="text-xs">
                Manage your Nostr account and profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentUser ? (
                <div className="space-y-4">
                  {/* Current Account */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 shrink-0">
                      <AvatarImage src={currentMetadata?.picture} alt={currentMetadata?.name || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg">
                        {(currentMetadata?.name || currentMetadata?.display_name || genUserName(currentUser.pubkey))[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="font-semibold text-base truncate">
                        {currentMetadata?.display_name || currentMetadata?.name || genUserName(currentUser.pubkey)}
                      </h3>
                      {currentMetadata?.name && currentMetadata?.display_name && (
                        <p className="text-xs text-muted-foreground truncate">@{currentMetadata.name}</p>
                      )}
                      {currentMetadata?.nip05 && (
                        <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
                          <Check className="h-3 w-3" />
                          {currentMetadata.nip05}
                        </Badge>
                      )}
                      {currentMetadata?.about && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{currentMetadata.about}</p>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        {currentMetadata?.website && (
                          <Badge variant="outline" className="gap-1 text-xs py-0">
                            <LinkIcon className="h-2.5 w-2.5" />
                            Website
                          </Badge>
                        )}
                        {(currentMetadata?.lud16 || currentMetadata?.lud06) && (
                          <Badge variant="outline" className="gap-1 text-xs py-0">
                            <Zap className="h-2.5 w-2.5" />
                            Lightning
                          </Badge>
                        )}
                      </div>
                      <code className="text-[10px] text-muted-foreground font-mono block truncate">
                        {nip19.npubEncode(currentUser.pubkey)}
                      </code>
                    </div>
                  </div>

                  {/* Other Accounts */}
                  {otherUsers.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs font-semibold mb-2 block text-muted-foreground uppercase tracking-wide">Other Accounts</Label>
                        <div className="space-y-2">
                          {otherUsers.map((account) => {
                            const displayName = account.metadata?.display_name || account.metadata?.name || genUserName(account.pubkey);
                            const username = account.metadata?.name || genUserName(account.pubkey);
                            const isActive = account.id === currentUser.id;

                            return (
                              <div
                                key={account.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors"
                              >
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={account.metadata?.picture} alt={displayName} />
                                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-sm">
                                    {displayName[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{displayName}</p>
                                  <p className="text-xs text-muted-foreground truncate">@{username}</p>
                                </div>
                                {isActive ? (
                                  <Badge variant="default" className="gap-1 text-xs shrink-0">
                                    <Check className="h-3 w-3" />
                                    Active
                                  </Badge>
                                ) : (
                                  <div className="flex gap-1 shrink-0">
                                    <Button variant="outline" size="sm" onClick={() => setLogin(account.id)} className="h-7 text-xs px-2">
                                      Switch
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeLogin(account.id)}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                      <LogOut className="h-3.5 w-3.5" />
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
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/${nip19.npubEncode(currentUser.pubkey)}`)}
                    className="w-full"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4 text-sm">Log in to access account settings</p>
                  <LoginArea className="max-w-60 mx-auto" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Appearance ── */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-rose-50/30 dark:from-card dark:to-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                Appearance
              </CardTitle>
              <CardDescription className="text-xs">
                Customize the look and feel — changes apply live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppearancePanel />
            </CardContent>
          </Card>

          {/* ── Content ── */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-orange-50/20 dark:from-card dark:to-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Content
              </CardTitle>
              <CardDescription className="text-xs">Manage content filtering and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="content-warnings-toggle" className="cursor-pointer font-medium text-sm">
                    Content Warnings
                  </Label>
                  <p className="text-xs text-muted-foreground">Show warnings for sensitive content</p>
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

          {/* ── Topic Filter ── */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card">
            <CardHeader className="pb-0">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setTopicFilterExpanded(!topicFilterExpanded)}
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4 text-primary" />
                    Topic Filter
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Block posts by keywords, hashtags, and emojis</CardDescription>
                </div>
                {topicFilterExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                }
              </button>
            </CardHeader>
            <CardContent className="pt-3">
              {topicFilterExpanded ? (
                <TopicFilterManager />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {(config.topicFilter?.keywords.length || 0) + (config.topicFilter?.hashtags.length || 0) + (config.topicFilter?.emojis.length || 0)} filters active
                  {config.topicFilter?.keywords && config.topicFilter.keywords.length > 0 && (
                    <span className="block mt-0.5">Keywords: {config.topicFilter.keywords.slice(0, 3).join(', ')}{config.topicFilter.keywords.length > 3 ? ` +${config.topicFilter.keywords.length - 3} more` : ''}</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Relays ── */}
          <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-blue-50/20 dark:from-card dark:to-card">
            <CardHeader className="pb-0">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setRelaysExpanded(!relaysExpanded)}
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wifi className="h-4 w-4 text-primary" />
                    Relays
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Manage your Nostr relay connections</CardDescription>
                </div>
                {relaysExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                }
              </button>
            </CardHeader>
            <CardContent className="pt-3">
              {relaysExpanded ? (
                <RelayListManager />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{config.relayMetadata.relays.length} {config.relayMetadata.relays.length === 1 ? 'relay' : 'relays'} configured</p>
                  {config.relayMetadata.relays.slice(0, 3).map((relay) => (
                    <div key={relay.url} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-sm shadow-green-500/50 animate-pulse shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground truncate">{relay.url.replace('wss://', '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Backup & Export ── */}
          <Card className="border-border/50 dark:border-transparent">
            <CardHeader className="pb-0">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setBackupExpanded(!backupExpanded)}
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4 text-primary" />
                    Backup & Export
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Export and restore your Nostr data</CardDescription>
                </div>
                {backupExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                }
              </button>
            </CardHeader>
            <CardContent className="pt-3">
              {backupExpanded ? (
                <BackupManager />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Download a complete backup of your posts, profile, and bookmarks
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

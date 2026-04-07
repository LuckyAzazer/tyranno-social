import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { useNSFWFilter } from '@/hooks/useNSFWFilter';
import { useMutedUsers } from '@/hooks/useMutedUsers';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { genUserName } from '@/lib/genUserName';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RelayListManager } from '@/components/RelayListManager';
import { TopicFilterManager } from '@/components/TopicFilterManager';
import { AppearancePanel } from '@/components/AppearancePanel';
import { BackupManager } from '@/components/BackupManager';
import { LoginArea } from '@/components/auth/LoginArea';
import { useNsec } from '@/hooks/useNsec';

import {
  Moon, Sun, Wifi, AlertTriangle, ArrowLeft,
  User, Check, Link as LinkIcon, Zap, LogOut,
  Filter, Database, ChevronRight, ChevronDown,
  KeyRound, Copy, Download, Eye, EyeOff, ShieldAlert,
  ShieldCheck, VolumeX, Columns, Info, ExternalLink,
  Columns2, Columns3, LayoutGrid, X,
} from 'lucide-react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

// ── Muted user row ────────────────────────────────────────────────────────────

function MutedUserRow({ pubkey, onUnmute }: { pubkey: string; onUnmute: () => void }) {
  const author = useAuthor(pubkey);
  const meta = author.data?.metadata;
  const displayName = meta?.display_name ?? meta?.name ?? genUserName(pubkey);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={meta?.picture} alt={displayName} />
        <AvatarFallback className="text-xs bg-muted">{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        {meta?.name && meta.display_name && (
          <p className="text-xs text-muted-foreground truncate">@{meta.name}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUnmute}
        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-3.5 w-3.5" />
        Unmute
      </Button>
    </div>
  );
}

// ── Reusable collapsible section ─────────────────────────────────────────────

function CollapsibleSection({
  icon: Icon,
  title,
  description,
  expanded,
  onToggle,
  children,
  summary,
  cardClass = '',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  summary?: React.ReactNode;
  cardClass?: string;
}) {
  return (
    <Card className={`border-border/50 dark:border-transparent overflow-hidden ${cardClass}`}>
      <button
        className="flex items-center justify-between w-full text-left px-4 pt-4 pb-3 gap-3"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {expanded
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>
      <div className="px-4 pb-4">
        {expanded ? children : summary}
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const { toast } = useToast();
  const nsec = useNsec();
  const { shouldFilter, filterEnabled, setFilterEnabled, canToggle } = useNSFWFilter();
  const { mutedPubkeys, unmute } = useMutedUsers();
  const [columns, setColumns] = useLocalStorage<number>('masonry-columns', 3);
  const [relaysExpanded, setRelaysExpanded] = useState(false);
  const [topicFilterExpanded, setTopicFilterExpanded] = useState(false);
  const [backupExpanded, setBackupExpanded] = useState(false);
  const [mutedExpanded, setMutedExpanded] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  const handleCopyNsec = async () => {
    if (!nsec) return;
    try {
      await navigator.clipboard.writeText(nsec);
      toast({ title: 'Copied!', description: 'Private key copied to clipboard — store it somewhere safe.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy the key manually.', variant: 'destructive' });
    }
  };

  const handleDownloadNsec = () => {
    if (!nsec) return;
    const blob = new Blob([nsec], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nostr-private-key.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Keep this file private and backed up securely.' });
  };

  const currentUserProfile = useAuthor(currentUser?.pubkey ?? '');
  const currentMetadata: NostrMetadata | undefined = currentUser
    ? currentUserProfile.data?.metadata
    : undefined;

  useSeoMeta({
    title: 'Settings - Tyrannosocial',
    description: 'Customize your Tyrannosocial experience',
  });

  const toggleContentWarnings = () =>
    updateConfig((c) => ({ ...c, showContentWarnings: !c.showContentWarnings }));

  const activeFilterCount =
    (config.topicFilter?.keywords.length ?? 0) +
    (config.topicFilter?.hashtags.length ?? 0) +
    (config.topicFilter?.emojis.length ?? 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-background via-rose-50/30 to-pink-50/40 dark:from-background dark:via-background dark:to-primary/5">

      {/* Header */}
      <header className="sticky top-0 z-40 isolate relative border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-rose-500/5 to-primary/10 -z-10 pointer-events-none" />
        <div className="px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0 -ml-1"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-bold truncate">Settings</h1>
          </div>
          <LoginArea className="max-w-[180px] shrink-0" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 py-5 max-w-5xl mx-auto pb-24 overflow-x-hidden space-y-4">

        {/* ── Account ── */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card overflow-hidden">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary shrink-0" />
              Account
            </CardTitle>
            <CardDescription className="text-xs">
              Manage your Nostr account and profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4">
            {currentUser ? (
              <div className="space-y-4">
                {/* Current account card */}
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                      <AvatarImage src={currentMetadata?.picture} alt={currentMetadata?.name ?? 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-base">
                        {(currentMetadata?.display_name ?? currentMetadata?.name ?? genUserName(currentUser.pubkey))[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {currentMetadata?.display_name ?? currentMetadata?.name ?? genUserName(currentUser.pubkey)}
                      </h3>
                      {currentMetadata?.name && currentMetadata?.display_name && (
                        <p className="text-xs text-muted-foreground truncate">@{currentMetadata.name}</p>
                      )}
                    </div>
                  </div>

                  {currentMetadata?.about && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{currentMetadata.about}</p>
                  )}

                  <div className="flex gap-1.5 flex-wrap">
                    {currentMetadata?.nip05 && (
                      <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800 max-w-full">
                        <Check className="h-3 w-3 shrink-0" />
                        <span className="truncate">{currentMetadata.nip05}</span>
                      </Badge>
                    )}
                    {currentMetadata?.website && (
                      <Badge variant="outline" className="gap-1 text-xs py-0">
                        <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                        Website
                      </Badge>
                    )}
                    {(currentMetadata?.lud16 ?? currentMetadata?.lud06) && (
                      <Badge variant="outline" className="gap-1 text-xs py-0">
                        <Zap className="h-2.5 w-2.5 shrink-0" />
                        Lightning
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground font-mono break-all leading-relaxed">
                      {nip19.npubEncode(currentUser.pubkey)}
                    </p>
                  </div>
                </div>

                {/* Other logged-in accounts */}
                {otherUsers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs font-semibold mb-2 block text-muted-foreground uppercase tracking-wide">
                        Other Accounts
                      </Label>
                      <div className="space-y-2">
                        {otherUsers.map((account) => {
                          const displayName = account.metadata?.display_name ?? account.metadata?.name ?? genUserName(account.pubkey);
                          const username = account.metadata?.name ?? genUserName(account.pubkey);
                          return (
                            <div
                              key={account.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors"
                            >
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={account.metadata?.picture} alt={displayName} />
                                <AvatarFallback className="bg-muted text-sm">
                                  {displayName[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">@{username}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setLogin(account.id)} className="h-7 text-xs px-2">
                                  Switch
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLogin(account.id)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                  aria-label="Remove account"
                                >
                                  <LogOut className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/${nip19.npubEncode(currentUser.pubkey)}`)}
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

        {/* ── Private Key Backup ── */}
        <Card className="border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-card to-orange-50/30 dark:from-card dark:to-orange-950/10 overflow-hidden">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-orange-500 shrink-0" />
              Private Key Backup
            </CardTitle>
            <CardDescription className="text-xs">
              Save your secret key somewhere safe — it's the only way to recover your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            {nsec ? (
              <>
                {/* Warning banner */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/40">
                  <ShieldAlert className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                    <span className="font-semibold">Never share this key with anyone.</span> Anyone with your private key has full control of your Nostr identity. Store it in a password manager or secure offline location.
                  </p>
                </div>

                {/* Key display */}
                <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your nsec key</span>
                    <button
                      onClick={() => setKeyVisible((v) => !v)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {keyVisible ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <code className="block text-xs font-mono break-all leading-relaxed text-foreground/80 select-all">
                    {keyVisible ? nsec : '•'.repeat(Math.min(nsec.length, 64))}
                  </code>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-orange-200/60 hover:border-orange-400/60 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                        <Copy className="h-3.5 w-3.5" />
                        Copy Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-orange-500" />
                          Copy Private Key?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Your private key gives full access to your Nostr identity. Only copy it if you're pasting it into a secure location like a password manager. Never share it with anyone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCopyNsec} className="bg-orange-500 hover:bg-orange-600 text-white">
                          Copy Anyway
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-orange-200/60 hover:border-orange-400/60 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-orange-500" />
                          Download Private Key?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will save your private key as a plain text file. Store it in a secure, encrypted location — not in cloud storage or shared drives. Anyone who finds this file can access your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDownloadNsec} className="bg-orange-500 hover:bg-orange-600 text-white">
                          Download Anyway
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : (
              /* Not logged in with nsec — explain why the feature is unavailable */
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                <KeyRound className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Private key backup is only available when you log in by entering your{' '}
                  <span className="font-semibold text-foreground">nsec private key</span> directly.
                  If you logged in with a browser extension or a remote signer, your key is managed externally and is not accessible here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Appearance ── */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-rose-50/30 dark:from-card dark:to-card overflow-hidden">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              {theme === 'dark'
                ? <Moon className="h-4 w-4 text-primary shrink-0" />
                : <Sun className="h-4 w-4 text-primary shrink-0" />}
              Appearance
            </CardTitle>
            <CardDescription className="text-xs">
              Customize the look and feel — changes apply live
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <AppearancePanel />
          </CardContent>
        </Card>

        {/* ── Feed & Display ── */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-sky-50/20 dark:from-card dark:to-card overflow-hidden">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Columns className="h-4 w-4 text-primary shrink-0" />
              Feed & Display
            </CardTitle>
            <CardDescription className="text-xs">Control how posts are laid out and shown</CardDescription>
          </CardHeader>
          <CardContent className="px-4 space-y-5">
            {/* Default columns */}
            <div className="space-y-2">
              <Label className="font-medium text-sm">Default Feed Columns</Label>
              <p className="text-xs text-muted-foreground">How many columns to show in the masonry grid</p>
              <div className="flex gap-2">
                {[
                  { value: 1, icon: Columns2,   label: '1' },
                  { value: 2, icon: Columns2,   label: '2' },
                  { value: 3, icon: Columns3,   label: '3' },
                  { value: 4, icon: LayoutGrid, label: '4' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setColumns(value)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                      columns === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Content warnings */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="content-warnings-toggle" className="cursor-pointer font-medium text-sm">
                  Content Warnings
                </Label>
                <p className="text-xs text-muted-foreground">Show blur/warnings for sensitive posts</p>
              </div>
              <Switch
                id="content-warnings-toggle"
                checked={config.showContentWarnings}
                onCheckedChange={toggleContentWarnings}
                className="data-[state=checked]:bg-primary shrink-0"
              />
            </div>

            <Separator />

            {/* NSFW filter */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="nsfw-filter-toggle" className="cursor-pointer font-medium text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  NSFW Filter
                </Label>
                <p className="text-xs text-muted-foreground">
                  {canToggle
                    ? 'Automatically hide explicit or adult content'
                    : 'Log in to control this setting — always on for guests'}
                </p>
              </div>
              <Switch
                id="nsfw-filter-toggle"
                checked={shouldFilter}
                onCheckedChange={(v) => canToggle && setFilterEnabled(v)}
                disabled={!canToggle}
                className="data-[state=checked]:bg-primary shrink-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Muted Users ── */}
        <CollapsibleSection
          icon={VolumeX}
          title="Muted Users"
          description="People whose posts are hidden from your feeds"
          expanded={mutedExpanded}
          onToggle={() => setMutedExpanded((v) => !v)}
          cardClass="bg-gradient-to-br from-card to-red-50/10 dark:from-card dark:to-card"
          summary={
            <p className="text-xs text-muted-foreground">
              {mutedPubkeys.length === 0
                ? 'No muted users'
                : `${mutedPubkeys.length} ${mutedPubkeys.length === 1 ? 'user' : 'users'} muted`}
            </p>
          }
        >
          {mutedPubkeys.length === 0 ? (
            <div className="flex items-center gap-2.5 py-3 text-sm text-muted-foreground">
              <VolumeX className="h-4 w-4 shrink-0 opacity-50" />
              You haven't muted anyone yet.
            </div>
          ) : (
            <div className="space-y-2">
              {mutedPubkeys.map((pubkey) => (
                <MutedUserRow key={pubkey} pubkey={pubkey} onUnmute={() => unmute(pubkey)} />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* ── Topic Filter ── */}
        <CollapsibleSection
          icon={Filter}
          title="Topic Filter"
          description="Block posts by keywords, hashtags, and emojis"
          expanded={topicFilterExpanded}
          onToggle={() => setTopicFilterExpanded((v) => !v)}
          cardClass="bg-gradient-to-br from-card to-purple-50/20 dark:from-card dark:to-card"
          summary={
            <p className="text-xs text-muted-foreground">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
              {config.topicFilter?.keywords && config.topicFilter.keywords.length > 0 && (
                <span className="block mt-0.5 truncate">
                  Keywords: {config.topicFilter.keywords.slice(0, 3).join(', ')}
                  {config.topicFilter.keywords.length > 3 && ` +${config.topicFilter.keywords.length - 3} more`}
                </span>
              )}
            </p>
          }
        >
          <TopicFilterManager />
        </CollapsibleSection>

        {/* ── Relays ── */}
        <CollapsibleSection
          icon={Wifi}
          title="Relays"
          description="Manage your Nostr relay connections"
          expanded={relaysExpanded}
          onToggle={() => setRelaysExpanded((v) => !v)}
          cardClass="bg-gradient-to-br from-card to-blue-50/20 dark:from-card dark:to-card"
          summary={
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {config.relayMetadata.relays.length} {config.relayMetadata.relays.length === 1 ? 'relay' : 'relays'} configured
              </p>
              {config.relayMetadata.relays.slice(0, 3).map((relay) => (
                <div key={relay.url} className="flex items-center gap-2 min-w-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {relay.url.replace('wss://', '')}
                  </span>
                </div>
              ))}
            </div>
          }
        >
          <RelayListManager />
        </CollapsibleSection>

        {/* ── Backup & Export ── */}
        <CollapsibleSection
          icon={Database}
          title="Backup & Export"
          description="Export and restore your Nostr data"
          expanded={backupExpanded}
          onToggle={() => setBackupExpanded((v) => !v)}
          summary={
            <p className="text-xs text-muted-foreground">
              Download a complete backup of your posts, profile, and bookmarks
            </p>
          }
        >
          <BackupManager />
        </CollapsibleSection>

        {/* ── About ── */}
        <Card className="border-border/50 dark:border-transparent bg-gradient-to-br from-card to-primary/5 overflow-hidden">
          <CardHeader className="pb-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-primary shrink-0" />
              About Tyrannosocial
            </CardTitle>
            <CardDescription className="text-xs">
              A beautiful Nostr social experience
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
              <img src="/icon-512.png" alt="Tyrannosocial" className="h-12 w-12 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Tyrannosocial</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A masonry-style Nostr client. Decentralized, open, and yours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <a
                href="https://nostr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wifi className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Nostr Protocol</p>
                    <p className="text-xs text-muted-foreground">Learn about the decentralized protocol powering this app</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
              </a>

              <a
                href="https://shakespeare.diy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base leading-none shrink-0">🎭</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Built with Shakespeare</p>
                    <p className="text-xs text-muted-foreground">The AI-powered website builder used to create this app</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
              </a>

              <a
                href="https://github.com/luckyazazer/tyranno-social"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Source Code</p>
                    <p className="text-xs text-muted-foreground">View and contribute on GitHub</p>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
              </a>
            </div>
          </CardContent>
        </Card>

      </main>

    </div>
  );
}

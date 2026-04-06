import { useState, useEffect } from 'react';
import { Plus, X, Wifi, Settings, Mail, Lock, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useRelayStatus } from '@/hooks/useRelayStatus';
import type { RelayStatus } from '@/hooks/useRelayStatus';

interface Relay {
  url: string;
  read: boolean;
  write: boolean;
}

const statusStyles: Record<RelayStatus, { dot: string; label: string }> = {
  connecting: {
    dot: 'bg-amber-400 animate-pulse shadow-amber-400/60',
    label: 'Connecting…',
  },
  connected: {
    dot: 'bg-emerald-500 shadow-emerald-500/60',
    label: 'Connected',
  },
  error: {
    dot: 'bg-red-500 shadow-red-500/60',
    label: 'Unreachable',
  },
};

function StatusDot({ url }: { url: string }) {
  const status = useRelayStatus(url);
  const { dot, label } = statusStyles[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`shrink-0 h-2 w-2 rounded-full shadow-sm ${dot}`}
            aria-label={label}
          />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RelayRow({
  relay,
  onToggleRead,
  onToggleWrite,
  onRemove,
  removable,
  renderRelayUrl,
  local = false,
}: {
  relay: Relay;
  onToggleRead: () => void;
  onToggleWrite: () => void;
  onRemove: () => void;
  removable: boolean;
  renderRelayUrl: (url: string) => string;
  local?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/20">
      {local
        ? <HardDrive className="h-4 w-4 text-amber-500 shrink-0" />
        : <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
      }
      <StatusDot url={relay.url} />
      <span className="font-mono text-sm flex-1 truncate" title={relay.url}>
        {renderRelayUrl(relay.url)}
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={`read-${relay.url}`} className="text-sm cursor-pointer">Read</Label>
              <Switch
                id={`read-${relay.url}`}
                checked={relay.read}
                onCheckedChange={onToggleRead}
                className="data-[state=checked]:bg-green-500 scale-75"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`write-${relay.url}`} className="text-sm cursor-pointer">Write</Label>
              <Switch
                id={`write-${relay.url}`}
                checked={relay.write}
                onCheckedChange={onToggleWrite}
                className="data-[state=checked]:bg-blue-500 scale-75"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="size-5 text-muted-foreground hover:text-destructive hover:bg-transparent shrink-0"
        disabled={!removable}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RelayListManager() {
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // General relays state
  const [relays, setRelays] = useState<Relay[]>(config.relayMetadata.relays);
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [newLocalRelayUrl, setNewLocalRelayUrl] = useState('');

  // DM inbox relays state
  const [dmRelays, setDmRelays] = useState<string[]>(config.dmInboxRelays?.relays || []);
  const [newDmRelayUrl, setNewDmRelayUrl] = useState('');

  // Private home relays state
  const [privateRelays, setPrivateRelays] = useState<string[]>(config.privateHomeRelays?.relays || []);
  const [newPrivateRelayUrl, setNewPrivateRelayUrl] = useState('');

  // Sync local state with config when it changes
  useEffect(() => {
    setRelays(config.relayMetadata.relays);
  }, [config.relayMetadata.relays]);

  useEffect(() => {
    setDmRelays(config.dmInboxRelays?.relays || []);
  }, [config.dmInboxRelays?.relays]);

  useEffect(() => {
    setPrivateRelays(config.privateHomeRelays?.relays || []);
  }, [config.privateHomeRelays?.relays]);

  const normalizeRelayUrl = (url: string): string => {
    url = url.trim();
    try {
      return new URL(url).toString();
    } catch {
      try {
        return new URL(`wss://${url}`).toString();
      } catch {
        return url;
      }
    }
  };

  const isValidRelayUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    const normalized = normalizeRelayUrl(trimmed);
    try {
      const parsed = new URL(normalized);
      return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
    } catch {
      return false;
    }
  };

  /** Returns true for localhost / RFC-1918 / loopback addresses */
  const isLocalRelayUrl = (url: string): boolean => {
    try {
      const { hostname, protocol } = new URL(url);
      if (protocol === 'ws:') return true; // ws:// is almost always local
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        /^192\.168\./.test(hostname) ||
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      );
    } catch {
      return false;
    }
  };

  const LOCAL_PRESETS = [
    { label: 'localhost:4869', url: 'ws://localhost:4869' },
    { label: 'localhost:7777', url: 'ws://localhost:7777' },
    { label: 'localhost:8080', url: 'ws://localhost:8080' },
    { label: 'localhost:3000', url: 'ws://localhost:3000' },
  ];

  const localRelays  = relays.filter(r => isLocalRelayUrl(r.url));
  const remoteRelays = relays.filter(r => !isLocalRelayUrl(r.url));

  // General relays handlers
  const handleAddRelay = () => {
    if (!isValidRelayUrl(newRelayUrl)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid relay URL (e.g., wss://relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    const normalized = normalizeRelayUrl(newRelayUrl);

    if (relays.some(r => r.url === normalized)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    const newRelays = [...relays, { url: normalized, read: true, write: true }];
    setRelays(newRelays);
    setNewRelayUrl('');

    saveRelays(newRelays);
  };

  const handleRemoveRelay = (url: string) => {
    const newRelays = relays.filter(r => r.url !== url);
    setRelays(newRelays);
    saveRelays(newRelays);
  };

  const handleToggleRead = (url: string) => {
    const newRelays = relays.map(r =>
      r.url === url ? { ...r, read: !r.read } : r
    );
    setRelays(newRelays);
    saveRelays(newRelays);
  };

  const handleToggleWrite = (url: string) => {
    const newRelays = relays.map(r =>
      r.url === url ? { ...r, write: !r.write } : r
    );
    setRelays(newRelays);
    saveRelays(newRelays);
  };

  const saveRelays = (newRelays: Relay[]) => {
    const now = Math.floor(Date.now() / 1000);

    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: newRelays,
        updatedAt: now,
      },
    }));

    if (user) {
      publishNIP65RelayList(newRelays);
    }
  };

  const publishNIP65RelayList = (relayList: Relay[]) => {
    const tags = relayList.map(relay => {
      if (relay.read && relay.write) {
        return ['r', relay.url];
      } else if (relay.read) {
        return ['r', relay.url, 'read'];
      } else if (relay.write) {
        return ['r', relay.url, 'write'];
      }
      return null;
    }).filter((tag): tag is string[] => tag !== null);

    publishEvent(
      {
        kind: 10002,
        content: '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Relay list published',
            description: 'Your relay list has been published to Nostr.',
          });
        },
        onError: (error) => {
          console.error('Failed to publish relay list:', error);
          toast({
            title: 'Failed to publish relay list',
            description: 'There was an error publishing your relay list to Nostr.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Local relay handler — same underlying array, just prefills ws://
  const handleAddLocalRelay = (urlOverride?: string) => {
    const raw = urlOverride ?? newLocalRelayUrl;
    if (!isValidRelayUrl(raw)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid local relay URL (e.g., ws://localhost:4869)',
        variant: 'destructive',
      });
      return;
    }
    const normalized = normalizeRelayUrl(raw);
    if (relays.some(r => r.url === normalized)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list.',
        variant: 'destructive',
      });
      return;
    }
    const newRelays = [...relays, { url: normalized, read: true, write: true }];
    setRelays(newRelays);
    if (!urlOverride) setNewLocalRelayUrl('');
    saveRelays(newRelays);
  };

  // DM inbox relays handlers
  const handleAddDmRelay = () => {
    if (!isValidRelayUrl(newDmRelayUrl)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid relay URL (e.g., wss://relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    const normalized = normalizeRelayUrl(newDmRelayUrl);

    if (dmRelays.includes(normalized)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your DM inbox list.',
        variant: 'destructive',
      });
      return;
    }

    const newDmRelays = [...dmRelays, normalized];
    setDmRelays(newDmRelays);
    setNewDmRelayUrl('');

    saveDmRelays(newDmRelays);
  };

  const handleRemoveDmRelay = (url: string) => {
    const newDmRelays = dmRelays.filter(r => r !== url);
    setDmRelays(newDmRelays);
    saveDmRelays(newDmRelays);
  };

  const saveDmRelays = (newDmRelays: string[]) => {
    const now = Math.floor(Date.now() / 1000);

    updateConfig((current) => ({
      ...current,
      dmInboxRelays: {
        relays: newDmRelays,
        updatedAt: now,
      },
    }));

    if (user) {
      publishDmInboxRelays(newDmRelays);
    }
  };

  const publishDmInboxRelays = (relayList: string[]) => {
    const tags = relayList.map(url => ['relay', url]);

    publishEvent(
      {
        kind: 10050,
        content: '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'DM inbox relays published',
            description: 'Your DM inbox relay list has been published to Nostr.',
          });
        },
        onError: (error) => {
          console.error('Failed to publish DM inbox relays:', error);
          toast({
            title: 'Failed to publish DM inbox relays',
            description: 'There was an error publishing your DM inbox relay list.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Private home relays handlers
  const handleAddPrivateRelay = () => {
    if (!isValidRelayUrl(newPrivateRelayUrl)) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid relay URL (e.g., wss://relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    const normalized = normalizeRelayUrl(newPrivateRelayUrl);

    if (privateRelays.includes(normalized)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your private home list.',
        variant: 'destructive',
      });
      return;
    }

    const newPrivateRelays = [...privateRelays, normalized];
    setPrivateRelays(newPrivateRelays);
    setNewPrivateRelayUrl('');

    savePrivateRelays(newPrivateRelays);
  };

  const handleRemovePrivateRelay = (url: string) => {
    const newPrivateRelays = privateRelays.filter(r => r !== url);
    setPrivateRelays(newPrivateRelays);
    savePrivateRelays(newPrivateRelays);
  };

  const savePrivateRelays = async (newPrivateRelays: string[]) => {
    const now = Math.floor(Date.now() / 1000);

    updateConfig((current) => ({
      ...current,
      privateHomeRelays: {
        relays: newPrivateRelays,
        updatedAt: now,
      },
    }));

    if (user && user.signer.nip44) {
      try {
        await publishPrivateHomeRelays(newPrivateRelays);
      } catch (error) {
        console.error('Failed to publish private home relays:', error);
        toast({
          title: 'Failed to publish private home relays',
          description: 'There was an error encrypting or publishing your private relay list.',
          variant: 'destructive',
        });
      }
    }
  };

  const publishPrivateHomeRelays = async (relayList: string[]) => {
    if (!user || !user.signer.nip44) {
      toast({
        title: 'Encryption not supported',
        description: 'Please upgrade your signer extension to support NIP-44 encryption.',
        variant: 'destructive',
      });
      return;
    }

    const tags = relayList.map(url => ['relay', url]);
    const relayTagsJson = JSON.stringify(tags);

    // Encrypt the relay tags with NIP-44
    const encryptedContent = await user.signer.nip44.encrypt(user.pubkey, relayTagsJson);

    publishEvent(
      {
        kind: 10013,
        content: encryptedContent,
        tags: [],
      },
      {
        onSuccess: () => {
          toast({
            title: 'Private home relays published',
            description: 'Your private relay list has been encrypted and published to Nostr.',
          });
        },
        onError: (error) => {
          console.error('Failed to publish private home relays:', error);
          toast({
            title: 'Failed to publish private home relays',
            description: 'There was an error publishing your private relay list.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const renderRelayUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'wss:') {
        if (parsed.pathname === '/') {
          return parsed.host;
        } else {
          return parsed.host + parsed.pathname;
        }
      } else {
        return parsed.href;
      }
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-8">
      {/* General (Remote) Relays Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">General Relays</h3>
            <p className="text-sm text-muted-foreground">
              Default relays for reading and publishing events (NIP-65)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {remoteRelays.map((relay) => (
            <RelayRow
              key={relay.url}
              relay={relay}
              onToggleRead={() => handleToggleRead(relay.url)}
              onToggleWrite={() => handleToggleWrite(relay.url)}
              onRemove={() => handleRemoveRelay(relay.url)}
              removable={relays.length > 1}
              renderRelayUrl={renderRelayUrl}
            />
          ))}
          {remoteRelays.length === 0 && (
            <div className="p-4 rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
              No remote relays configured.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-relay-url" className="sr-only">Relay URL</Label>
            <Input
              id="new-relay-url"
              placeholder="wss://relay.example.com"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddRelay(); }}
            />
          </div>
          <Button onClick={handleAddRelay} disabled={!newRelayUrl.trim()} variant="outline" size="sm" className="h-10 shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <Separator />

      {/* Local Relays Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Local Relays</h3>
            <p className="text-sm text-muted-foreground">
              Relays running on your device or local network (<code className="text-xs">ws://</code>). Useful for developers and self-hosted setups.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {localRelays.map((relay) => (
            <RelayRow
              key={relay.url}
              relay={relay}
              onToggleRead={() => handleToggleRead(relay.url)}
              onToggleWrite={() => handleToggleWrite(relay.url)}
              onRemove={() => handleRemoveRelay(relay.url)}
              removable={relays.length > 1}
              renderRelayUrl={renderRelayUrl}
              local
            />
          ))}
          {localRelays.length === 0 && (
            <div className="p-4 rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
              No local relays configured.
            </div>
          )}
        </div>

        {/* Quick-add presets */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {LOCAL_PRESETS.map((preset) => {
              const already = relays.some(r => r.url === preset.url || r.url === preset.url + '/');
              return (
                <Badge
                  key={preset.url}
                  variant={already ? 'secondary' : 'outline'}
                  className={already ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors'}
                  onClick={() => { if (!already) handleAddLocalRelay(preset.url); }}
                >
                  {already ? '✓ ' : '+ '}
                  {preset.label}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-local-relay-url" className="sr-only">Local Relay URL</Label>
            <Input
              id="new-local-relay-url"
              placeholder="ws://localhost:4869"
              value={newLocalRelayUrl}
              onChange={(e) => setNewLocalRelayUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLocalRelay(); }}
            />
          </div>
          <Button onClick={() => handleAddLocalRelay()} disabled={!newLocalRelayUrl.trim()} variant="outline" size="sm" className="h-10 shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <Separator />

      {/* DM Inbox Relays Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">DM Inbox Relays</h3>
            <p className="text-sm text-muted-foreground">
              Relays where you receive direct messages (NIP-17, kind 10050). Keep this list small (1-3 relays).
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {dmRelays.length === 0 ? (
            <div className="p-4 rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
              No DM inbox relays configured. Add relays to start receiving direct messages.
            </div>
          ) : (
            dmRelays.map((url) => (
              <div
                key={url}
                className="flex items-center gap-3 p-3 rounded-md border bg-muted/20"
              >
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <StatusDot url={url} />
                <span className="font-mono text-sm flex-1 truncate" title={url}>
                  {renderRelayUrl(url)}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDmRelay(url)}
                  className="size-5 text-muted-foreground hover:text-destructive hover:bg-transparent shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-dm-relay-url" className="sr-only">
              DM Relay URL
            </Label>
            <Input
              id="new-dm-relay-url"
              placeholder="Enter DM inbox relay URL (e.g., wss://relay.example.com)"
              value={newDmRelayUrl}
              onChange={(e) => setNewDmRelayUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddDmRelay();
                }
              }}
            />
          </div>
          <Button
            onClick={handleAddDmRelay}
            disabled={!newDmRelayUrl.trim()}
            variant="outline"
            size="sm"
            className="h-10 shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Relay
          </Button>
        </div>
      </div>

      <Separator />

      {/* Private Home Relays Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Private Home Relays</h3>
            <p className="text-sm text-muted-foreground">
              Encrypted relay list for storing private content like drafts (NIP-37, kind 10013). Requires NIP-44 encryption support.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {privateRelays.length === 0 ? (
            <div className="p-4 rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
              No private home relays configured. Add relays to store private content securely.
            </div>
          ) : (
            privateRelays.map((url) => (
              <div
                key={url}
                className="flex items-center gap-3 p-3 rounded-md border bg-muted/20"
              >
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <StatusDot url={url} />
                <span className="font-mono text-sm flex-1 truncate" title={url}>
                  {renderRelayUrl(url)}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePrivateRelay(url)}
                  className="size-5 text-muted-foreground hover:text-destructive hover:bg-transparent shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-private-relay-url" className="sr-only">
              Private Relay URL
            </Label>
            <Input
              id="new-private-relay-url"
              placeholder="Enter private home relay URL (e.g., wss://relay.example.com)"
              value={newPrivateRelayUrl}
              onChange={(e) => setNewPrivateRelayUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPrivateRelay();
                }
              }}
            />
          </div>
          <Button
            onClick={handleAddPrivateRelay}
            disabled={!newPrivateRelayUrl.trim() || !user?.signer.nip44}
            variant="outline"
            size="sm"
            className="h-10 shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Relay
          </Button>
        </div>

        {!user?.signer.nip44 && user && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Your signer does not support NIP-44 encryption. Please upgrade to manage private home relays.
          </p>
        )}
      </div>

      {!user && (
        <p className="text-xs text-muted-foreground pt-4 border-t">
          Log in to sync your relay lists with Nostr
        </p>
      )}
    </div>
  );
}

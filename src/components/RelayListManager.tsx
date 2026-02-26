import { useState, useEffect } from 'react';
import { Plus, X, Wifi, Settings, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';

interface Relay {
  url: string;
  read: boolean;
  write: boolean;
}

export function RelayListManager() {
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // General relays state
  const [relays, setRelays] = useState<Relay[]>(config.relayMetadata.relays);
  const [newRelayUrl, setNewRelayUrl] = useState('');

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
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

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
      {/* General Relays Section */}
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
          {relays.map((relay) => (
            <div
              key={relay.url}
              className="flex items-center gap-3 p-3 rounded-md border bg-muted/20"
            >
              <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-mono text-sm flex-1 truncate" title={relay.url}>
                {renderRelayUrl(relay.url)}
              </span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`read-${relay.url}`} className="text-sm cursor-pointer">
                        Read
                      </Label>
                      <Switch
                        id={`read-${relay.url}`}
                        checked={relay.read}
                        onCheckedChange={() => handleToggleRead(relay.url)}
                        className="data-[state=checked]:bg-green-500 scale-75"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`write-${relay.url}`} className="text-sm cursor-pointer">
                        Write
                      </Label>
                      <Switch
                        id={`write-${relay.url}`}
                        checked={relay.write}
                        onCheckedChange={() => handleToggleWrite(relay.url)}
                        className="data-[state=checked]:bg-blue-500 scale-75"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRelay(relay.url)}
                className="size-5 text-muted-foreground hover:text-destructive hover:bg-transparent shrink-0"
                disabled={relays.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-relay-url" className="sr-only">
              Relay URL
            </Label>
            <Input
              id="new-relay-url"
              placeholder="Enter relay URL (e.g., wss://relay.example.com)"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRelay();
                }
              }}
            />
          </div>
          <Button
            onClick={handleAddRelay}
            disabled={!newRelayUrl.trim()}
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

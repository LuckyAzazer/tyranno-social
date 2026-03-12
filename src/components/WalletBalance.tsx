/**
 * WalletBalance — shows the connected NWC wallet balance in the header.
 * Only renders when the user has an active NWC connection.
 */

import { useState, useEffect } from 'react';
import { useNWC } from '@/hooks/useNWCContext';
import { useWallet } from '@/hooks/useWallet';
import { LN } from '@getalby/sdk';
import { Zap, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatSats(msats: number): string {
  const sats = Math.floor(msats / 1000);
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(2)}M`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}k`;
  return sats.toLocaleString();
}

export function WalletBalance() {
  const { getActiveConnection } = useNWC();
  const { hasNWC } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const fetchBalance = async () => {
    const connection = getActiveConnection();
    if (!connection?.connectionString) return;

    setLoading(true);
    try {
      const client = new LN(connection.connectionString);
      // getBalance returns balance in msats
      const result = await Promise.race([
        (client as unknown as { getBalance: () => Promise<{ balance: number }> }).getBalance(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        ),
      ]) as { balance: number };
      setBalance(result.balance);
      setLastFetched(Date.now());
    } catch {
      // Balance fetch not supported or timed out — silently ignore
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance on mount and every 5 minutes
  useEffect(() => {
    if (!hasNWC) return;
    const now = Date.now();
    if (now - lastFetched > 5 * 60_000) {
      fetchBalance();
    }
  }, [hasNWC]);

  if (!hasNWC) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 px-2.5 font-mono text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            onClick={fetchBalance}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-amber-500/50" />
            )}
            {balance !== null ? (
              <span>{formatSats(balance)} sats</span>
            ) : (
              <Wallet className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {balance !== null
              ? `Wallet balance: ${formatSats(balance)} sats`
              : 'Click to check wallet balance'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext';

export function DMSetupPrompt() {
  const navigate = useNavigate();
  const { config } = useAppContext();
  
  const hasDMRelays = config.dmInboxRelays && config.dmInboxRelays.relays.length > 0;

  if (hasDMRelays) {
    return null;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
              DM Inbox Relays Not Configured
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              To send and receive direct messages with NIP-17, you need to configure DM inbox relays. 
              Your messages are being sent, but you won't see them until relays are configured.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/messages')}
              className="mt-2 gap-2 border-yellow-600/50 hover:bg-yellow-100 dark:hover:bg-yellow-950/40"
            >
              <Mail className="h-4 w-4" />
              Set Up DM Relays
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

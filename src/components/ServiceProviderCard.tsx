import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, MapPin, Zap, DollarSign, Wifi, Copy } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ServiceProviderData {
  id?: string;
  provider_name?: string;
  region?: string;
  endpoint?: string;
  wg_public_key?: string;
  price_msat_per_mb?: number;
  min_bandwidth?: string;
  capabilities?: string[];
  status?: string;
}

interface ServiceProviderCardProps {
  data: ServiceProviderData;
}

export function ServiceProviderCard({ data }: ServiceProviderCardProps) {
  const { toast } = useToast();
  
  const providerName = data.provider_name || 'Unknown Provider';
  const region = data.region || 'Unknown Region';
  const endpoint = data.endpoint;
  const publicKey = data.wg_public_key;
  const priceMsatPerMb = data.price_msat_per_mb;
  const minBandwidth = data.min_bandwidth;
  const capabilities = data.capabilities || [];
  const status = data.status || 'unknown';

  // Convert millisats to sats
  const priceSatsPerMb = priceMsatPerMb ? (priceMsatPerMb / 1000).toFixed(0) : null;
  const priceSatsPerGb = priceMsatPerMb ? ((priceMsatPerMb * 1024) / 1000).toFixed(0) : null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 dark:border-transparent bg-gradient-to-br from-card via-card to-indigo-50/20 dark:from-card dark:via-card dark:to-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{providerName}</span>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {region}
              </Badge>
              {status && (
                <Badge 
                  variant={status === 'active' ? 'default' : 'secondary'}
                  className={status === 'active' ? 'bg-green-500' : ''}
                >
                  {status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Endpoint */}
        {endpoint && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Endpoint:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                {endpoint}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(endpoint, 'Endpoint');
                }}
                className="h-7 px-2 shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Public Key */}
        {publicKey && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Public Key:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                {publicKey.length > 40 ? `${publicKey.substring(0, 40)}...` : publicKey}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(publicKey, 'Public key');
                }}
                className="h-7 px-2 shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Pricing & Bandwidth */}
        <div className="flex gap-2 flex-wrap">
          {priceSatsPerMb && (
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="h-3 w-3" />
              {priceSatsPerMb} sats/MB
            </Badge>
          )}
          {priceSatsPerGb && (
            <Badge variant="outline" className="gap-1">
              {priceSatsPerGb} sats/GB
            </Badge>
          )}
          {minBandwidth && (
            <Badge variant="secondary" className="gap-1">
              <Zap className="h-3 w-3" />
              {minBandwidth} min
            </Badge>
          )}
        </div>

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Capabilities:</p>
            <div className="flex gap-1 flex-wrap">
              {capabilities.map((capability, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ID */}
        {data.id && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              ID: <code className="font-mono text-[10px]">{data.id.substring(0, 16)}...</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

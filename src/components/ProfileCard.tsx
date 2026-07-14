import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Zap, Code, Mail, ExternalLink } from 'lucide-react';

interface ProfileData {
  name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
  display_name?: string;
  capabilities?: string[];
  pricing?: string;
  contact?: string;
}

interface ProfileCardProps {
  data: ProfileData;
}

export function ProfileCard({ data }: ProfileCardProps) {
  const displayName = data.display_name || data.name || 'Unknown User';
  const about = data.about || '';
  const picture = data.picture;
  const banner = data.banner;
  const website = data.website;
  const nip05 = data.nip05;
  const lightningAddress = data.lud16 || data.lud06;
  const capabilities = data.capabilities || [];
  const pricing = data.pricing;
  const contact = data.contact;

  return (
    <Card className="overflow-hidden border-border/50 dark:border-transparent bg-gradient-to-br from-card via-card to-purple-50/20 dark:from-card dark:via-card dark:to-card">
      {/* Banner */}
      {banner && (
        <div className="h-24 w-full overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5">
          <img
            src={banner}
            alt="Banner"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Profile Picture */}
          {picture ? (
            <div className="shrink-0">
              <img
                src={picture}
                alt={displayName}
                className="w-16 h-16 object-cover ring-2 ring-background shadow-lg"
                style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-background shadow-lg" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}>
              <User className="h-8 w-8 text-primary" />
            </div>
          )}

          {/* Profile Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-foreground truncate">
                {displayName}
              </h3>
              {nip05 && (
                <p className="text-sm text-muted-foreground truncate">
                  {nip05}
                </p>
              )}
            </div>

            {/* About */}
            {about && (
              <p className="text-sm text-foreground/90 line-clamp-3">
                {about}
              </p>
            )}

            {/* Capabilities */}
            {capabilities.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  Capabilities:
                </p>
                <div className="flex gap-1 flex-wrap">
                  {capabilities.map((capability, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            {pricing && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Pricing:
                </p>
                <p className="text-sm text-foreground/90">
                  {pricing}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {website && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                </Button>
              )}
              {contact && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={contact.startsWith('@') ? `https://twitter.com/${contact.slice(1)}` : `mailto:${contact}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-4 w-4" />
                    Contact
                  </a>
                </Button>
              )}
              {lightningAddress && (
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {lightningAddress}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

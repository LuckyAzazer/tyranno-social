import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ComposePost } from '@/components/ComposePost';
import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PenSquare } from 'lucide-react';

export function MobileComposePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'New Post - Tyrannosocial',
    description: 'Compose a new post',
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">New Post</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4">
        {user ? (
          <ComposePost onPostPublished={() => navigate('/')} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <PenSquare className="h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Log in to compose a post</p>
            <LoginArea className="max-w-60" />
          </div>
        )}
      </main>
    </div>
  );
}

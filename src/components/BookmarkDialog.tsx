import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bookmark, Lock, Globe } from 'lucide-react';

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isPrivate: boolean) => void;
  isBookmarked: boolean;
}

export function BookmarkDialog({ open, onOpenChange, onConfirm, isBookmarked }: BookmarkDialogProps) {
  const handleConfirm = () => {
    onConfirm(false);
    onOpenChange(false);
  };

  const handleOptionClick = (type: 'public' | 'private', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm(type === 'private');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
          </DialogTitle>
          <DialogDescription>
            {isBookmarked 
              ? 'Are you sure you want to remove this post from your bookmarks?'
              : 'Choose how you want to save this post'
            }
          </DialogDescription>
        </DialogHeader>

        {!isBookmarked && (
          <div className="py-4">
            <div className="space-y-3">
              <div 
                className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
                onClick={(e) => handleOptionClick('public', e)}
              >
                <div className="pt-0.5">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    Public Bookmark
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visible on your profile and in your public bookmark list
                  </p>
                </div>
              </div>

              <div 
                className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
                onClick={(e) => handleOptionClick('private', e)}
              >
                <div className="pt-0.5">
                  <Lock className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    Private Bookmark
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Encrypted and only visible to you
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isBookmarked && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} variant="destructive">
              Remove
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bookmark, Lock, Globe } from 'lucide-react';

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isPrivate: boolean) => void;
  isBookmarked: boolean;
}

export function BookmarkDialog({ open, onOpenChange, onConfirm, isBookmarked }: BookmarkDialogProps) {
  const [bookmarkType, setBookmarkType] = useState<'public' | 'private'>('public');

  const handleConfirm = () => {
    onConfirm(bookmarkType === 'private');
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
            <RadioGroup value={bookmarkType} onValueChange={(value) => setBookmarkType(value as 'public' | 'private')}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                     onClick={() => setBookmarkType('public')}>
                  <RadioGroupItem value="public" id="public" />
                  <div className="flex-1">
                    <Label htmlFor="public" className="cursor-pointer flex items-center gap-2 font-medium">
                      <Globe className="h-4 w-4 text-blue-500" />
                      Public Bookmark
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Visible on your profile and in your public bookmark list
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                     onClick={() => setBookmarkType('private')}>
                  <RadioGroupItem value="private" id="private" />
                  <div className="flex-1">
                    <Label htmlFor="private" className="cursor-pointer flex items-center gap-2 font-medium">
                      <Lock className="h-4 w-4 text-purple-500" />
                      Private Bookmark
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Encrypted and only visible to you
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {isBookmarked ? 'Remove' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

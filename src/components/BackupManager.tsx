import { useState, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  Database, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  FileJson,
  Info
} from 'lucide-react';
import { 
  exportNostrData, 
  downloadBackup, 
  parseBackupFile, 
  restoreBackup,
  getBackupStats,
  type NostrBackup 
} from '@/lib/backup';

export function BackupManager() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [lastBackup, setLastBackup] = useState<NostrBackup | null>(null);

  // Export options
  const [includePosts, setIncludePosts] = useState(true);
  const [includeArticles, setIncludeArticles] = useState(true);
  const [includeBookmarks, setIncludeBookmarks] = useState(true);
  const [postLimit, setPostLimit] = useState(500);

  // Restore options
  const [restoreProfile, setRestoreProfile] = useState(true);
  const [restoreContacts, setRestoreContacts] = useState(true);
  const [restorePosts, setRestorePosts] = useState(false); // Default false to prevent spam
  const [restoreBookmarks, setRestoreBookmarks] = useState(true);

  const handleExport = async () => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to export your data',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      setExportProgress(20);

      const backup = await exportNostrData(nostr, user.pubkey, {
        includePosts,
        includeArticles,
        includeBookmarks,
        postLimit,
      });

      setExportProgress(80);
      setLastBackup(backup);

      const stats = getBackupStats(backup);
      
      setExportProgress(90);
      downloadBackup(backup);
      
      setExportProgress(100);

      toast({
        title: 'Backup exported successfully! 🎉',
        description: `Exported ${stats.totalEvents} events including ${stats.posts} posts, ${stats.articles} articles, and ${stats.bookmarks} bookmarks.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to restore data',
        variant: 'destructive',
      });
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);

    try {
      setRestoreProgress(10);
      const backup = await parseBackupFile(file);
      
      setRestoreProgress(30);
      const stats = getBackupStats(backup);

      // Confirm before restoring
      const shouldRestore = window.confirm(
        `This will restore ${stats.totalEvents} events from ${new Date(backup.exportedAt * 1000).toLocaleDateString()}.\n\n` +
        `Profile: ${stats.hasProfile ? 'Yes' : 'No'}\n` +
        `Contacts: ${stats.hasContacts ? 'Yes' : 'No'}\n` +
        `Posts: ${stats.posts}\n` +
        `Articles: ${stats.articles}\n` +
        `Bookmarks: ${stats.bookmarks}\n\n` +
        `Continue?`
      );

      if (!shouldRestore) {
        setIsRestoring(false);
        setRestoreProgress(0);
        return;
      }

      setRestoreProgress(50);

      const result = await restoreBackup(nostr, backup, {
        restoreProfile,
        restoreContacts,
        restorePosts,
        restoreBookmarks,
      });

      setRestoreProgress(100);

      if (result.failed > 0) {
        toast({
          title: 'Restore completed with warnings',
          description: `Restored ${result.success} events, ${result.failed} failed. Some events may already exist on relays.`,
        });
      } else {
        toast({
          title: 'Backup restored successfully! 🎉',
          description: `Successfully restored ${result.success} events to your relays.`,
        });
      }

      // Refresh the page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Failed to restore backup. Please check the file and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setRestoreProgress(0), 2000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Log in to backup and restore your Nostr data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Backup
          </CardTitle>
          <CardDescription>
            Download a complete backup of your Nostr data as a JSON file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="export-posts" className="cursor-pointer">Include Posts</Label>
              <Switch
                id="export-posts"
                checked={includePosts}
                onCheckedChange={setIncludePosts}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-articles" className="cursor-pointer">Include Articles</Label>
              <Switch
                id="export-articles"
                checked={includeArticles}
                onCheckedChange={setIncludeArticles}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="export-bookmarks" className="cursor-pointer">Include Bookmarks</Label>
              <Switch
                id="export-bookmarks"
                checked={includeBookmarks}
                onCheckedChange={setIncludeBookmarks}
              />
            </div>
          </div>

          <Separator />

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full gap-2"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Backup
              </>
            )}
          </Button>

          {isExporting && exportProgress > 0 && (
            <div className="space-y-2">
              <Progress value={exportProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Fetching your data from relays... {exportProgress}%
              </p>
            </div>
          )}

          {lastBackup && !isExporting && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Last Backup
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Date: {new Date(lastBackup.exportedAt * 1000).toLocaleString()}</div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getBackupStats(lastBackup).posts} posts
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getBackupStats(lastBackup).articles} articles
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getBackupStats(lastBackup).bookmarks} bookmarks
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Upload a previously exported backup file to restore your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/30 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-400">
                  Important Notes
                </p>
                <ul className="text-xs text-orange-800 dark:text-orange-400/80 space-y-1 list-disc list-inside">
                  <li>Profile and contacts will replace your current data</li>
                  <li>Posts are disabled by default to prevent duplicates</li>
                  <li>This publishes events to all your write relays</li>
                  <li>The process may take a few minutes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Restore Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="restore-profile" className="cursor-pointer">Restore Profile</Label>
              <Switch
                id="restore-profile"
                checked={restoreProfile}
                onCheckedChange={setRestoreProfile}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="restore-contacts" className="cursor-pointer">Restore Contacts</Label>
              <Switch
                id="restore-contacts"
                checked={restoreContacts}
                onCheckedChange={setRestoreContacts}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="restore-posts" className="cursor-pointer">Restore Posts</Label>
                <Info className="h-3 w-3 text-muted-foreground" title="May create duplicates" />
              </div>
              <Switch
                id="restore-posts"
                checked={restorePosts}
                onCheckedChange={setRestorePosts}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="restore-bookmarks" className="cursor-pointer">Restore Bookmarks</Label>
              <Switch
                id="restore-bookmarks"
                checked={restoreBookmarks}
                onCheckedChange={setRestoreBookmarks}
              />
            </div>
          </div>

          <Separator />

          {/* Import Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            onClick={handleImportClick}
            disabled={isRestoring}
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <FileJson className="h-5 w-5" />
                Upload Backup File
              </>
            )}
          </Button>

          {isRestoring && restoreProgress > 0 && (
            <div className="space-y-2">
              <Progress value={restoreProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Publishing events to relays... {restoreProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-400">
                How Backups Work
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-400/80 space-y-1">
                <li>• <strong>Export</strong> downloads your Nostr events as a JSON file</li>
                <li>• <strong>Import</strong> republishes events to your configured relays</li>
                <li>• Backups include: profile, posts, articles, bookmarks, contacts, relay lists</li>
                <li>• Store backups safely - they contain your public Nostr data</li>
                <li>• Regular backups recommended (weekly or after major updates)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

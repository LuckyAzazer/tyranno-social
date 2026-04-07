import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { extractColorsFromImage, hexToHSL } from '@/lib/colorExtraction';
import { Upload, X, Loader2, ImagePlus, Droplet, Layers, Move } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Position presets ─────────────────────────────────────────────────────────

const POSITION_PRESETS = [
  { label: 'Top Left',    value: '0% 0%'     },
  { label: 'Top',         value: '50% 0%'    },
  { label: 'Top Right',   value: '100% 0%'   },
  { label: 'Left',        value: '0% 50%'    },
  { label: 'Center',      value: '50% 50%'   },
  { label: 'Right',       value: '100% 50%'  },
  { label: 'Bottom Left', value: '0% 100%'   },
  { label: 'Bottom',      value: '50% 100%'  },
  { label: 'Bottom Right',value: '100% 100%' },
];

// ─── Drag-to-reposition thumbnail ─────────────────────────────────────────────

function WallpaperPositionPicker({
  wallpaperUrl,
  position,
  onChange,
}: {
  wallpaperUrl: string;
  position: string;
  onChange: (pos: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Parse current position as x/y percentages
  const [px, py] = position.split(' ').map(p => parseFloat(p));

  const posFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return `${Math.round(x)}% ${Math.round(y)}%`;
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const pos = posFromEvent(e);
    if (pos) onChange(pos);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const p = posFromEvent(ev);
      if (p) onChange(p);
    };
    const onUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);

    // Cleanup once released
    const cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('mouseup', cleanup);
      window.removeEventListener('touchend', cleanup);
    };
    window.addEventListener('mouseup', cleanup);
    window.addEventListener('touchend', cleanup);
  }, [posFromEvent, onChange]);

  return (
    <div className="space-y-2">
      {/* Drag area */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden cursor-crosshair select-none border-2 border-primary/30 hover:border-primary/50 transition-colors"
        style={{ aspectRatio: '16/7' }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        {/* Wallpaper preview showing focal point */}
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${wallpaperUrl})`,
            backgroundPosition: position,
          }}
        />
        {/* Dark overlay so crosshair is visible */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Rule-of-thirds grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[1, 2].map(i => (
            <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white/15" style={{ left: `${(i / 3) * 100}%` }} />
          ))}
          {[1, 2].map(i => (
            <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white/15" style={{ top: `${(i / 3) * 100}%` }} />
          ))}
        </div>

        {/* Crosshair at current position */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)' }}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer ring */}
            <div className="h-8 w-8 rounded-full border-2 border-white shadow-lg shadow-black/60" />
            {/* Cross lines */}
            <div className="absolute h-px w-5 bg-white shadow-sm" />
            <div className="absolute h-5 w-px bg-white shadow-sm" />
            {/* Center dot */}
            <div className="absolute h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </div>

        {/* Hint label */}
        <div className="absolute bottom-1.5 right-2 text-white/60 text-[10px] font-medium pointer-events-none select-none">
          Drag to reposition
        </div>
      </div>

      {/* 3×3 preset grid */}
      <div className="grid grid-cols-3 gap-1">
        {POSITION_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={cn(
              'text-[10px] font-medium py-1.5 px-1 rounded-md border transition-all',
              position === preset.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PersonalizedThemeManager() {
  const { config, updateConfig } = useAppContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const hasPersonalizedTheme = !!config.personalizedTheme;
  const cardOpacity = config.personalizedTheme?.cardOpacity ?? 85;
  const cardBlur = config.personalizedTheme?.cardBlur ?? 20;
  const wallpaperPosition = config.personalizedTheme?.wallpaperPosition ?? '50% 50%';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file (JPG, PNG, WebP, etc.)', variant: 'destructive' });
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Please select an image smaller than 10MB', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        try {
          // Resize + re-encode as JPEG to keep the data URL small enough
          // for localStorage (PNGs can be many MB as base64).
          const dataUrl = await compressImage(rawDataUrl);
          let colors;
          try {
            colors = await extractColorsFromImage(dataUrl);
          } catch {
            colors = { primary: '#e11d48', secondary: '#f43f5e', accent: '#fb923c', background: '#ffffff', foreground: '#0a0a0a' };
          }
          applyPersonalizedTheme(colors, dataUrl, cardOpacity, cardBlur, wallpaperPosition);
          updateConfig((current) => ({
            ...current,
            personalizedTheme: {
              wallpaperUrl: dataUrl,
              primaryColor: colors.primary,
              secondaryColor: colors.secondary,
              accentColor: colors.accent,
              backgroundColor: colors.background,
              foregroundColor: colors.foreground,
              cardOpacity,
              cardBlur,
              wallpaperPosition,
            },
          }));
          toast({ title: 'Wallpaper uploaded!', description: 'Applying your personalized theme…' });
          setTimeout(() => window.location.reload(), 800);
        } catch {
          toast({ title: 'Failed to upload wallpaper', description: 'There was an error processing the file. Please try again.', variant: 'destructive' });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast({ title: 'Failed to read file', description: 'There was an error reading the file. Please try again.', variant: 'destructive' });
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: 'Upload failed', description: 'There was an error uploading the wallpaper.', variant: 'destructive' });
      setIsProcessing(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveWallpaper = () => {
    updateConfig((current) => { const n = { ...current }; delete n.personalizedTheme; return n; });
    removePersonalizedTheme();
    toast({ title: 'Wallpaper removed', description: 'Restoring default theme…' });
    setTimeout(() => window.location.reload(), 800);
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    updateConfig((current) => ({ ...current, personalizedTheme: current.personalizedTheme ? { ...current.personalizedTheme, cardOpacity: newOpacity } : undefined }));
    document.documentElement.style.setProperty('--card-opacity', (newOpacity / 100).toString());
  };

  const handleBlurChange = (value: number[]) => {
    const newBlur = value[0];
    updateConfig((current) => ({ ...current, personalizedTheme: current.personalizedTheme ? { ...current.personalizedTheme, cardBlur: newBlur } : undefined }));
    document.documentElement.style.setProperty('--card-blur', `${newBlur}px`);
  };

  const handlePositionChange = useCallback((pos: string) => {
    updateConfig((current) => ({ ...current, personalizedTheme: current.personalizedTheme ? { ...current.personalizedTheme, wallpaperPosition: pos } : undefined }));
    document.documentElement.style.setProperty('--wallpaper-position', pos);
  }, [updateConfig]);

  return (
    <div className="space-y-4">
      {hasPersonalizedTheme ? (
        <div className="space-y-4">

          {/* Wallpaper Position Picker */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-medium">
                <Move className="h-4 w-4 text-primary" />
                Wallpaper Position
              </Label>
              <span className="text-sm text-muted-foreground font-mono text-xs">
                {wallpaperPosition}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag the preview or pick a preset to set the focal point of your wallpaper
            </p>
            <WallpaperPositionPicker
              wallpaperUrl={config.personalizedTheme!.wallpaperUrl}
              position={wallpaperPosition}
              onChange={handlePositionChange}
            />
          </div>

          {/* Opacity Slider */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-medium">
                <Droplet className="h-4 w-4 text-primary" />
                Card Transparency
              </Label>
              <span className="text-sm text-muted-foreground font-mono">{cardOpacity}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Adjust how much of your wallpaper shows through cards</p>
            <Slider value={[cardOpacity]} onValueChange={handleOpacityChange} min={20} max={100} step={5} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More wallpaper</span>
              <span>Less wallpaper</span>
            </div>
          </div>

          {/* Blur Slider */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 font-medium">
                <Layers className="h-4 w-4 text-primary" />
                Card Blur
              </Label>
              <span className="text-sm text-muted-foreground font-mono">{cardBlur === 0 ? 'Off' : `${cardBlur}px`}</span>
            </div>
            <p className="text-xs text-muted-foreground">Blurry = frosted glass look. Clear = darker solid cards for better readability</p>
            <Slider value={[cardBlur]} onValueChange={handleBlurChange} min={0} max={40} step={2} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Clear (no blur)</span>
              <span>Blurry (frosted)</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1">
              {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Upload className="h-4 w-4 mr-2" />Change Wallpaper</>}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveWallpaper} disabled={isProcessing}>
              <X className="h-4 w-4 mr-2" />Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-8 rounded-md border-2 border-dashed bg-muted/20 text-center">
            <ImagePlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">Upload a wallpaper to personalize your theme</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Upload className="h-4 w-4 mr-2" />Upload Wallpaper</>}
            </Button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

// ─── Image compression helper ────────────────────────────────────────────────

/**
 * Resizes and re-encodes an image as a JPEG data URL.
 * Keeps the image under ~800px on the longest edge and uses 0.85 quality,
 * which is more than good enough for a wallpaper and stays well within
 * localStorage limits even for large PNGs.
 */
function compressImage(dataUrl: string, maxPx = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // White background so transparent PNGs become solid for the wallpaper
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fall back to original on error
    img.src = dataUrl;
  });
}

// ─── Apply / remove helpers ───────────────────────────────────────────────────

function applyPersonalizedTheme(
  colors: { primary: string; secondary: string; accent: string; background: string; foreground: string },
  wallpaperUrl: string,
  cardOpacity = 85,
  cardBlur = 20,
  wallpaperPosition = '50% 50%',
) {
  const root = document.documentElement;
  const primaryHSL = hexToHSL(colors.primary);
  const accentHSL  = hexToHSL(colors.accent);
  const bgHSL      = hexToHSL(colors.background);
  const fgHSL      = hexToHSL(colors.foreground);

  root.style.setProperty('--primary',    `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
  root.style.setProperty('--accent',     `${accentHSL.h} ${accentHSL.s}% ${accentHSL.l}%`);
  root.style.setProperty('--background', `${bgHSL.h} ${bgHSL.s}% ${bgHSL.l}%`);
  root.style.setProperty('--foreground', `${fgHSL.h} ${fgHSL.s}% ${fgHSL.l}%`);

  root.style.setProperty('--wallpaper-url',      `url("${wallpaperUrl}")`);
  root.style.setProperty('--card-opacity',        (cardOpacity / 100).toString());
  root.style.setProperty('--card-blur',           `${cardBlur}px`);
  root.style.setProperty('--wallpaper-position',  wallpaperPosition);
  root.classList.add('personalized-theme');

  if (bgHSL.l < 50) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

function removePersonalizedTheme() {
  const root = document.documentElement;
  root.classList.remove('personalized-theme');
  root.style.removeProperty('--wallpaper-url');
  root.style.removeProperty('--wallpaper-position');
}

export function initializePersonalizedTheme(personalizedTheme?: {
  wallpaperUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  cardOpacity?: number;
  cardBlur?: number;
  wallpaperPosition?: string;
}) {
  if (personalizedTheme) {
    applyPersonalizedTheme(
      {
        primary:    personalizedTheme.primaryColor,
        secondary:  personalizedTheme.secondaryColor,
        accent:     personalizedTheme.accentColor,
        background: personalizedTheme.backgroundColor,
        foreground: personalizedTheme.foregroundColor,
      },
      personalizedTheme.wallpaperUrl,
      personalizedTheme.cardOpacity    ?? 85,
      personalizedTheme.cardBlur       ?? 20,
      personalizedTheme.wallpaperPosition ?? '50% 50%',
    );
  } else {
    removePersonalizedTheme();
  }
}

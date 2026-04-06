/**
 * AppearancePanel — unified appearance settings with a live post preview.
 *
 * Layout:
 *   - Desktop (md+): Two-column. Controls on the left, sticky live preview on the right.
 *   - Mobile: Full-width controls + floating "Preview" button that opens a bottom sheet.
 *
 * Options surfaced:
 *   1. Dark / Light mode
 *   2. Theme color (hue picker + presets)
 *   3. Card corner radius
 *   4. Post density (compact / comfortable / spacious)
 *   5. Font family
 *   6. Font size
 *   7. Personalized wallpaper (delegates to PersonalizedThemeManager)
 */

import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/hooks/useAppContext';
import { PersonalizedThemeManager } from '@/components/PersonalizedThemeManager';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Moon, Sun, Palette, Type, Sparkles, MessageCircle,
  Repeat2, Bookmark, Heart, Zap, ImageIcon, Eye,
} from 'lucide-react';
import { applyHue, getSavedHue } from '@/lib/applyHue';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { name: 'Burgundy', hue: 345 },
  { name: 'Blue',     hue: 210 },
  { name: 'Green',    hue: 150 },
  { name: 'Purple',   hue: 270 },
  { name: 'Orange',   hue: 30  },
  { name: 'Pink',     hue: 330 },
  { name: 'Teal',     hue: 180 },
  { name: 'Amber',    hue: 45  },
  { name: 'Red',      hue: 0   },
  { name: 'Cyan',     hue: 195 },
];

const RADIUS_OPTIONS = [
  { value: 'none', label: 'None',   px: '0px'     },
  { value: 'sm',   label: 'Small',  px: '4px'     },
  { value: 'md',   label: 'Medium', px: '8px'     },
  { value: 'lg',   label: 'Large',  px: '12px'    },
  { value: 'xl',   label: 'Pill',   px: '24px'    },
];

const DENSITY_OPTIONS = [
  { value: 'compact',     label: 'Compact',     desc: 'More posts visible at once' },
  { value: 'comfortable', label: 'Comfortable', desc: 'Balanced spacing (default)'  },
  { value: 'spacious',    label: 'Spacious',    desc: 'Relaxed, airy layout'        },
];

const FONT_OPTIONS = [
  { value: 'inter',             label: 'Inter',              family: 'Inter Variable, Inter, system-ui, sans-serif' },
  { value: 'system',            label: 'System',             family: 'system-ui, -apple-system, sans-serif' },
  { value: 'serif',             label: 'Serif',              family: 'Georgia, serif' },
  { value: 'mono',              label: 'Monospace',          family: 'ui-monospace, monospace' },
  { value: 'caveat',            label: 'Caveat (Handwriting)',family: 'Caveat, cursive' },
  { value: 'dancing-script',    label: 'Dancing Script',     family: 'Dancing Script, cursive' },
  { value: 'pacifico',          label: 'Pacifico',           family: 'Pacifico, cursive' },
  { value: 'kalam',             label: 'Kalam',              family: 'Kalam, cursive' },
  { value: 'permanent-marker',  label: 'Permanent Marker',   family: 'Permanent Marker, cursive' },
];

const FONT_SIZES = [
  { value: 'xs',   label: 'Extra Small', size: '12px' },
  { value: 'sm',   label: 'Small',       size: '14px' },
  { value: 'base', label: 'Medium',      size: '16px' },
  { value: 'lg',   label: 'Large',       size: '18px' },
  { value: 'xl',   label: 'Extra Large', size: '20px' },
];

const RADIUS_PX_MAP: Record<string, string> = {
  none: '0px', sm: '4px', md: '8px', lg: '12px', xl: '24px',
};

const DENSITY_PADDING_MAP: Record<string, string> = {
  compact: '0.5rem', comfortable: '1rem', spacious: '1.75rem',
};

// ─── Live preview card ────────────────────────────────────────────────────────
// Reads directly from CSS variables so it always matches the real app exactly.

interface PreviewCardProps {
  fontFamily: string;
  fontSize: string;
}

function PreviewCard({ fontFamily, fontSize }: PreviewCardProps) {
  const root = document.documentElement;
  const css = (v: string) =>
    getComputedStyle(root).getPropertyValue(v).trim();

  const card     = `hsl(${css('--card')})`;
  const border   = `hsl(${css('--border')})`;
  const fg       = `hsl(${css('--card-foreground')})`;
  const muted    = `hsl(${css('--muted-foreground')})`;
  const mutedBg  = `hsl(${css('--muted')})`;
  const primary  = `hsl(${css('--primary')})`;
  const primaryFg= `hsl(${css('--primary-foreground')})`;
  const radius   = css('--radius') || '4px';
  const padding  = css('--card-padding') || '1rem';

  return (
    <div
      className="w-full overflow-hidden shadow-sm transition-all duration-300"
      style={{ borderRadius: radius, border: `1px solid ${border}`, background: card, fontFamily, color: fg }}
    >
      {/* Header */}
      <div style={{ padding, borderBottom: `1px solid ${border}` }}>
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 flex items-center justify-center font-bold text-sm"
            style={{ width: 40, height: 40, borderRadius: radius, background: primary, color: primaryFg }}
          >
            T
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight text-sm" style={{ color: fg }}>TyrannoUser</p>
                <p className="text-xs" style={{ color: muted }}>@tyrannouser · 2m ago</p>
              </div>
              <span
                className="text-xs px-2 py-0.5 font-medium"
                style={{ borderRadius: radius, background: mutedBg, color: primary }}
              >
                Follow
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding }}>
        <p className="leading-relaxed mb-3 text-sm" style={{ color: fg, fontSize: fontSize }}>
          This is how your posts will look with the current settings.{' '}
          <span style={{ color: primary }}>#nostr #tyrannosocial</span>
        </p>

        {/* Image placeholder */}
        <div
          className="w-full mb-3 flex items-center justify-center gap-2 text-xs"
          style={{ height: 72, borderRadius: radius, background: mutedBg, border: `1px solid ${border}`, color: muted }}
        >
          <ImageIcon size={13} />
          <span>Image preview</span>
        </div>

        {/* Reactions */}
        <div className="flex gap-1.5 mb-3">
          {['❤️ 12', '🔥 4', '⚡ 3'].map((r) => (
            <span
              key={r}
              className="text-xs px-2 py-0.5"
              style={{ borderRadius: radius, background: mutedBg, border: `1px solid ${border}`, color: muted }}
            >
              {r}
            </span>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${border}` }}>
          {[
            { icon: MessageCircle, label: '5' },
            { icon: Repeat2,       label: '2' },
            { icon: Zap,           label: '3' },
            { icon: Bookmark,      label: '' },
            { icon: Heart,         label: '' },
          ].map(({ icon: Icon, label }, i) => (
            <button key={i} className="flex items-center gap-1 text-xs" style={{ color: i === 0 ? primary : muted }}>
              <Icon size={14} />
              {label && <span>{label}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: typeof Moon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

// ─── Sticky Preview Panel (desktop) ──────────────────────────────────────────

function StickyPreviewPanel({ fontFamily, fontSize }: { fontFamily: string; fontSize: string }) {
  return (
    <div className="sticky top-24 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
      </div>
      <div className="rounded border border-border bg-muted/30 p-3">
        <PreviewCard fontFamily={fontFamily} fontSize={fontSize} />
      </div>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
        Every change you make is reflected here instantly.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAppContext();
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);

  const isDark = theme === 'dark';
  const hasWallpaper = !!config.personalizedTheme;

  // Local hue state (mirrors ColorThemeSelector)
  const [hue, setHue] = useState<number>(getSavedHue);

  const handleHue = (h: number) => {
    setHue(h);
    applyHue(h);
  };

  const currentRadius  = config.cardRadius  ?? 'md';
  const currentDensity = config.postDensity ?? 'comfortable';
  const currentFont    = FONT_OPTIONS.find(f => f.family === config.fontFamily)?.value ?? 'inter';
  const currentSize    = FONT_SIZES.find(s => s.size === config.fontSize)?.value ?? 'base';

  const previewFontFamily = FONT_OPTIONS.find(f => f.value === currentFont)?.family ?? FONT_OPTIONS[0].family;
  const previewFontSize   = FONT_SIZES.find(s => s.value === currentSize)?.size ?? '16px';

  const setRadius = (v: string) => {
    updateConfig(c => ({ ...c, cardRadius: v }));
    document.documentElement.style.setProperty('--radius', RADIUS_PX_MAP[v] ?? '8px');
  };
  const setDensity = (v: string) => {
    updateConfig(c => ({ ...c, postDensity: v }));
    document.documentElement.style.setProperty('--card-padding', DENSITY_PADDING_MAP[v] ?? '1rem');
  };
  const setFont = (v: string) => {
    const font = FONT_OPTIONS.find(f => f.value === v);
    if (!font) return;
    updateConfig(c => ({ ...c, fontFamily: font.family }));
    document.documentElement.style.fontFamily = font.family;
  };
  const setFontSize = (v: string) => {
    const size = FONT_SIZES.find(s => s.value === v);
    if (!size) return;
    updateConfig(c => ({ ...c, fontSize: size.size }));
    document.documentElement.style.setProperty('--text-size', size.size);
  };

  const previewProps = { fontFamily: previewFontFamily, fontSize: previewFontSize };

  // ── Settings controls (shared between desktop + mobile) ─────────────────────
  const settingsControls = (
    <div className="space-y-7">

      {/* ── Dark Mode ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <SectionLabel icon={isDark ? Moon : Sun} label="Dark Mode" />
          <p className="text-xs text-muted-foreground pl-6">
            {hasWallpaper ? 'Disabled while wallpaper is active' : 'Switch between light and dark themes'}
          </p>
        </div>
        <Switch
          checked={isDark}
          onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
          disabled={hasWallpaper}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      <Separator />

      {/* ── Theme Color ── */}
      <div className="space-y-4">
        <div>
          <SectionLabel icon={Palette} label="Theme Color" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">
            {hasWallpaper ? 'Colors are generated from your wallpaper' : 'Pick any color — it tints the whole app'}
          </p>
        </div>

        {hasWallpaper ? (
          <div className="flex gap-2 pl-6">
            {config.personalizedTheme && [
              config.personalizedTheme.primaryColor,
              config.personalizedTheme.secondaryColor,
              config.personalizedTheme.accentColor,
            ].map((c, i) => (
              <div key={i} className="h-8 w-8 rounded-md border-2 border-border" style={{ background: c }} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 pl-6">
            {/* Hue slider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative h-5 flex items-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,50%), hsl(120,70%,50%), hsl(180,70%,50%), hsl(240,70%,50%), hsl(300,70%,50%), hsl(360,70%,50%))' }}
                />
                <input
                  type="range" min="0" max="360" value={hue}
                  onChange={e => handleHue(Number(e.target.value))}
                  className="relative w-full h-2 appearance-none bg-transparent cursor-pointer"
                  style={{ zIndex: 1 }}
                />
              </div>
              <div className="h-8 w-8 rounded-md border-2 border-border shrink-0" style={{ background: `hsl(${hue}, 65%, 45%)` }} />
            </div>
            {/* Color presets */}
            <div className="grid grid-cols-10 gap-1.5">
              {PRESET_COLORS.map(p => (
                <button
                  key={p.name}
                  title={p.name}
                  onClick={() => handleHue(p.hue)}
                  className="h-7 w-full rounded-md border-2 transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: `hsl(${p.hue}, 65%, 45%)`,
                    borderColor: 'transparent',
                    boxShadow: hue === p.hue ? `0 0 0 2px hsl(${p.hue}, 65%, 45%)` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Card Radius ── */}
      <div className="space-y-3">
        <div>
          <SectionLabel icon={Palette} label="Card Corners" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">How rounded the post cards and buttons look</p>
        </div>
        <div className="flex gap-2 pl-6 flex-wrap">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => setRadius(r.value)}
              className={`px-3 py-2 text-xs font-medium border-2 transition-all ${
                currentRadius === r.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/40'
              }`}
              style={{ borderRadius: r.px, minWidth: 64 }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Post Density ── */}
      <div className="space-y-3">
        <div>
          <SectionLabel icon={Sparkles} label="Post Density" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">Controls spacing inside each post card</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pl-6">
          {DENSITY_OPTIONS.map(d => (
            <button
              key={d.value}
              onClick={() => setDensity(d.value)}
              className={`p-3 text-left rounded-lg border-2 transition-all space-y-0.5 ${
                currentDensity === d.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="text-xs font-semibold">{d.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Font Family ── */}
      <div className="space-y-3">
        <div>
          <SectionLabel icon={Type} label="Font" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">Changes the typeface across the whole app</p>
        </div>
        <div className="pl-6">
          <Select value={currentFont} onValueChange={setFont}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  <span style={{ fontFamily: f.family }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* ── Font Size ── */}
      <div className="space-y-3">
        <div>
          <SectionLabel icon={Type} label="Text Size" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">Adjusts the base reading size</p>
        </div>
        <div className="flex gap-2 pl-6 flex-wrap">
          {FONT_SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => setFontSize(s.value)}
              className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium ${
                currentSize === s.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/40 text-muted-foreground'
              }`}
              style={{ fontSize: s.size }}
            >
              Aa
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2 text-xs text-muted-foreground">
            {FONT_SIZES.find(s => s.value === currentSize)?.label}
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Wallpaper ── */}
      <div className="space-y-3">
        <div>
          <SectionLabel icon={ImageIcon} label="Custom Wallpaper" />
          <p className="text-xs text-muted-foreground pl-6 mt-0.5">
            Set a background image — colors are automatically extracted from it
          </p>
        </div>
        <div className="pl-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{hasWallpaper ? 'Wallpaper active' : 'No wallpaper set'}</p>
            <Switch
              checked={hasWallpaper}
              onCheckedChange={(checked) => {
                if (!checked) {
                  updateConfig(c => { const n = { ...c }; delete n.personalizedTheme; return n; });
                  setTimeout(() => window.location.reload(), 100);
                }
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <PersonalizedThemeManager />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: two-column layout ── */}
      <div className="hidden md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
        {/* Left column: all settings */}
        <div>{settingsControls}</div>

        {/* Right column: sticky live preview */}
        <StickyPreviewPanel {...previewProps} />
      </div>

      {/* ── Mobile: single column + floating preview button ── */}
      <div className="md:hidden">
        {settingsControls}
      </div>

      {/* Floating "Preview" button — mobile only */}
      <div className="fixed bottom-24 right-4 z-50 md:hidden">
        <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              className="h-12 w-12 rounded-full shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center p-0 border-2 border-background/50"
              aria-label="Open live preview"
            >
              <Eye className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto pb-8">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/60" />
                Live Preview
              </SheetTitle>
            </SheetHeader>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <PreviewCard {...previewProps} />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3 px-4 leading-relaxed">
              This updates live as you adjust your appearance settings.
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

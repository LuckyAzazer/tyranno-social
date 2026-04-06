/**
 * ColorPickerButton — compact toolbar colour picker (hue slider + swatches).
 * Uses the shared applyHue utility so behaviour is identical to AppearancePanel.
 */

import { useState } from 'react';
import { Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppContext } from '@/hooks/useAppContext';
import { applyHue, getSavedHue } from '@/lib/applyHue';

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

export function ColorPickerButton() {
  const { config } = useAppContext();
  const [hue, setHue] = useState(getSavedHue);

  if (config.personalizedTheme) return null;

  const handleHue = (h: number) => {
    setHue(h);
    applyHue(h);
  };

  return (
    <div className="hidden sm:block">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">Colors</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-64 p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Theme Color</p>

          {/* Hue slider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative h-5 flex items-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(to right,hsl(0,70%,50%),hsl(60,70%,50%),hsl(120,70%,50%),hsl(180,70%,50%),hsl(240,70%,50%),hsl(300,70%,50%),hsl(360,70%,50%))' }}
              />
              <input
                type="range" min="0" max="360" value={hue}
                onChange={(e) => handleHue(Number(e.target.value))}
                className="relative w-full h-2 appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: 1 }}
              />
            </div>
            <div className="h-7 w-7 rounded-md border border-border shrink-0" style={{ background: `hsl(${hue},65%,45%)` }} />
          </div>

          {/* Preset swatches */}
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map((p) => (
              <button
                key={p.name}
                title={p.name}
                onClick={() => handleHue(p.hue)}
                className="h-7 w-full rounded-md border-2 border-transparent transition-transform hover:scale-110 active:scale-95"
                style={{
                  background: `hsl(${p.hue},65%,45%)`,
                  boxShadow: hue === p.hue ? `0 0 0 2px hsl(${p.hue},65%,45%)` : 'none',
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * ColorThemeSelector — dropdown colour picker used on the Profile page.
 * Uses the shared applyHue utility (primary/ring only, no border tinting).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Paintbrush } from 'lucide-react';
import { applyHue, getSavedHue } from '@/lib/applyHue';

const PRESET_COLORS = [
  { name: 'Burgundy (Default)', hue: 345 },
  { name: 'Blue',               hue: 210 },
  { name: 'Green',              hue: 150 },
  { name: 'Purple',             hue: 270 },
  { name: 'Orange',             hue: 30  },
  { name: 'Pink',               hue: 330 },
  { name: 'Teal',               hue: 180 },
  { name: 'Amber',              hue: 45  },
];

export function ColorThemeSelector() {
  const [hue, setHue] = useState(getSavedHue);

  const handleHue = (h: number) => {
    setHue(h);
    applyHue(h);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Paintbrush className="h-4 w-4" />
          <span className="hidden sm:inline">Colors</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Theme Color</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="p-4 space-y-5">
          {/* Hue slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="360" value={hue}
                onChange={(e) => handleHue(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: 'linear-gradient(to right,hsl(0,70%,50%),hsl(60,70%,50%),hsl(120,70%,50%),hsl(180,70%,50%),hsl(240,70%,50%),hsl(300,70%,50%),hsl(360,70%,50%))' }}
              />
              <div
                className="w-9 h-9 rounded-md border border-border shrink-0"
                style={{ backgroundColor: `hsl(${hue},65%,45%)` }}
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Presets</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.name}
                  title={p.name}
                  onClick={() => handleHue(p.hue)}
                  className="h-8 rounded-md border-2 border-transparent transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: `hsl(${p.hue},65%,45%)`,
                    boxShadow: hue === p.hue ? `0 0 0 2px hsl(${p.hue},65%,45%)` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <DropdownMenuSeparator />

          <Button variant="outline" size="sm" className="w-full" onClick={() => handleHue(345)}>
            Reset to Default
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

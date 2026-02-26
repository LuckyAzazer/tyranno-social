import { useState, useEffect } from 'react';
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
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ColorTheme {
  lightHue: number;
  darkHue: number;
}

const DEFAULT_THEME: ColorTheme = {
  lightHue: 345, // Burgundy/rose
  darkHue: 0, // Red
};

const PRESET_COLORS = [
  { name: 'Burgundy (Default)', lightHue: 345, darkHue: 0 },
  { name: 'Blue', lightHue: 210, darkHue: 220 },
  { name: 'Green', lightHue: 150, darkHue: 140 },
  { name: 'Purple', lightHue: 270, darkHue: 280 },
  { name: 'Orange', lightHue: 30, darkHue: 25 },
  { name: 'Pink', lightHue: 330, darkHue: 340 },
  { name: 'Teal', lightHue: 180, darkHue: 190 },
  { name: 'Amber', lightHue: 45, darkHue: 40 },
];

export function ColorThemeSelector() {
  const [colorTheme, setColorTheme] = useLocalStorage<ColorTheme>(
    'nostr:color-theme',
    DEFAULT_THEME
  );

  const [lightHue, setLightHue] = useState(colorTheme.lightHue);
  const [darkHue, setDarkHue] = useState(colorTheme.darkHue);

  // Apply custom CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;

    // Light mode colors
    root.style.setProperty('--primary', `${lightHue} 65% 45%`);
    root.style.setProperty('--ring', `${lightHue} 65% 45%`);
    root.style.setProperty('--sidebar-primary', `${lightHue} 65% 45%`);
    root.style.setProperty('--sidebar-ring', `${lightHue} 65% 45%`);
    root.style.setProperty('--accent', `${lightHue} 40% 92%`);
    root.style.setProperty('--secondary', `${lightHue} 20% 95%`);
    root.style.setProperty('--muted', `${lightHue} 15% 94%`);
    root.style.setProperty('--border', `${lightHue} 20% 88%`);
    root.style.setProperty('--input', `${lightHue} 20% 88%`);

    // Create a style element for dark mode
    let darkModeStyle = document.getElementById('dark-mode-colors');
    if (!darkModeStyle) {
      darkModeStyle = document.createElement('style');
      darkModeStyle.id = 'dark-mode-colors';
      document.head.appendChild(darkModeStyle);
    }

    darkModeStyle.textContent = `
      .dark {
        /* Apply custom hue to primary and accent colors only */
        --primary: ${darkHue} 70% 60%;
        --ring: ${darkHue} 70% 60%;
        --destructive: ${darkHue === 0 ? '0' : darkHue} 70% 50%;
        --sidebar-primary: ${darkHue} 70% 60%;
        --sidebar-ring: ${darkHue} 70% 60%;
        
        /* Keep backgrounds, cards, and borders neutral gray */
        --background: 0 0% 7%;
        --card: 0 0% 10%;
        --popover: 0 0% 10%;
        --secondary: 0 0% 15%;
        --muted: 0 0% 14%;
        --accent: 0 0% 16%;
        --border: 0 0% 18%;
        --input: 0 0% 18%;
        --sidebar-background: 0 0% 8%;
        --sidebar-accent: 0 0% 14%;
        --sidebar-border: 0 0% 16%;
      }
    `;
  }, [lightHue, darkHue]);

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setLightHue(preset.lightHue);
    setDarkHue(preset.darkHue);
    setColorTheme({ lightHue: preset.lightHue, darkHue: preset.darkHue });
  };

  const handleLightHueChange = (value: number) => {
    setLightHue(value);
    setColorTheme({ lightHue: value, darkHue });
  };

  const handleDarkHueChange = (value: number) => {
    setDarkHue(value);
    setColorTheme({ lightHue, darkHue: value });
  };

  const resetToDefault = () => {
    setLightHue(DEFAULT_THEME.lightHue);
    setDarkHue(DEFAULT_THEME.darkHue);
    setColorTheme(DEFAULT_THEME);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Paintbrush className="h-4 w-4" />
          <span className="hidden sm:inline">Colors</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Theme Colors</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="p-4 space-y-6">
          {/* Light Theme Color */}
          <div className="space-y-2">
            <Label htmlFor="light-hue" className="text-sm font-medium">
              Light Theme
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="light-hue"
                type="range"
                min="0"
                max="360"
                value={lightHue}
                onChange={(e) => handleLightHueChange(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 70%, 50%), 
                    hsl(60, 70%, 50%), 
                    hsl(120, 70%, 50%), 
                    hsl(180, 70%, 50%), 
                    hsl(240, 70%, 50%), 
                    hsl(300, 70%, 50%), 
                    hsl(360, 70%, 50%))`,
                }}
              />
              <div
                className="w-10 h-10 rounded-md border-2 border-border shrink-0"
                style={{ backgroundColor: `hsl(${lightHue}, 65%, 45%)` }}
              />
            </div>
          </div>

          {/* Dark Theme Color */}
          <div className="space-y-2">
            <Label htmlFor="dark-hue" className="text-sm font-medium">
              Dark Theme
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="dark-hue"
                type="range"
                min="0"
                max="360"
                value={darkHue}
                onChange={(e) => handleDarkHueChange(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 70%, 50%), 
                    hsl(60, 70%, 50%), 
                    hsl(120, 70%, 50%), 
                    hsl(180, 70%, 50%), 
                    hsl(240, 70%, 50%), 
                    hsl(300, 70%, 50%), 
                    hsl(360, 70%, 50%))`,
                }}
              />
              <div
                className="w-10 h-10 rounded-md border-2 border-border shrink-0"
                style={{ backgroundColor: `hsl(${darkHue}, 60%, 55%)` }}
              />
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Preset Colors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Presets</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group relative aspect-square rounded-md border-2 border-border hover:border-primary transition-colors overflow-hidden"
                  title={preset.name}
                >
                  <div
                    className="absolute inset-0 top-0 bottom-1/2"
                    style={{ backgroundColor: `hsl(${preset.lightHue}, 65%, 45%)` }}
                  />
                  <div
                    className="absolute inset-0 top-1/2 bottom-0"
                    style={{ backgroundColor: `hsl(${preset.darkHue}, 60%, 55%)` }}
                  />
                  {lightHue === preset.lightHue && darkHue === preset.darkHue && (
                    <div className="absolute inset-0 bg-white/20 border-2 border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="w-full"
          >
            Reset to Default
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

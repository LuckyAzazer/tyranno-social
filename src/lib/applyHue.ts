/**
 * applyHue — single source of truth for theme colour changes.
 *
 * Only --primary and --ring follow the chosen hue.
 * All neutral surfaces (borders, backgrounds, muted, sidebar) stay pure
 * grey so the G+ clean aesthetic is preserved regardless of accent colour.
 */
export function applyHue(h: number): void {
  localStorage.setItem('nostr:color-hue', String(h));
  const root = document.documentElement;

  root.style.setProperty('--primary', `${h} 65% 45%`);
  root.style.setProperty('--ring',    `${h} 65% 45%`);
  root.style.setProperty('--sidebar-primary', `${h} 65% 45%`);
  root.style.setProperty('--sidebar-ring',    `${h} 65% 45%`);

  // Remove any previously-tinted neutrals
  for (const prop of ['--accent', '--secondary', '--muted', '--border', '--input']) {
    root.style.removeProperty(prop);
  }

  // Dark mode: only primary/ring pick up the hue
  let style = document.getElementById('dark-mode-colors');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dark-mode-colors';
    document.head.appendChild(style);
  }
  style.textContent =
    `.dark{--primary:${h} 70% 60%;--ring:${h} 70% 60%;--sidebar-primary:${h} 70% 60%;--sidebar-ring:${h} 70% 60%;}`;
}

/** Read the saved hue from localStorage (defaults to 345° burgundy). */
export function getSavedHue(): number {
  try {
    return parseInt(localStorage.getItem('nostr:color-hue') ?? '345') || 345;
  } catch {
    return 345;
  }
}

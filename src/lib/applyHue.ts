/**
 * applyHue — applies the chosen hue to every theme CSS variable.
 *
 * Both light and dark mode variables are updated so the entire UI
 * — backgrounds, borders, muted areas, sidebar, accents — all shift
 * to reflect the chosen color.
 */
export function applyHue(h: number): void {
  localStorage.setItem('nostr:color-hue', String(h));
  const root = document.documentElement;

  // ── Light mode variables ───────────────────────────────────────────────────
  root.style.setProperty('--background',            `${h} 25% 98%`);
  root.style.setProperty('--foreground',            `${h} 15% 15%`);
  root.style.setProperty('--card',                  `${h} 10% 100%`);
  root.style.setProperty('--card-foreground',       `${h} 15% 15%`);
  root.style.setProperty('--popover',               `${h} 10% 100%`);
  root.style.setProperty('--popover-foreground',    `${h} 15% 15%`);
  root.style.setProperty('--primary',               `${h} 65% 45%`);
  root.style.setProperty('--primary-foreground',    `0 0% 100%`);
  root.style.setProperty('--secondary',             `${h} 20% 95%`);
  root.style.setProperty('--secondary-foreground',  `${h} 15% 15%`);
  root.style.setProperty('--muted',                 `${h} 15% 94%`);
  root.style.setProperty('--muted-foreground',      `${h} 8% 42%`);
  root.style.setProperty('--accent',                `${h} 40% 92%`);
  root.style.setProperty('--accent-foreground',     `${h} 15% 15%`);
  root.style.setProperty('--border',                `${h} 20% 88%`);
  root.style.setProperty('--input',                 `${h} 20% 88%`);
  root.style.setProperty('--ring',                  `${h} 65% 45%`);
  root.style.setProperty('--sidebar-background',    `${h} 15% 97%`);
  root.style.setProperty('--sidebar-foreground',    `${h} 12% 30%`);
  root.style.setProperty('--sidebar-primary',       `${h} 65% 45%`);
  root.style.setProperty('--sidebar-primary-foreground', `0 0% 100%`);
  root.style.setProperty('--sidebar-accent',        `${h} 20% 95%`);
  root.style.setProperty('--sidebar-accent-foreground', `${h} 15% 15%`);
  root.style.setProperty('--sidebar-border',        `${h} 15% 90%`);
  root.style.setProperty('--sidebar-ring',          `${h} 65% 45%`);

  // ── Dark mode overrides (injected as a <style> tag) ────────────────────────
  let style = document.getElementById('hue-dark-overrides');
  if (!style) {
    style = document.createElement('style');
    style.id = 'hue-dark-overrides';
    document.head.appendChild(style);
  }
  style.textContent = `
    .dark {
      --background:                  ${h} 10% 7%;
      --foreground:                  ${h} 5% 98%;
      --card:                        ${h} 10% 10%;
      --card-foreground:             ${h} 5% 98%;
      --popover:                     ${h} 10% 10%;
      --popover-foreground:          ${h} 5% 98%;
      --primary:                     ${h} 70% 60%;
      --primary-foreground:          0 0% 100%;
      --secondary:                   ${h} 8% 15%;
      --secondary-foreground:        ${h} 5% 90%;
      --muted:                       ${h} 8% 14%;
      --muted-foreground:            ${h} 5% 65%;
      --accent:                      ${h} 10% 16%;
      --accent-foreground:           ${h} 5% 98%;
      --border:                      ${h} 8% 18%;
      --input:                       ${h} 8% 18%;
      --ring:                        ${h} 70% 60%;
      --sidebar-background:          ${h} 10% 8%;
      --sidebar-foreground:          ${h} 5% 95%;
      --sidebar-primary:             ${h} 70% 60%;
      --sidebar-primary-foreground:  0 0% 100%;
      --sidebar-accent:              ${h} 8% 14%;
      --sidebar-accent-foreground:   ${h} 5% 95%;
      --sidebar-border:              ${h} 8% 16%;
      --sidebar-ring:                ${h} 70% 60%;
    }
  `;
}

/** Read the saved hue from localStorage (defaults to 345° burgundy). */
export function getSavedHue(): number {
  try {
    return parseInt(localStorage.getItem('nostr:color-hue') ?? '345') || 345;
  } catch {
    return 345;
  }
}

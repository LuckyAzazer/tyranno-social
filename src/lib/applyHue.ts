/**
 * applyHue — applies the chosen hue to every theme CSS variable.
 *
 * All variables are written into a single injected <style> tag (never as
 * inline styles on :root) so that the .dark selector can properly override
 * the :root values — inline styles always win over stylesheet rules, which
 * would break dark mode if we used root.style.setProperty().
 */
export function applyHue(h: number): void {
  localStorage.setItem('nostr:color-hue', String(h));

  let style = document.getElementById('hue-overrides');
  if (!style) {
    style = document.createElement('style');
    style.id = 'hue-overrides';
    document.head.appendChild(style);
  }

  style.textContent = `
    :root {
      --background:                  ${h} 25% 98%;
      --foreground:                  ${h} 15% 15%;
      --card:                        ${h} 10% 100%;
      --card-foreground:             ${h} 15% 15%;
      --popover:                     ${h} 10% 100%;
      --popover-foreground:          ${h} 15% 15%;
      --primary:                     ${h} 65% 45%;
      --primary-foreground:          0 0% 100%;
      --secondary:                   ${h} 20% 95%;
      --secondary-foreground:        ${h} 15% 15%;
      --muted:                       ${h} 15% 94%;
      --muted-foreground:            ${h} 8% 42%;
      --accent:                      ${h} 40% 92%;
      --accent-foreground:           ${h} 15% 15%;
      --border:                      ${h} 20% 88%;
      --input:                       ${h} 20% 88%;
      --ring:                        ${h} 65% 45%;
      --sidebar-background:          ${h} 15% 97%;
      --sidebar-foreground:          ${h} 12% 30%;
      --sidebar-primary:             ${h} 65% 45%;
      --sidebar-primary-foreground:  0 0% 100%;
      --sidebar-accent:              ${h} 20% 95%;
      --sidebar-accent-foreground:   ${h} 15% 15%;
      --sidebar-border:              ${h} 15% 90%;
      --sidebar-ring:                ${h} 65% 45%;
    }

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

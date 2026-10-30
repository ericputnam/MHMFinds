import { Anybody, Chakra_Petch, Onest } from 'next/font/google';

/**
 * Launcher homepage type ramp (display / HUD numerals / body). Exposed as CSS
 * variables on the `.lx` root only, so no other page pays for these files.
 */
export const lxDisplay = Anybody({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--lx-font-display',
});

export const lxHud = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--lx-font-hud',
});

export const lxBody = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--lx-font-body',
  // next@14.0 ships no fallback metrics for Onest and logs
  // "Failed to find font override values" on every build without this.
  adjustFontFallback: false,
});

export const lxFontVars = `${lxDisplay.variable} ${lxHud.variable} ${lxBody.variable}`;

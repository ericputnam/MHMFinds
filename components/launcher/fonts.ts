import localFont from 'next/font/local';

/**
 * Launcher homepage type ramp (display / HUD numerals / body). Exposed as CSS
 * variables on the `.lx` root only, so no other page pays for these files.
 *
 * SELF-HOSTED ON PURPOSE — do not switch back to `next/font/google`.
 * `next/font/google` downloads the font files from fonts.gstatic.com *during
 * `next build`*, so every production build depended on that network fetch.
 * It timed out (ETIMEDOUT on the Onest files) on 5 Vercel builds in 5 days
 * (#468 11-05, #473 + #474 11-06, 6d06235 11-08 → incident 2026-11-08-191540,
 * 7895670 11-09). Each one was a BUILD ERROR plus a manual redeploy.
 * `__tests__/unit/no-google-fonts-at-build.test.ts` fails if any source file
 * imports `next/font/google` again.
 *
 * The files in ./fonts/ are the exact latin-subset woff2 files Google serves
 * for the previous config (same family, weights, `subsets: ['latin']`), so
 * Latin text renders identically. See ./fonts/README.md for sources and
 * licence (SIL OFL 1.1).
 */
export const lxDisplay = localFont({
  // Variable font (wght axis); covers the 600/700/800 weights used before.
  src: [{ path: './fonts/Anybody-latin-wght.woff2', weight: '600 800', style: 'normal' }],
  display: 'swap',
  variable: '--lx-font-display',
});

export const lxHud = localFont({
  src: [
    { path: './fonts/ChakraPetch-latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ChakraPetch-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/ChakraPetch-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--lx-font-hud',
});

export const lxBody = localFont({
  // Variable font (wght axis); covers the 400–800 weights used before.
  src: [{ path: './fonts/Onest-latin-wght.woff2', weight: '400 800', style: 'normal' }],
  display: 'swap',
  variable: '--lx-font-body',
  // Kept from the next/font/google config so fallback rendering is unchanged.
  adjustFontFallback: false,
});

export const lxFontVars = `${lxDisplay.variable} ${lxHud.variable} ${lxBody.variable}`;

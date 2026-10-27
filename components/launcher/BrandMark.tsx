import React from 'react';

/**
 * Launcher logo: the site's map-pin mark (same shape as app/icon.png) in a
 * squircle tinted by the current game accent, plus a mixed-case wordmark.
 * Shared by the header and the homepage footer.
 */
export function BrandMark() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="#fff"
            fillRule="evenodd"
            d="M12 2.2c-4.2 0-7.6 3.3-7.6 7.5 0 4.6 5.3 10.4 6.9 12a1 1 0 0 0 1.4 0c1.6-1.6 6.9-7.4 6.9-12 0-4.2-3.4-7.5-7.6-7.5Zm0 4.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z"
          />
        </svg>
      </span>
      <span className="brand-word">
        MustHave<span className="bw-accent">Mods</span>
      </span>
    </>
  );
}

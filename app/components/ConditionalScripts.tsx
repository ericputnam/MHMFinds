'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';

export function ConditionalScripts() {
  const pathname = usePathname();
  const [shouldLoadAds, setShouldLoadAds] = useState(false);

  useEffect(() => {
    // Only load ad scripts on non-admin pages
    const isAdminPage = pathname?.startsWith('/admin');
    setShouldLoadAds(!isAdminPage);
  }, [pathname]);

  // Use test script in development, production script on Vercel
  const mediavineScript = process.env.NODE_ENV === 'production'
    ? '//scripts.mediavine.com/tags/must-have-mods-new-owner.js'
    : '//scripts.mediavine.com/tags/mediavine-scripty-boi.js';

  if (!shouldLoadAds) {
    return null;
  }

  return (
    <>
      <Script
        id="mediavine-script"
        strategy="afterInteractive"
        src={mediavineScript}
        data-noptimize="1"
        data-cfasync="false"
      />
    </>
  );
}

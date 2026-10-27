'use client';

import React from 'react';

function pageWindow(cur: number, total: number): Array<number | '…'> {
  const out: Array<number | '…'> = [];
  const lo = Math.max(2, cur - 2);
  const hi = Math.min(total - 1, cur + 2);
  out.push(1);
  if (lo > 2) out.push('…');
  for (let p = lo; p <= hi; p++) out.push(p);
  if (hi < total - 1) out.push('…');
  if (total > 1) out.push(total);
  return out;
}

export function LauncherPager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" className="pg-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        ‹
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`d${i}`} className="pg-dots" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className="pg-btn tabular"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        )
      )}
      <button type="button" className="pg-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
        ›
      </button>
    </nav>
  );
}

# MHM Ideas Backlog

The team's living pipeline. Agents append on Monday; Sterling ranks on Tuesday;
operator approves on Wednesday (👍/👎). **Every weekly batch must include ≥1
non-code revenue idea.**

**States:** Proposed → Approved → In Progress → Shipped → Measured → Kept / Killed
**ROI** = est. $/mo ÷ effort points (S=1, M=3, L=9); advance if >50. Ad-revenue
items carry a 1.5× RPM-priority multiplier (current company priority).

---

## Week of 2026-06-22 — proposed batch (awaiting operator approval)

**Sterling's recommendation: approve the top 5 first.**

| # | Idea | Owner | Type | Est. $/mo | Effort | ROI | Status | Measured by |
|---|---|---|---|---|---|---|---|---|
| 1 | ~~Mediavine floor/CPM negotiation~~ | Max | Non-code | — | — | — | ❌ KILLED | see killed log |
| 2 | Right-size Prisma tier + expand Accelerate caching on hot read paths (cut DB compute) | Mark/eng | Code | +$20–100 saved | M | 40 | Proposed | Prisma usage (ops/compute) + bill before/after |
| 3 | Promote EXISTING MHM Patreon on-site (tracked support CTA) | Tim/Mark | Code | +$50–250 | S | 150 | Proposed | GA4 outbound clicks → Patreon members |
| 4 | Mediavine Video / Universal Player activation (publisher rep) | Max | Non-code | +$400–1200 | M | 267 | Proposed | Session-RPM delta; video fill rate |
| 5 | Title/meta blitz on top-20 GSC quick-win pages | Tim | Code | +$56–200 | S | 128 | Proposed | GSC clicks WoW on targeted pages, 4-wk |
| 6 | Countdown 10s→15s on high-traffic /go pages | Mark/Max | Code | +$80–150 | S | 115 | Proposed | /go session duration; interstitial RPM |
| 7 | Pinterest roundup pin strategy (weekly pins) | Tim | Non-code | +$50–200 | M | 42 | Proposed | Pinterest referral sessions (GA4) |
| 8 | Sims patch-day content calendar | Tim | Non-code | +$100–500 | M | 100 | Proposed | Organic spikes on patch-day posts; GSC |
| 9 | Affiliate program for Sims CC creators (3–5 creators) | Mark | Non-code | +$150–500 | M | 108 | Proposed | Affiliate revenue line in P&L |
| 10 | /go interstitial ad-density audit + countdown A/B | Max | Code | +$150–400 | M | 138 | Proposed | Revenue per /go pageview before/after |
| 11 | New collection pages for untapped keyword clusters | Tim | Code | +$30–200 | M | 38 | Proposed | GSC clicks on new pages, 6-wk |
| 12 | Direct sponsorship of "New This Week" page (outbound sales) | Max | Non-code | +$200–600 | L | 44 | Proposed | Sponsorship revenue; signed deals |

| 13 | Move batch AI generation (modBlockParser, aiFacetExtractor, ai-cleanup-mods + pinner pin-titles) OpenAI→Claude via Max subscription; keep embeddings on OpenAI | Mark/eng | Code | +$20 (cancel ChatGPT Plus) + small API savings | S | 90 | Proposed | OpenAI API spend before/after; ChatGPT Plus cancelled |

_#11–12 are near/below the ROI>50 threshold — hold unless higher items are exhausted._

---

## Killed log (never re-propose without stating what changed)

- **2026-06-24 — Mediavine floor/CPM negotiation (was #1).** Operator already
  pitched Mediavine directly. Answer was **no** — "you have done everything to your
  site that we recommend." Do not re-propose unless our traffic profile materially
  changes (e.g. a big new high-CPM content vertical) that gives fresh leverage.

> ⚠️ **$ estimate correction (2026-06-24):** SEO/traffic ideas must convert at
> **clicks × session-RPM ÷ 1000** (≈ **$0.022 per incremental session** at today's
> $22 RPM). Earlier title/meta dollar figures were overstated ~25–40×. A title fix
> worth "+1,000 clicks/mo" is **~$22/mo**, not hundreds. SEO's value here is
> low-cost + compounding + Pinterest-diversification — NOT large near-term $.

---

## Shipped & measured (kept wins)

- **2026-06-24 — SurferSEO cancelled, −$106.80/mo.** Operator confirmed the tool
  was not delivering value; cancelled. First banked saving. Drops straight to net
  take-home. (Trade-off accepted: SEO content work proceeds without SurferSEO.)
- **2026-06-24 — ChatGPT Plus cancelled, −$20/mo.** Underused (only occasional
  image gen). Separate from OpenAI API automations, which are unaffected. Open gap:
  no image-gen tool now — use a free fallback (Bing Image Creator / MS Designer) if needed.
- **Running total banked: −$126.80/mo (~$1,520/yr).**

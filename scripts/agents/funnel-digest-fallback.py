#!/usr/bin/env python3
"""scripts/agents/funnel-digest-fallback.py — make sure the operator always gets a real digest.

Called by run-funnel-daily.sh after Quinn exits. Three jobs:

  1. Decide whether Quinn's digest file (or its stdout) is a usable digest. A usable digest has the
     five-section shape from .claude/agents/mhm-gm.md — at least sections 1, 2 and 3 — and enough
     lines to carry content. A one-line "Cleanup done … waiting on the PR #101 verify" (2026-09-14,
     Quinn hit --max-turns before step 9) is NOT a digest and must never be saved as one.
  2. If Quinn's digest carries the `<!-- LEDGER -->` placeholder the prompt asks for in the skeleton,
     replace it with today's rows from reports/funnel/changelog.md so "3. Changed today" is complete
     even when a deploy-verify was still running when Quinn wrote the file.
  3. Otherwise synthesize a digest from the deterministic sources that ran today — scoreboard,
     circuit breaker, ledger, incidents, operator queue, experiments — clearly marked SYNTHESIZED,
     with Quinn's last stdout line quoted so the operator knows where it stopped.

Usage:
  funnel-digest-fallback.py --today YYYY-MM-DD --wt <quinn worktree> --project-dir <operator tree>
      --quinn-out <quinn stdout file> --guard-status green|yellow|red --guard-action <action>
      --out <digest path to write>
Exit 0 = wrote Quinn's digest (possibly with the ledger filled in); 3 = wrote a synthesized digest.
Prints one status line for the runner log.
"""
import argparse
import os
import re
import sys

SECTION_RE = re.compile(r"^#{1,3}\s*\**\s*([1-5])\.\s*(Status|What you need to do|Changed today|Team|One insight)", re.I | re.M)
LEDGER_PLACEHOLDER = "<!-- LEDGER -->"
LEDGER_HEADER = "| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|"


def read(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return ""


def is_digest(text):
    """Sections 1-3 present and at least 12 non-empty lines."""
    if not text:
        return False
    found = {m.group(1) for m in SECTION_RE.finditer(text)}
    lines = [l for l in text.splitlines() if l.strip()]
    return {"1", "2", "3"} <= found and len(lines) >= 12


def ledger_rows(project_dir, wt, today):
    rows = []
    seen = set()
    for d in (wt, project_dir):
        for l in read(os.path.join(d, "reports/funnel/changelog.md")).splitlines():
            if l.startswith(f"| {today} ") and l not in seen:
                seen.add(l)
                rows.append(l)
    rows.sort()
    return rows


def ledger_table(rows):
    if not rows:
        return "Nothing changed in production today (no ledger row dated today)."
    return LEDGER_HEADER + "\n" + "\n".join(rows)


def incidents_today(project_dir, wt, today):
    names = set()
    for d in (wt, project_dir):
        p = os.path.join(d, "reports/funnel/incidents")
        if os.path.isdir(p):
            names.update(n for n in os.listdir(p) if today in n)
    return sorted(names)


def section(text, heading_re):
    """Body of the first '## <heading>' section (up to the next '## ')."""
    m = re.search(r"^## .*" + heading_re + r".*$", text, re.I | re.M)
    if not m:
        return ""
    rest = text[m.end():]
    nxt = re.search(r"^## ", rest, re.M)
    return (rest[: nxt.start()] if nxt else rest).strip()


def first_table(body):
    lines = body.splitlines()
    out, on = [], False
    for l in lines:
        if l.startswith("|"):
            out.append(l)
            on = True
        elif on:
            break
    return "\n".join(out)


def queue_items(queue_text, today):
    """Open Tier 2 decisions (### Q…) and pending Tier 1 (### T1 …) headers, newest first as written."""
    open_q, pending_t1 = [], []
    for m in re.finditer(r"^### (Q\d+|T1)\s*·\s*(.+)$", queue_text, re.M):
        kind, title = m.group(1), m.group(2).strip()
        closed = re.search(r"\b(SHIPPED|CLOSED|DONE|REJECTED)\b", title)
        title = re.sub(r"\*\*", "", title)
        if kind.startswith("Q"):
            if closed:
                continue
            body_start = m.end()
            nxt = re.search(r"^### ", queue_text[body_start:], re.M)
            body = queue_text[body_start: body_start + nxt.start()] if nxt else queue_text[body_start:]
            reply = re.search(r"\*\*Reply:\*\*\s*(.+)", body)
            silence = re.search(r"\*\*If you say nothing:\*\*\s*(.+)", body)
            open_q.append((kind, title[:140], (reply.group(1).strip() if reply else "see queue")[:120],
                           (silence.group(1).strip() if silence else "—")[:120]))
        else:
            if closed:
                continue
            pending_t1.append(title[:160])
    return open_q, pending_t1


def experiments_today(text, today):
    rows = []
    for l in text.splitlines():
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        if len(cells) >= 6 and cells[1] == today and cells[0].startswith("E"):
            rows.append((cells[0], cells[2], cells[3], cells[5][:110]))
    return rows


def synthesize(a, quinn_last):
    wt, pd, today = a.wt, a.project_dir, a.today
    scoreboard = read(os.path.join(wt, f"reports/funnel/{today}.md")) or read(os.path.join(pd, f"reports/funnel/{today}.md"))
    guard = read(os.path.join(wt, f"reports/funnel/guardrail-{today}.md")) or read(os.path.join(pd, f"reports/funnel/guardrail-{today}.md"))
    queue = read(os.path.join(wt, ".claude/agents/mhm-funnel/operator-queue.md")) or read(os.path.join(pd, ".claude/agents/mhm-funnel/operator-queue.md"))
    experiments = read(os.path.join(wt, ".claude/agents/mhm-funnel/experiments.md")) or read(os.path.join(pd, ".claude/agents/mhm-funnel/experiments.md"))
    rows = ledger_rows(pd, wt, today)
    incidents = incidents_today(pd, wt, today)

    icon = {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(a.guard_status, "⚪")
    guard_line = next((l.strip("- ").strip() for l in guard.splitlines() if l.startswith("- Revenue")), "guardrail report unavailable")
    flags = section(scoreboard, "Flags") or "none reported"
    ad_table = first_table(section(scoreboard, "Ad revenue"))
    aud_table = first_table(section(scoreboard, "Audience"))
    owned_table = first_table(section(scoreboard, "Owned audience"))

    out = []
    out.append(f"# Funnel digest — {today} (SYNTHESIZED: Quinn did not write the digest)")
    out.append("")
    out.append("⚠️ **Quinn finished without writing the digest** (usually --max-turns ran out after the last merge). "
               "The runner built this from the scoreboard, circuit breaker, ledger, incidents and operator queue — "
               "every number below comes from those files, none is invented. Sections 4 and 5 are therefore thin.")
    if quinn_last:
        out.append(f"Quinn's last line: \"{quinn_last[:300]}\"")
    out.append("")
    out.append("## 1. Status")
    verdict = f"{icon} Circuit breaker {a.guard_status} → {a.guard_action}. {guard_line}."
    if incidents:
        verdict = f"🔴 {len(incidents)} incident file(s) today — see INCIDENT below. " + verdict
    out.append(verdict)
    out.append("")
    if ad_table:
        out.append("Ad revenue (Mediavine, from the scoreboard):")
        out.append(ad_table)
        out.append("")
    if aud_table:
        out.append("Sessions by channel, 7d (GA4, from the scoreboard):")
        out.append(aud_table)
        out.append("")
    if owned_table:
        out.append("Owned audience (production DB):")
        out.append(owned_table)
        out.append("")
    out.append("Flags:")
    out.append(flags)
    out.append("")
    out.append("## 2. What you need to do")
    open_q, pending_t1 = queue_items(queue, today)
    if not open_q and not pending_t1:
        out.append("Nothing needs you today (no open Tier 2 item in the operator queue).")
    if open_q:
        out.append("### Reply needed (Tier 2) — as ordered in the queue")
        out.append("| # | Decision | Reply with | If you say nothing |")
        out.append("|---|---|---|---|")
        for kind, title, reply, silence in open_q:
            out.append(f"| {kind} | {title} | {reply} | {silence} |")
        out.append("")
    if pending_t1:
        out.append("### Ships next unless you say \"stop N\" (Tier 1, still open in the queue)")
        for t in pending_t1:
            out.append(f"- {t}")
        out.append("")
    out.append("Full text and reply strings: .claude/agents/mhm-funnel/operator-queue.md")
    out.append("")
    out.append("## 3. Changed today")
    passes = sum(1 for r in rows if "| PASS |" in r)
    fails = sum(1 for r in rows if re.search(r"\| (FAIL|ROLLED BACK|BUILD ERROR|INCONCLUSIVE|MISSED)", r))
    out.append(f"{len(rows)} ledger row(s) today: {passes} PASS, {fails} not PASS." if rows else "Nothing changed in production today.")
    out.append(ledger_table(rows))
    out.append("")
    out.append("## 4. Team")
    ex = experiments_today(experiments, today)
    if ex:
        out.append("From experiments.md rows dated today (owner · tier · move):")
        for eid, owner, tier, move in ex:
            out.append(f"- [{owner}] {eid} · Tier {tier} · {move}")
    else:
        out.append("No experiments.md row dated today; per-agent status was not written.")
    out.append("")
    out.append("## 5. One insight")
    out.append("Not written — Quinn ran out of turns before step 9. Fix in the prompt: the skeleton digest is written before the first merge.")
    if incidents:
        out.append("")
        out.append("## INCIDENT")
        for n in incidents:
            out.append(f"- reports/funnel/incidents/{n}")
    return "\n".join(out) + "\n"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--today", required=True)
    p.add_argument("--wt", required=True)
    p.add_argument("--project-dir", required=True)
    p.add_argument("--quinn-out", required=True)
    p.add_argument("--guard-status", default="unknown")
    p.add_argument("--guard-action", default="none")
    p.add_argument("--out", required=True)
    a = p.parse_args()

    digest_path = os.path.join(a.wt, f"reports/funnel/digest-{a.today}.md")
    file_text = read(digest_path)
    stdout_text = read(a.quinn_out)
    quinn_last = next((l.strip() for l in reversed(stdout_text.splitlines()) if l.strip()), "")

    source, text = None, None
    if is_digest(file_text):
        source, text = "file", file_text
    elif is_digest(stdout_text):
        source, text = "stdout", stdout_text  # Quinn returned the digest as its final message but never wrote it

    rows = ledger_rows(a.project_dir, a.wt, a.today)
    if text is not None:
        if LEDGER_PLACEHOLDER in text:
            text = text.replace(LEDGER_PLACEHOLDER, ledger_table(rows))
            note = f" ({LEDGER_PLACEHOLDER} filled with {len(rows)} ledger rows)"
        else:
            note = ""
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"digest: Quinn's {source} digest accepted{note}")
        return 0

    text = synthesize(a, quinn_last)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(text)
    why = "empty" if not (file_text or stdout_text).strip() else f"not a digest ({len([l for l in (file_text or stdout_text).splitlines() if l.strip()])} non-empty lines, sections missing)"
    print(f"digest: SYNTHESIZED — Quinn's file/stdout was {why}; {len(rows)} ledger rows, last line: {quinn_last[:120]!r}")
    return 3


if __name__ == "__main__":
    sys.exit(main())

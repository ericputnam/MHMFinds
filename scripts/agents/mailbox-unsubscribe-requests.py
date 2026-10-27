#!/usr/bin/env python3
"""
mailbox-unsubscribe-requests.py — find unsubscribe requests that arrived by EMAIL
(2026-10-26).

Every list message carries `List-Unsubscribe: <https://…>, <mailto:simsnews@…?subject=
unsubscribe%20<address>>`. Gmail, Apple Mail and Outlook use the mailto form when the
https one is unavailable, and people also just reply "unsubscribe". Until this script,
nothing read those messages: the request sat in the inbox and the next send mailed
them again — a CAN-SPAM violation (opt-outs must be honoured within 10 business days).

    python3 scripts/agents/mailbox-unsubscribe-requests.py --since 2026-09-01
    python3 scripts/agents/mailbox-unsubscribe-requests.py --self-test

Output is ONE JSON object on stdout, consumed by `process-unsubscribe-mailbox.ts`:
    {"status": "ok", "requests": [{"hash", "via", "requestedAt"}], "counts": {...}}
Hashes only — sha256(lower(trim(address))), the key `email_suppressions` uses. No
address, subject, body or env value is ever printed.

What counts as a request (deliberately conservative about *who*, generous about *how*):
  * subject  — the subject (after Re:/Fwd: prefixes) starts with "unsubscribe",
               "remove me", "opt out" or "stop". Both the sender and any address named
               in the subject (our mailto form puts it there) are suppressed.
  * reply    — a reply to one of our campaigns (subject carries a CAMPAIGN_SUBJECTS
               needle) whose own text — above the quoted original — asks to stop.
Skipped: DSNs, auto-replies, complaint reports, bulk/list mail (it carries
List-Unsubscribe / List-Id / Precedence: bulk — every newsletter has "unsubscribe" in its
footer), and mail from our own domain. `Auto-Submitted` mail is skipped for the reply
form only: a client acting on our mailto header may legitimately set it.

The request time is the server's INTERNALDATE (not the sender-controlled Date header).

Exit codes: 0 = scanned completely, 2 = could not run (missing env, IMAP unreachable, a
folder that must be read could not be, or a message could not be fetched). A partial scan
is never reported as "no requests": the send scripts refuse to send on exit 2.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date, datetime, timezone
from email.message import Message
from email.utils import getaddresses, parsedate_to_datetime

from _mailbox_readonly import (  # noqa: E402
    AUTOREPLY_RE,
    CAMPAIGN_SUBJECTS,
    COMPLAINT_RE,
    DSN_SUBJECT_RE,
    ENV_FILE,
    SPAM_FOLDER_RE,
    CouldNotRun,
    ReadOnlyMailbox,
    header_text,
    walk_parts,
)

# First list send was 2026-09-07 (E44 test) / 09-14 (issue #1); nothing earlier can be a reply.
DEFAULT_SINCE = "2026-09-01"
OWN_DOMAIN = "musthavemods.com"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
REPLY_PREFIX_RE = re.compile(r"^\s*(?:(?:re|fwd?|aw|sv|tr)\s*(?:\[\d+\])?\s*:\s*)+", re.I)
SUBJECT_REQUEST_RE = re.compile(r"^(?:unsubscribe|un-subscribe|remove me|opt[- ]?out|stop)\b", re.I)
# Phrases that ask us to stop. Matched only in the sender's own text above the quote.
BODY_REQUEST_RE = re.compile(
    r"(\bunsubscribe\b|\bun-subscribe\b|\bremove me\b|\bopt(?:[- ])?out\b|\btake me off\b|"
    r"\bstop (?:sending|emailing|e-mailing|mailing)\b|\bno more (?:e-?mails?|newsletters?)\b|"
    r"^\s*stop\s*[.!]*\s*$)",
    re.I | re.M,
)
QUOTE_START_RE = re.compile(
    r"^(>|On .{0,200}wrote:\s*$|-{2,}\s*Original Message|_{5,}|From:\s|Sent from my |Le .{0,200}a écrit)",
    re.I,
)
TOP_TEXT_LIMIT = 800


def hash_address(addr: str) -> str:
    return hashlib.sha256(addr.strip().lower().encode("utf-8")).hexdigest()


def is_campaign_subject(subject: str) -> bool:
    s = subject.lower()
    return any(needle.lower() in s for needle in CAMPAIGN_SUBJECTS.values())


def own_text(msg: Message) -> str:
    """The sender's text above the quoted original, from the first text/plain part
    (or tag-stripped text/html). Bounded, so a long quoted newsletter cannot match."""
    body = ""
    for want in ("text/plain", "text/html"):
        for part in walk_parts(msg):
            if part.get_content_type() != want or part.get_filename():
                continue
            try:
                raw = part.get_payload(decode=True) or b""
                body = raw.decode(part.get_content_charset() or "utf-8", "replace")
            except Exception:
                continue
            if want == "text/html":
                body = re.sub(r"(?is)<(blockquote|style|script)\b.*", "", body)
                body = re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", body)
                body = re.sub(r"<[^>]+>", " ", body)
            break
        if body:
            break
    lines: list[str] = []
    for line in body.splitlines():
        if QUOTE_START_RE.search(line.strip()):
            break
        lines.append(line)
    return "\n".join(lines)[:TOP_TEXT_LIMIT]


def is_bulk(msg: Message) -> bool:
    """Someone else's list mail — every newsletter has "unsubscribe" in its footer."""
    if msg.get("List-Unsubscribe") or msg.get("List-Id"):
        return True
    return header_text(msg, "Precedence").strip().lower() in ("bulk", "list", "junk")


def is_auto_submitted(msg: Message) -> bool:
    auto = header_text(msg, "Auto-Submitted").strip().lower()
    return bool(auto) and auto != "no"


def sender(msg: Message) -> str:
    addrs = [a for _, a in getaddresses([header_text(msg, "From")]) if "@" in a]
    return addrs[0].strip().lower() if addrs else ""


def classify(msg: Message) -> dict:
    """{"via": "subject"|"reply"|None, "skip": reason|None, "addresses": [...]}. Pure; self-tested."""
    subject = header_text(msg, "Subject")
    ctype = header_text(msg, "Content-Type").lower()
    frm = sender(msg)
    if not frm:
        return {"via": None, "skip": "no-sender", "addresses": []}
    if frm.endswith("@" + OWN_DOMAIN) or frm.endswith("." + OWN_DOMAIN):
        return {"via": None, "skip": "own-domain", "addresses": []}
    if "delivery-status" in ctype or "feedback-report" in ctype or DSN_SUBJECT_RE.search(subject):
        return {"via": None, "skip": "dsn", "addresses": []}
    if COMPLAINT_RE.search(subject):
        return {"via": None, "skip": "complaint", "addresses": []}
    if AUTOREPLY_RE.search(subject):
        return {"via": None, "skip": "auto-reply", "addresses": []}
    if is_bulk(msg):
        return {"via": None, "skip": "bulk", "addresses": []}

    # A mail client acting on our List-Unsubscribe mailto may mark its message
    # Auto-Submitted — that is still the user's request, so the subject form is checked first.
    bare = REPLY_PREFIX_RE.sub("", subject).strip()
    if SUBJECT_REQUEST_RE.match(bare):
        named = [a.lower() for a in EMAIL_RE.findall(bare) if not a.lower().endswith("@" + OWN_DOMAIN)]
        return {"via": "subject", "skip": None, "addresses": sorted({frm, *named})}
    if is_auto_submitted(msg):
        return {"via": None, "skip": "auto-submitted", "addresses": []}
    if is_campaign_subject(subject) and BODY_REQUEST_RE.search(own_text(msg)):
        return {"via": "reply", "skip": None, "addresses": [frm]}
    return {"via": None, "skip": None, "addresses": []}


def request_time(msg: Message, received: datetime | None) -> datetime:
    if received is not None:
        return received
    try:
        d = parsedate_to_datetime(header_text(msg, "Date"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def iso(d: datetime) -> str:
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def scan(since: date, env_path: str) -> dict:
    read_at = iso(datetime.now(timezone.utc))
    counts = {"folders": {}, "scanned": 0, "subject": 0, "reply": 0, "skipped": {}, "fetch_errors": 0}
    latest: dict[str, tuple[datetime, str]] = {}
    with ReadOnlyMailbox(env_path) as box:
        folders = [f for f in box.folders() if f.upper() == "INBOX" or SPAM_FOLDER_RE.search(f)]
        if not any(f.upper() == "INBOX" for f in folders):
            raise CouldNotRun("no INBOX folder listed")
        for folder in folders:
            if not box.select(folder):
                raise CouldNotRun("a folder that must be read could not be opened")
            ids = box.search_since(since)
            counts["folders"][folder] = len(ids)
            for mid in ids:
                got = box.peek(mid)
                if got is None:
                    counts["fetch_errors"] += 1
                    continue
                msg, received = got
                counts["scanned"] += 1
                c = classify(msg)
                if c["skip"]:
                    counts["skipped"][c["skip"]] = counts["skipped"].get(c["skip"], 0) + 1
                if not c["via"]:
                    continue
                counts[c["via"]] += 1
                at = request_time(msg, received)
                for addr in c["addresses"]:
                    h = hash_address(addr)
                    if h not in latest or at > latest[h][0]:
                        latest[h] = (at, c["via"])
    if counts["fetch_errors"]:
        raise CouldNotRun(f"{counts['fetch_errors']} message(s) could not be fetched; scan incomplete")
    requests = [{"hash": h, "via": via, "requestedAt": iso(at)} for h, (at, via) in sorted(latest.items())]
    return {"status": "ok", "read_at": read_at, "since": since.isoformat(), "requests": requests, "counts": counts}


# ---------------------------------------------------------------------------- self-test

def _mk(subject: str, body: str = "", frm: str = "Reader <reader@example.com>", headers: dict | None = None,
        html: bool = False) -> Message:
    from email.message import EmailMessage
    m = EmailMessage()
    m["From"] = frm
    m["To"] = "simsnews@musthavemods.com"
    m["Subject"] = subject
    for k, v in (headers or {}).items():
        m[k] = v
    m.set_content(body, subtype="html" if html else "plain")
    return m


def self_test() -> int:
    weekly = "Re: This week on MustHaveMods — 12 new finds"
    cases = [
        # (name, message, expected via, expected addresses)
        ("mailto form names the address", _mk("unsubscribe reader@example.com"), "subject",
         ["reader@example.com"]),
        ("mailto form, other address too", _mk("unsubscribe other@example.org", frm="x@example.com"), "subject",
         ["other@example.org", "x@example.com"]),
        ("bare Unsubscribe subject", _mk("Unsubscribe"), "subject", ["reader@example.com"]),
        ("Re: prefix + remove me", _mk("RE: Remove me from this list"), "subject", ["reader@example.com"]),
        ("reply with unsubscribe above quote", _mk(weekly, "please unsubscribe me\n\nOn Sun, Oct 26 MustHaveMods wrote:\n> hi"),
         "reply", ["reader@example.com"]),
        ("reply STOP alone", _mk(weekly, "STOP\n"), "reply", ["reader@example.com"]),
        ("html reply", _mk(weekly, "<div>Take me off this list</div><blockquote>unsubscribe link</blockquote>", html=True),
         "reply", ["reader@example.com"]),
        ("reply praising, quote contains unsubscribe", _mk(weekly, "love these!\n\n> unsubscribe here"), None, []),
        ("don't stop sending is not a request", _mk(weekly, "please don't stop, these are great"), None, []),
        ("non-campaign mail mentioning unsubscribe", _mk("Question about a mod", "how do I unsubscribe from patreon"), None, []),
        ("marketing mail with List-Unsubscribe", _mk("Unsubscribe confirmation", headers={"List-Unsubscribe": "<mailto:x@y.z>"}), None, []),
        ("DSN", _mk("Undeliverable: This week on MustHaveMods", "unsubscribe"), None, []),
        ("auto-reply", _mk("Automatic reply: This week on MustHaveMods", "unsubscribe"), None, []),
        ("own domain", _mk("unsubscribe", frm="simsnews@musthavemods.com"), None, []),
        ("client-generated mailto (Auto-Submitted) still counts",
         _mk("unsubscribe reader@example.com", headers={"Auto-Submitted": "auto-generated"}), "subject",
         ["reader@example.com"]),
        ("auto-submitted reply body is not a request", _mk(weekly, "unsubscribe", headers={"Auto-Submitted": "auto-replied"}),
         None, []),
        ("own address in subject is ignored", _mk("unsubscribe simsnews@musthavemods.com"), "subject", ["reader@example.com"]),
    ]
    failed = 0
    for name, msg, via, addrs in cases:
        got = classify(msg)
        ok = got["via"] == via and got["addresses"] == addrs
        if not ok:
            failed += 1
        print(f"  {'ok  ' if ok else 'FAIL'} {name}" + ("" if ok else f" -> via={got['via']} n={len(got['addresses'])}"))
    # INTERNALDATE wins over the sender's Date header.
    m = _mk("unsubscribe", headers={"Date": "Mon, 01 Jan 2035 00:00:00 +0000"})
    srv = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
    if request_time(m, srv) != srv:
        failed += 1
        print("  FAIL request_time prefers INTERNALDATE")
    else:
        print("  ok   request_time prefers INTERNALDATE")
    if hash_address(" Reader@Example.com ") != hashlib.sha256(b"reader@example.com").hexdigest():
        failed += 1
        print("  FAIL hash normalization")
    else:
        print("  ok   hash normalization matches hashRecipient")
    print(f"self-test: {len(cases) + 2 - failed}/{len(cases) + 2} passed")
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default=DEFAULT_SINCE, help="YYYY-MM-DD (IMAP SINCE, inclusive)")
    ap.add_argument("--env", default=ENV_FILE)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    try:
        out = scan(date.fromisoformat(args.since), args.env)
    except CouldNotRun as e:
        print(json.dumps({"status": "could-not-run", "reason": str(e)}))
        return 2
    except Exception as e:  # never echo a server response verbatim
        print(json.dumps({"status": "could-not-run", "reason": f"unexpected {type(e).__name__}"}))
        return 2
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

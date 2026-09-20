#!/usr/bin/env python3
"""
mailbox-dsn-count.py — read-only bounce / complaint / placement counts from the
sending mailbox (Cass, E54/E68, 2026-09-20).

The sending mailbox is the ONLY observable for bounces and complaints:
`notification_logs` is 0 rows all-time by design (`bulkMailer` passes
`skipLog: true`), so every per-batch gate read of the re-permission campaign
("hard bounces < 3 % and 0 complaints, measured >= 20 h after the send") was a
hand-typed IMAP session until this script. Now it is one command.

    python3 scripts/agents/mailbox-dsn-count.py --since 2026-09-16 [--gate 100] [--hashes]

Guarantees (this is why it exists as a script and not as a shell one-liner):
  * Read-only. Every folder is opened with `readonly=True` and bodies are fetched
    with `BODY.PEEK[]`, so nothing is flagged \\Seen, moved or deleted.
  * Counts only. No address, subject of a human reply, env value, or message body
    is ever printed. Env vars are read from .env.local and named, never echoed.
  * `--hashes` prints the SHA-256 of each hard-bounced recipient address
    (lower-cased, trimmed). That is the key the send script's code-only exclusion
    list uses, so a dead address is never re-attempted and never committed.

Exit codes follow the repo's health-check convention: 0 = counts produced
(and gate PASS if --gate given), 1 = gate FAIL, 2 = could not run (missing env,
IMAP unreachable). "Could not run" is never reported as a verdict.
"""
from __future__ import annotations

import argparse
import email
import hashlib
import imaplib
import os
import re
import ssl
import sys
from datetime import date, datetime, timezone
from email.message import Message

ENV_FILE = ".env.local"
# IMAP on the BigScoots mailbox lives on the same host as SMTP submission.
HOST_VAR, USER_VAR, PASS_VAR = "SMTP_HOST", "SMTP_USER", "SMTP_PASS"
IMAP_PORT = 993

# Subjects our two live sends have used. Attribution only — never printed with a recipient.
CAMPAIGN_SUBJECTS = {
    "re-permission": "Do you want the weekly Sims 4 finds email?",
    "issue-01": "Your first MustHaveMods roundup",
}
DSN_SUBJECT_RE = re.compile(
    r"(undeliver|delivery (status|failure|report)|mail delivery failed|returned mail|failure notice|"
    r"delivery has failed|could not be delivered|delayed mail|non[- ]?delivery)",
    re.I,
)
AUTOREPLY_RE = re.compile(r"(automatic reply|auto[- ]?reply|out of (the )?office|autoresponder|away from)", re.I)
COMPLAINT_RE = re.compile(r"(abuse|complaint|feedback[- ]?loop|feedback report|\bfbl\b|spam report)", re.I)
SPAM_FOLDER_RE = re.compile(r"(spam|junk)", re.I)


def load_env(path: str) -> dict[str, str]:
    """Minimal .env parser. Values are returned to the caller and never logged."""
    out: dict[str, str] = {}
    try:
        with open(path, encoding="utf-8") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                out[k.strip()] = v
    except FileNotFoundError:
        pass
    return out


def imap_date(d: date) -> str:
    return d.strftime("%d-%b-%Y")


def walk_parts(msg: Message):
    if msg.is_multipart():
        for part in msg.walk():
            yield part
    else:
        yield msg


def header_text(msg: Message, name: str) -> str:
    try:
        return str(msg.get(name, "") or "")
    except Exception:
        return ""


def classify_dsn(msg: Message) -> dict:
    """
    Returns {is_dsn, hard, soft, recipient, campaign, diagnostic_class}.
    A DSN is multipart/report with report-type=delivery-status, or a message whose
    subject reads like a bounce and that carries a Status:/Diagnostic-Code: line.
    """
    ctype = header_text(msg, "Content-Type")
    subject = header_text(msg, "Subject")
    is_report = "delivery-status" in ctype.lower()
    looks_like = bool(DSN_SUBJECT_RE.search(subject))
    status = ""
    diag = ""
    recipient = ""
    campaign = "other"

    for part in walk_parts(msg):
        pct = part.get_content_type()
        if pct == "message/delivery-status":
            try:
                payload = part.get_payload()
                blobs = payload if isinstance(payload, list) else [payload]
                for blob in blobs:
                    txt = blob.as_string() if isinstance(blob, Message) else str(blob)
                    m = re.search(r"^Status:\s*([245]\.\d+\.\d+)", txt, re.M | re.I)
                    if m and not status:
                        status = m.group(1)
                    m = re.search(r"^Diagnostic-Code:\s*(.+)$", txt, re.M | re.I)
                    if m and not diag:
                        diag = m.group(1).strip()
                    m = re.search(r"^(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^>\s]+)>?", txt, re.M | re.I)
                    if m and not recipient:
                        recipient = m.group(1)
            except Exception:
                pass
        elif pct in ("message/rfc822", "text/rfc822-headers"):
            try:
                inner = part.get_payload()
                inner_msg = inner[0] if isinstance(inner, list) and inner else None
                if inner_msg is None and isinstance(inner, str):
                    inner_msg = email.message_from_string(inner)
                if inner_msg is not None:
                    isub = header_text(inner_msg, "Subject")
                    for key, needle in CAMPAIGN_SUBJECTS.items():
                        if needle.lower() in isub.lower():
                            campaign = key
                    if not recipient:
                        to_hdr = header_text(inner_msg, "To")
                        m = re.search(r"<?([^<>\s,]+@[^<>\s,]+)>?", to_hdr)
                        if m:
                            recipient = m.group(1)
            except Exception:
                pass
        elif pct == "text/plain" and (is_report or looks_like) and (not status or not recipient):
            try:
                txt = part.get_payload(decode=True) or b""
                txt = txt.decode(part.get_content_charset() or "utf-8", "replace")
                m = re.search(r"\b([245])\.\d+\.\d+\b", txt)
                if m and not status:
                    status = m.group(0)
                if not diag:
                    m = re.search(r"\b(5\d\d|4\d\d)[ -]", txt)
                    if m:
                        diag = m.group(0).strip()
                for key, needle in CAMPAIGN_SUBJECTS.items():
                    if needle.lower() in txt.lower():
                        campaign = key
                if not recipient:
                    m = re.search(r"(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^>\s]+)>?", txt, re.I)
                    if m:
                        recipient = m.group(1)
            except Exception:
                pass

    is_dsn = is_report or (looks_like and bool(status or diag))
    hard = soft = False
    if is_dsn:
        code = status or diag
        if code.startswith("5"):
            hard = True
        elif code.startswith("4"):
            soft = True
        else:
            # A bounce with no parseable code is counted as hard: the conservative reading.
            hard = True
    return {
        "is_dsn": is_dsn,
        "hard": hard,
        "soft": soft,
        "recipient": recipient.strip().lower(),
        "campaign": campaign,
        "code": (status or diag[:3] or "?").split()[0][:5] if (status or diag) else "?",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True, help="YYYY-MM-DD (IMAP SINCE, inclusive)")
    ap.add_argument("--campaign", default="re-permission", choices=list(CAMPAIGN_SUBJECTS) + ["all"])
    ap.add_argument("--gate", type=int, default=0, help="batch size; evaluates hard<3%% and complaints==0")
    ap.add_argument("--hashes", action="store_true", help="print sha256 of hard-bounced recipients")
    ap.add_argument("--env", default=ENV_FILE)
    args = ap.parse_args()

    env = {**load_env(args.env), **{k: v for k, v in os.environ.items() if k in (HOST_VAR, USER_VAR, PASS_VAR)}}
    missing = [k for k in (HOST_VAR, USER_VAR, PASS_VAR) if not env.get(k)]
    if missing:
        print(f"could-not-run: missing env {', '.join(missing)} in {args.env}")
        return 2

    since = date.fromisoformat(args.since)
    read_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        conn = imaplib.IMAP4_SSL(env[HOST_VAR], IMAP_PORT, ssl_context=ssl.create_default_context())
        conn.login(env[USER_VAR], env[PASS_VAR])
    except Exception as e:  # never echo the host/user in the error
        print(f"could-not-run: IMAP connect/login failed ({type(e).__name__})")
        return 2

    folders: list[str] = []
    typ, data = conn.list()
    if typ == "OK":
        for raw in data or []:
            if not raw:
                continue
            s = raw.decode() if isinstance(raw, bytes) else str(raw)
            m = re.search(r'"([^"]+)"\s*$', s) or re.search(r"\s(\S+)\s*$", s)
            if m:
                folders.append(m.group(1))

    counts = {
        "read_at": read_at,
        "since": args.since,
        "folders": {},
        "dsn_total": 0,
        "hard": 0,
        "soft": 0,
        "hard_by_campaign": {},
        "soft_by_campaign": {},
        "codes": {},
        "auto_replies": 0,
        "complaint_like": 0,
        "spam_folder_messages": 0,
        "inbox_non_dsn": 0,
    }
    hashes: list[str] = []
    seen_recipients: set[str] = set()

    for folder in folders:
        try:
            typ, _ = conn.select(f'"{folder}"', readonly=True)
        except Exception:
            continue
        if typ != "OK":
            continue
        typ, data = conn.search(None, "SINCE", imap_date(since))
        ids = (data[0].split() if typ == "OK" and data and data[0] else [])
        counts["folders"][folder] = len(ids)
        if SPAM_FOLDER_RE.search(folder):
            counts["spam_folder_messages"] += len(ids)
        if folder.upper() != "INBOX" and not SPAM_FOLDER_RE.search(folder):
            continue
        for mid in ids:
            typ, data = conn.fetch(mid, "(BODY.PEEK[])")
            if typ != "OK" or not data or not isinstance(data[0], tuple):
                continue
            msg = email.message_from_bytes(data[0][1])
            subject = header_text(msg, "Subject")
            ctype = header_text(msg, "Content-Type").lower()
            if "feedback-report" in ctype or COMPLAINT_RE.search(subject):
                counts["complaint_like"] += 1
                continue
            if AUTOREPLY_RE.search(subject):
                counts["auto_replies"] += 1
                continue
            d = classify_dsn(msg)
            if not d["is_dsn"]:
                if folder.upper() == "INBOX":
                    counts["inbox_non_dsn"] += 1
                continue
            if args.campaign != "all" and d["campaign"] != args.campaign:
                continue
            counts["dsn_total"] += 1
            counts["codes"][d["code"]] = counts["codes"].get(d["code"], 0) + 1
            bucket = "hard" if d["hard"] else "soft"
            counts[bucket] += 1
            per = counts[f"{bucket}_by_campaign"]
            per[d["campaign"]] = per.get(d["campaign"], 0) + 1
            if d["hard"] and d["recipient"] and "@" in d["recipient"] and d["recipient"] not in seen_recipients:
                seen_recipients.add(d["recipient"])
                hashes.append(hashlib.sha256(d["recipient"].encode("utf-8")).hexdigest())

    try:
        conn.logout()
    except Exception:
        pass

    # Distinct hard-bounced recipients is the number the gate uses (one DSN per address).
    counts["hard_distinct_recipients"] = len(seen_recipients)
    print(f"mailbox read (read-only IMAP, counts only) at {read_at}, messages since {args.since}, campaign={args.campaign}")
    for folder, n in counts["folders"].items():
        print(f"  folder {folder}: {n}")
    print(f"  DSNs attributed: {counts['dsn_total']} (hard {counts['hard']}, soft {counts['soft']}; distinct hard recipients {counts['hard_distinct_recipients']})")
    print(f"  hard by campaign: {counts['hard_by_campaign']}  soft by campaign: {counts['soft_by_campaign']}  codes: {counts['codes']}")
    print(f"  complaint-like (feedback-report / abuse subject): {counts['complaint_like']}")
    print(f"  spam/junk folder messages: {counts['spam_folder_messages']}")
    print(f"  auto-replies: {counts['auto_replies']}   other INBOX messages (non-DSN): {counts['inbox_non_dsn']}")
    if args.hashes:
        print("  sha256(hard-bounced recipient), one per line:")
        for h in hashes:
            print(f"    {h}")

    if args.gate > 0:
        rate = counts["hard_distinct_recipients"] / args.gate
        ok = rate < 0.03 and counts["complaint_like"] == 0
        print(f"  gate(batch={args.gate}): hard {counts['hard_distinct_recipients']}/{args.gate} = {rate*100:.1f}% (<3% {'yes' if rate < 0.03 else 'NO'}), complaints {counts['complaint_like']} (==0 {'yes' if counts['complaint_like'] == 0 else 'NO'}) → {'PASS' if ok else 'FAIL'}")
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

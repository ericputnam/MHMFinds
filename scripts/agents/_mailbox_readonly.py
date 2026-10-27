"""
_mailbox_readonly.py — the ONE way scripts in this repo read the sending mailbox.

CLAUDE.md: "Enforce read-only-ness of an external read at the call, and expect it to
be copied … wrap it before writing the second consumer." Until 2026-10-26 the
guarantee lived in two lines of `mailbox-dsn-count.py` (`readonly=True` and
`BODY.PEEK[]`). The unsubscribe-request reader is the second consumer, so both now
go through this module, which exposes no way to do anything else:

  * `select()` always opens with `readonly=True` (IMAP EXAMINE) — nothing can be
    expunged, moved or flagged.
  * `peek()` always fetches `BODY.PEEK[]` — reading never sets \\Seen.
  * The IMAP connection is private; there is no store/copy/move/expunge method.

Credentials come from `.env.local` (or the process env) and are never printed —
errors name the exception type only, because imaplib errors can echo the user.
"""
from __future__ import annotations

import email
import email.header
import imaplib
import os
import re
import ssl
from datetime import date, datetime, timezone
from email.message import Message

ENV_FILE = ".env.local"
# IMAP on the BigScoots mailbox lives on the same host as SMTP submission.
HOST_VAR, USER_VAR, PASS_VAR = "SMTP_HOST", "SMTP_USER", "SMTP_PASS"
IMAP_PORT = 993

# Subjects our live sends have used. Attribution only — never printed with a recipient.
CAMPAIGN_SUBJECTS = {
    "re-permission": "Do you want the weekly Sims 4 finds email?",
    "issue-01": "Your first MustHaveMods roundup",
    # Every DB-built weekly issue (05, 06, ...) uses this subject prefix (newsletterWeekly.ts).
    "weekly": "This week on MustHaveMods",
    # E233 subscriber->account invite (INVITE_SUBJECT in lib/services/subscriberInvite.ts). Until
    # E254 (2026-10-21) its DSNs read as "other": the one hard DSN of 10-19 (5.7.1) was this send.
    "invite": "Save the mods you find on MustHaveMods",
}
DSN_SUBJECT_RE = re.compile(
    r"(undeliver|delivery (status|failure|report)|mail delivery failed|returned mail|failure notice|"
    r"delivery has failed|could not be delivered|delayed mail|non[- ]?delivery)",
    re.I,
)
AUTOREPLY_RE = re.compile(r"(automatic reply|auto[- ]?reply|out of (the )?office|autoresponder|away from)", re.I)
COMPLAINT_RE = re.compile(r"(abuse|complaint|feedback[- ]?loop|feedback report|\bfbl\b|spam report)", re.I)
SPAM_FOLDER_RE = re.compile(r"(spam|junk)", re.I)


class CouldNotRun(Exception):
    """Missing env or IMAP unreachable. Never a verdict about the mailbox's contents."""


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


def mailbox_env(path: str = ENV_FILE) -> dict[str, str]:
    """Host/user/pass from the env file, overridden by the process env. Raises CouldNotRun."""
    env = {**load_env(path), **{k: v for k, v in os.environ.items() if k in (HOST_VAR, USER_VAR, PASS_VAR)}}
    missing = [k for k in (HOST_VAR, USER_VAR, PASS_VAR) if not env.get(k)]
    if missing:
        raise CouldNotRun(f"missing env {', '.join(missing)} in {path}")
    return env


def imap_date(d: date) -> str:
    return d.strftime("%d-%b-%Y")


def walk_parts(msg: Message):
    if msg.is_multipart():
        for part in msg.walk():
            yield part
    else:
        yield msg


def header_text(msg: Message, name: str) -> str:
    """Header value with RFC 2047 encoded-words decoded. The weekly subject carries an em dash,
    so it is sent as `=?utf-8?...?=` and a raw substring match never saw it (E240)."""
    try:
        raw = str(msg.get(name, "") or "")
    except Exception:
        return ""
    try:
        return str(email.header.make_header(email.header.decode_header(raw)))
    except Exception:
        return raw


_INTERNALDATE_RE = re.compile(rb'INTERNALDATE "([^"]+)"')


class ReadOnlyMailbox:
    """Read-only IMAP session. Use as a context manager; see the module docstring."""

    def __init__(self, env_path: str = ENV_FILE):
        env = mailbox_env(env_path)
        try:
            self.__conn = imaplib.IMAP4_SSL(env[HOST_VAR], IMAP_PORT, ssl_context=ssl.create_default_context())
            self.__conn.login(env[USER_VAR], env[PASS_VAR])
        except Exception as e:  # never echo the host/user in the error
            raise CouldNotRun(f"IMAP connect/login failed ({type(e).__name__})") from None
        self.user = env[USER_VAR].strip().lower()

    def __enter__(self) -> "ReadOnlyMailbox":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def close(self) -> None:
        try:
            self.__conn.logout()
        except Exception:
            pass

    def folders(self) -> list[str]:
        out: list[str] = []
        typ, data = self.__conn.list()
        if typ != "OK":
            raise CouldNotRun("IMAP LIST failed")
        for raw in data or []:
            if not raw:
                continue
            s = raw.decode() if isinstance(raw, bytes) else str(raw)
            m = re.search(r'"([^"]+)"\s*$', s) or re.search(r"\s(\S+)\s*$", s)
            if m:
                out.append(m.group(1))
        return out

    def select(self, folder: str) -> bool:
        """Open a folder read-only (EXAMINE). False when the server refuses it."""
        try:
            typ, _ = self.__conn.select(f'"{folder}"', readonly=True)
        except Exception:
            return False
        return typ == "OK"

    def search_since(self, since: date) -> list[bytes]:
        typ, data = self.__conn.search(None, "SINCE", imap_date(since))
        if typ != "OK":
            raise CouldNotRun("IMAP SEARCH failed")
        return data[0].split() if data and data[0] else []

    def peek(self, mid: bytes) -> tuple[Message, datetime | None] | None:
        """(message, server INTERNALDATE in UTC) without setting \\Seen. None if the fetch failed."""
        typ, data = self.__conn.fetch(mid, "(INTERNALDATE BODY.PEEK[])")
        if typ != "OK" or not data or not isinstance(data[0], tuple):
            return None
        meta, body = data[0][0], data[0][1]
        received: datetime | None = None
        m = _INTERNALDATE_RE.search(meta if isinstance(meta, bytes) else str(meta).encode())
        if m:
            try:
                received = datetime.strptime(m.group(1).decode(), "%d-%b-%Y %H:%M:%S %z").astimezone(timezone.utc)
            except ValueError:
                received = None
        return email.message_from_bytes(body), received

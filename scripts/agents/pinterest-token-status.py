#!/usr/bin/env python3
"""Pinterest token status — the token-manager port (Pip, 2026-09-07).

Operator decision on `operator-queue.md` Q2 (2026-09-05):

    "keys will be added by the operator; Pip owns the token-manager port."

A hand-pasted `PINTEREST_ACCESS_TOKEN` dies after ~30 days, which is exactly
what happened on 2026-09-05 (E14's first live run reported HTTP 401 on the
stored `creator_access_token`). The pinner already solves this: its
`pinterest_token_manager.ensure_valid_token()` tests the stored access token
and, if it is dead, mints a new one from `creator_refresh_token` and writes it
back to `config.json`. This script makes MHMFinds ask that manager instead of
trusting a stale stored string, so `check-pinner.sh` stops reporting a
recoverable staleness as a pipeline failure.

Order of preference:
  1. Import `PinterestTokenManager` from the pinner (single source of truth,
     and its refresh writes the token the pinner itself will use next run).
  2. If that import fails (MHMUtils absent, `requests` not installed), fall
     back to an embedded stdlib port with identical semantics.
  3. If there is no config at all, exit WARN — never FAIL. A check that cannot
     run is not evidence that the pipeline is broken.

SECRETS: this script never prints a token. It prints one status line and, on
failure, a message that is passed through a redactor first. Everything it can
learn stays inside the process.

USAGE
    python3 scripts/agents/pinterest-token-status.py            # refresh if needed
    python3 scripts/agents/pinterest-token-status.py --no-refresh
    python3 scripts/agents/pinterest-token-status.py --json

ENV
    MHM_PINTEREST_CONFIG   explicit path to config.json
    MHM_UTILS_DIR          pinner checkout (default ~/java_projects/MHMUtils)

EXIT CODES
    0  OK    — token is valid now (VALID or REFRESHED)
    1  FAIL  — needs a human: refresh token expired/missing, refresh rejected
    2  WARN  — could not evaluate: no config, no network, --no-refresh + stale
"""

import base64
import json
import os
import re
import sys
import tempfile

DEFAULT_UTILS_DIR = os.path.join(os.path.expanduser('~'), 'java_projects', 'MHMUtils')
PINTEREST_API = 'https://api.pinterest.com/v5'
# Same fallback app id the pinner's token manager hard-codes.
FALLBACK_CLIENT_ID = '1513097'

OK, FAIL, WARN = 0, 1, 2

# Anything that looks like a Pinterest token or a long opaque credential.
_REDACT_PATTERNS = [
    re.compile(r'pin[a-z]?[._][A-Za-z0-9._\-]{16,}'),
    re.compile(r'\b[A-Za-z0-9_\-]{40,}\b'),
]


def redact(text):
    """Strip anything token-shaped out of a message before printing it."""
    out = str(text)
    for pattern in _REDACT_PATTERNS:
        out = pattern.sub('[REDACTED]', out)
    return out.replace('\n', ' ').strip()


def config_path():
    explicit = os.environ.get('MHM_PINTEREST_CONFIG')
    if explicit:
        return explicit
    return os.path.join(os.environ.get('MHM_UTILS_DIR', DEFAULT_UTILS_DIR), 'config.json')


def utils_dir():
    return os.environ.get('MHM_UTILS_DIR', DEFAULT_UTILS_DIR)


# --------------------------------------------------------------------------
# Embedded port of ensure_valid_token() — stdlib only, no `requests`.
# Mirrors pinterest_token_manager.PinterestTokenManager exactly, including the
# atomic config write, so either path leaves config.json in the same state.
# --------------------------------------------------------------------------
class FallbackTokenManager(object):
    def __init__(self, path):
        self.config_path = path
        with open(path, 'r') as handle:
            self.config = json.load(handle)

    def _save_config(self):
        directory = os.path.dirname(os.path.abspath(self.config_path))
        fd, tmp_path = tempfile.mkstemp(dir=directory, suffix='.json')
        try:
            with os.fdopen(fd, 'w') as handle:
                json.dump(self.config, handle, indent=2)
                handle.write('\n')
            os.replace(tmp_path, self.config_path)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

    def test_token(self, token):
        import urllib.error
        import urllib.request

        if not token:
            return False
        request = urllib.request.Request(
            PINTEREST_API + '/boards?page_size=1',
            headers={'Authorization': 'Bearer ' + token},
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.status == 200
        except urllib.error.HTTPError:
            return False
        except Exception as exc:  # network down, DNS, TLS
            raise NetworkError(str(exc))

    def refresh_token(self):
        import urllib.error
        import urllib.parse
        import urllib.request

        refresh = self.config.get('creator_refresh_token')
        if not refresh:
            raise RuntimeError(
                'No creator_refresh_token in config.json — a human must re-authorize '
                '(cd ~/java_projects/MHMUtils && python3 pinterest_token_helper.py).'
            )
        client_id = str(self.config.get('client_id') or FALLBACK_CLIENT_ID)
        secret = self.config.get('client_secret') or self.config.get('pinterest_api_v4_key') or ''
        if not secret:
            raise RuntimeError('No client_secret / pinterest_api_v4_key in config.json — cannot refresh.')

        credentials = base64.b64encode('{}:{}'.format(client_id, secret).encode()).decode()
        body = urllib.parse.urlencode({
            'grant_type': 'refresh_token',
            'refresh_token': refresh,
        }).encode()
        request = urllib.request.Request(
            PINTEREST_API + '/oauth/token',
            data=body,
            headers={
                'Authorization': 'Basic ' + credentials,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            raise RuntimeError(
                'Token refresh rejected (HTTP {}) — the refresh token is expired or revoked. '
                'A human must re-authorize once: cd ~/java_projects/MHMUtils && '
                'python3 pinterest_token_helper.py'.format(exc.code)
            )
        except Exception as exc:
            raise NetworkError(str(exc))

        new_access = payload.get('access_token')
        if not new_access:
            raise RuntimeError('Pinterest returned no access_token in the refresh response.')

        self.config['creator_access_token'] = new_access
        self.config['pinterest_api_v5_key'] = new_access
        if payload.get('refresh_token'):
            self.config['creator_refresh_token'] = payload['refresh_token']
        self._save_config()
        return new_access

    def ensure_valid_token(self):
        current = self.config.get('creator_access_token', '')
        if current and self.test_token(current):
            return current
        new_token = self.refresh_token()
        if not self.test_token(new_token):
            raise RuntimeError('Refreshed token still failed validation — manual re-authorization required.')
        return new_token


class NetworkError(Exception):
    """Pinterest was unreachable. Not a token problem; never a FAIL."""


def pinterest_reachable():
    """True if api.pinterest.com answers at all (any HTTP status counts).

    The pinner's own manager swallows network errors and returns False, which
    would otherwise make an offline runner look like an expired token. Before
    reporting FAIL we confirm the API is actually talking to us.
    """
    import urllib.error
    import urllib.request

    try:
        urllib.request.urlopen(PINTEREST_API + '/user_account', timeout=15)
        return True
    except urllib.error.HTTPError:
        return True  # 401/403 from an unauthenticated probe = the API is up
    except Exception:
        return False


def load_manager(path):
    """Return (manager, backend_name). Prefers the pinner's own manager."""
    sys.path.insert(0, utils_dir())
    try:
        from pinterest_token_manager import PinterestTokenManager  # type: ignore
        return PinterestTokenManager(path), 'mhmutils'
    except Exception:
        return FallbackTokenManager(path), 'embedded-port'


def evaluate(path, allow_refresh):
    manager, backend = load_manager(path)
    detail = {'backend': backend}

    stored = manager.config.get('creator_access_token', '')
    if not stored:
        if not allow_refresh:
            return WARN, 'NO_STORED_TOKEN', 'config.json has no creator_access_token', detail
    else:
        try:
            if manager.test_token(stored):
                return OK, 'VALID', 'stored access token accepted by Pinterest', detail
        except NetworkError as exc:
            return WARN, 'UNREACHABLE', 'Pinterest unreachable: ' + redact(exc), detail

    if not allow_refresh:
        return WARN, 'STALE_NO_REFRESH', 'stored token is stale; --no-refresh, so it was not renewed', detail

    if not manager.config.get('creator_refresh_token'):
        return FAIL, 'NO_REFRESH_TOKEN', (
            'stored token is stale and there is no creator_refresh_token to renew it — '
            'operator runs: cd ~/java_projects/MHMUtils && python3 pinterest_token_helper.py'
        ), detail

    try:
        manager.refresh_token()
    except NetworkError as exc:
        return WARN, 'UNREACHABLE', 'Pinterest unreachable during refresh: ' + redact(exc), detail
    except Exception as exc:
        if not pinterest_reachable():
            return WARN, 'UNREACHABLE', 'Pinterest unreachable; refresh not attempted cleanly', detail
        return FAIL, 'REFRESH_FAILED', redact(exc), detail

    try:
        if manager.test_token(manager.config.get('creator_access_token', '')):
            return OK, 'REFRESHED', 'access token was stale and has been renewed from the refresh token', detail
    except NetworkError as exc:
        return WARN, 'UNREACHABLE', 'Pinterest unreachable after refresh: ' + redact(exc), detail
    if not pinterest_reachable():
        return WARN, 'UNREACHABLE', 'Pinterest unreachable while validating the renewed token', detail
    return FAIL, 'REFRESH_FAILED', 'renewed token was still rejected by Pinterest', detail


def main():
    allow_refresh = '--no-refresh' not in sys.argv
    as_json = '--json' in sys.argv
    path = config_path()

    if not os.path.isfile(path):
        code, status, message, detail = WARN, 'NO_CONFIG', 'no pinner config at ' + path, {'backend': 'none'}
    else:
        try:
            code, status, message, detail = evaluate(path, allow_refresh)
        except Exception as exc:  # unreadable config, permissions, bad JSON
            code, status, message, detail = WARN, 'UNAVAILABLE', redact(exc), {'backend': 'none'}

    if as_json:
        print(json.dumps({'status': status, 'message': message, 'exit': code, **detail}))
    else:
        print('{}\t{}\t{}'.format(status, detail.get('backend', 'none'), message))
    return code


if __name__ == '__main__':
    sys.exit(main())

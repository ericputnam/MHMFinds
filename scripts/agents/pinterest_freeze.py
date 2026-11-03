"""Operator Pinterest freeze (2026-11-02).

Every script that writes to the Pinterest pin queue calls refuse_if_frozen()
before its first write. While .claude/agents/mhm-funnel/pinterest-freeze.json
says "frozen": true the script prints why and exits 3 — dry runs, --check and
read-only audits still work. Only the operator lifts the freeze.
"""
import json
import os
import sys

FREEZE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                           '.claude', 'agents', 'mhm-funnel', 'pinterest-freeze.json')
EXIT_FROZEN = 3


def freeze_state(path=FREEZE_PATH):
    try:
        with open(path) as fh:
            state = json.load(fh)
    except FileNotFoundError:
        return None
    except (OSError, ValueError):
        # Unreadable or malformed counts as frozen: fail closed.
        return {'frozen': True, 'reason': 'pinterest-freeze.json unreadable'}
    return state if state.get('frozen') else None


def refuse_if_frozen(script, path=FREEZE_PATH):
    state = freeze_state(path)
    if state is None:
        return
    print('PINTEREST FROZEN ({} since {}): {} refuses to write.'.format(
        state.get('by', 'operator'), state.get('since', '?'), script), file=sys.stderr)
    print('  ' + state.get('reason', ''), file=sys.stderr)
    print('  Dry runs still work. Recommend the change to the operator instead.', file=sys.stderr)
    sys.exit(EXIT_FROZEN)

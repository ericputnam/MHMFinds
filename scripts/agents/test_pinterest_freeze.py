"""Tests for the operator Pinterest freeze guard.

Run: python3 -m unittest scripts/agents/test_pinterest_freeze.py
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pinterest_freeze  # noqa: E402

WRITE_SCRIPTS = [
    ('insert-catalog-pins.py', []),
    ('pin-runway-topup.py', ['--apply']),
    ('repair-pin-sections.py', ['--apply']),
    ('revive-stranded-pins.py', ['--apply']),
    ('pin-seo-audit.py', ['--apply']),
]


class FreezeStateTest(unittest.TestCase):
    def _write(self, text):
        fh = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
        fh.write(text)
        fh.close()
        self.addCleanup(os.unlink, fh.name)
        return fh.name

    def test_missing_file_is_unfrozen(self):
        self.assertIsNone(pinterest_freeze.freeze_state('/nonexistent/freeze.json'))

    def test_frozen_false_is_unfrozen(self):
        self.assertIsNone(pinterest_freeze.freeze_state(self._write('{"frozen": false}')))

    def test_malformed_file_fails_closed(self):
        self.assertTrue(pinterest_freeze.freeze_state(self._write('{not json'))['frozen'])

    def test_refuse_exits_when_frozen(self):
        path = self._write(json.dumps({'frozen': True, 'since': '2026-11-02'}))
        with self.assertRaises(SystemExit) as ctx:
            pinterest_freeze.refuse_if_frozen('x.py', path)
        self.assertEqual(ctx.exception.code, pinterest_freeze.EXIT_FROZEN)

    def test_committed_freeze_is_on(self):
        # The operator froze Pinterest on 2026-11-02; only the operator lifts it.
        self.assertIsNotNone(pinterest_freeze.freeze_state())


class WriteScriptsRefuseTest(unittest.TestCase):
    def test_every_write_path_refuses_while_frozen(self):
        if pinterest_freeze.freeze_state() is None:
            self.skipTest('freeze lifted')
        env = dict(os.environ, SUPABASE_URL='http://127.0.0.1:9', SUPABASE_SERVICE_ROLE_KEY='x')
        for script, args in WRITE_SCRIPTS:
            with self.subTest(script=script):
                proc = subprocess.run([sys.executable, os.path.join(HERE, script)] + args,
                                      capture_output=True, text=True, env=env, timeout=60)
                self.assertEqual(proc.returncode, pinterest_freeze.EXIT_FROZEN, proc.stderr[-500:])
                self.assertIn('PINTEREST FROZEN', proc.stderr)


if __name__ == '__main__':
    unittest.main()

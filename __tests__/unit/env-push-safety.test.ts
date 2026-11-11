/**
 * scripts/sync-env-to-vercel.js (npm run env:push) pushed each value through
 * `echo "${value}" | vercel env add …` in a shell, and treated "removed but could not
 * re-add" as an ordinary failure. Both red pre-fix (uploadVar did not exist).
 */
import { describe, it, expect, vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { uploadVar } = require('../../scripts/sync-env-to-vercel.js') as {
  uploadVar: (key: string, value: string, env: string, run: (...a: any[]) => unknown) => string;
};

const NASTY = 'p@$$w0rd`whoami`"quoted"\\back$(id)';

describe('env:push uploads values without a shell', () => {
  it('passes the value on stdin, byte for byte, and never in argv', () => {
    const run = vi.fn();
    expect(uploadVar('DB_PASSWORD', NASTY, 'production', run)).toBe('uploaded');
    const [bin, args, opts] = run.mock.calls[0];
    expect(bin).toBe('vercel');
    expect(args).toEqual(['env', 'add', 'DB_PASSWORD', 'production']);
    expect(opts.input).toBe(NASTY);
    expect(JSON.stringify(args)).not.toContain('whoami');
    expect(opts.shell).toBeUndefined();
  });

  it('an existing variable is removed and re-added', () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('already exists');
      })
      .mockImplementationOnce(() => undefined) // rm
      .mockImplementationOnce(() => undefined); // add
    expect(uploadVar('K', 'v', 'production', run)).toBe('updated');
    expect(run.mock.calls[1][1]).toEqual(['env', 'rm', 'K', 'production', '-y']);
  });

  it('if the remove fails, nothing was lost: plain "failed"', () => {
    const run = vi.fn(() => {
      throw new Error('nope');
    });
    expect(uploadVar('K', 'v', 'production', run)).toBe('failed');
    expect(run).toHaveBeenCalledTimes(2); // add, rm — no blind re-add
  });

  it('removed but not re-added is its own outcome, after one retry', () => {
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('already exists');
      })
      .mockImplementationOnce(() => undefined) // rm succeeds
      .mockImplementation(() => {
        throw new Error('network');
      });
    expect(uploadVar('K', 'v', 'production', run)).toBe('removed-not-restored');
    expect(run).toHaveBeenCalledTimes(4); // add, rm, add, add
  });
});

/**
 * Approving a submission emails the creator from olivia@ (2026-11-22).
 *
 * Pure builder + the approve route with prisma, requireAdmin and the mailer mocked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { db, prismaMock, requireAdmin, send } = vi.hoisted(() => {
  const db = {
    submissionFindUnique: vi.fn(),
    submissionUpdate: vi.fn(),
    modCreate: vi.fn(),
    modUpdate: vi.fn(),
    profileCreate: vi.fn(),
    profileFindUnique: vi.fn(),
  };
  const prismaMock = {
    modSubmission: {
      findUnique: (...a: unknown[]) => db.submissionFindUnique(...a),
      update: (...a: unknown[]) => db.submissionUpdate(...a),
    },
    mod: {
      create: (...a: unknown[]) => db.modCreate(...a),
      update: (...a: unknown[]) => db.modUpdate(...a),
    },
    creatorProfile: {
      create: (...a: unknown[]) => db.profileCreate(...a),
      findUnique: (...a: unknown[]) => db.profileFindUnique(...a),
    },
  };
  return { db, prismaMock, requireAdmin: vi.fn(), send: vi.fn() };
});
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock('@/lib/middleware/auth', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));
vi.mock('@/lib/services/emailNotifier', () => ({
  emailNotifier: { send: (...a: unknown[]) => send(...a) },
}));

import { POST } from '@/app/api/admin/submissions/[id]/approve/route';
import {
  APPROVAL_EMAIL_FROM,
  FEATURE_SECTION_AUDIENCE,
  buildApprovalEmail,
} from '@/lib/submissionApprovalEmail';

const SITE = 'https://musthavemods.com';

function input(overrides: Partial<Parameters<typeof buildApprovalEmail>[0]> = {}) {
  return {
    siteUrl: SITE,
    modName: "Women's Aurelia Gown",
    modId: 'm1',
    author: 'ErinAOK',
    isEdit: false,
    hasProfile: false,
    claimSlug: 'erinaok',
    ...overrides,
  };
}

describe('buildApprovalEmail (pure)', () => {
  it('is sent from, and replies to, olivia@musthavemods.com', () => {
    const email = buildApprovalEmail(input());
    expect(APPROVAL_EMAIL_FROM).toBe('olivia@musthavemods.com');
    expect(email.from).toBe(APPROVAL_EMAIL_FROM);
    expect(email.replyTo).toBe(APPROVAL_EMAIL_FROM);
  });

  it('links the live mod page with a trailing slash', () => {
    expect(buildApprovalEmail(input()).html).toContain(`href="${SITE}/mods/m1/"`);
  });

  it('gives exactly three profile steps, starting at sign-in for a creator with no profile', () => {
    const { html } = buildApprovalEmail(input());
    const list = html.slice(html.indexOf('<ol>'), html.indexOf('</ol>'));
    expect(list.match(/<li>/g)).toHaveLength(3);
    // Sign-in returns to the claim form for their own creator page.
    expect(list).toContain(`${SITE}/sign-in/?redirect=%2Fsubmit-mod%2F%3Fcreator%3Derinaok`);
  });

  it('falls back to the dashboard submit form when no creator slug is valid', () => {
    const { html } = buildApprovalEmail(input({ claimSlug: null }));
    expect(html).toContain(`${SITE}/sign-in/?redirect=%2Fcreators%2Fsubmit%2F`);
  });

  it('points a creator who already has a profile at their dashboard instead', () => {
    const { html } = buildApprovalEmail(input({ hasProfile: true }));
    const list = html.slice(html.indexOf('<ol>'), html.indexOf('</ol>'));
    expect(list.match(/<li>/g)).toHaveLength(3);
    expect(list).toContain(`href="${SITE}/creators/"`);
    expect(list).not.toContain('/sign-in/');
  });

  it('lists the benefits and the upcoming feature section', () => {
    const { html } = buildApprovalEmail(input());
    expect(html).toContain('Why list your mods with us');
    expect(html).toContain('mod feature section');
    expect(html).toContain(FEATURE_SECTION_AUDIENCE);
  });

  it('escapes creator-supplied text in the body', () => {
    const { html } = buildApprovalEmail(input({ modName: '<script>x</script>', author: '<b>E</b>' }));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>E</b>');
  });

  it('lists every further mod of a batch in the one email', () => {
    const one = buildApprovalEmail(input());
    expect(one.subject).toBe("Women's Aurelia Gown is live on MustHaveMods");
    expect(one.html).not.toContain('Also live');

    const email = buildApprovalEmail(
      input({ moreMods: [{ id: 'm2', name: 'Second <b>Gown</b>' }, { id: 'm3', name: 'Third' }] })
    );
    expect(email.subject).toBe("Women's Aurelia Gown and 2 more mods are live on MustHaveMods");
    expect(email.html).toContain(`href="${SITE}/mods/m2/"`);
    expect(email.html).toContain(`href="${SITE}/mods/m3/"`);
    expect(email.html).not.toContain('<b>Gown</b>');
    expect(buildApprovalEmail(input({ moreMods: [{ id: 'm2', name: 'B' }] })).subject).toContain('and 1 more mod are live');
  });

  it('words an edit as an update', () => {
    const email = buildApprovalEmail(input({ isEdit: true }));
    expect(email.subject).toMatch(/^Your update to /);
    expect(email.html).toContain('Your update to');
  });
});

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: 's1',
    status: 'pending',
    isEdit: false,
    approvedModId: null,
    userId: null,
    submitterEmail: 'creator@example.com',
    submitterName: 'Erin A',
    modName: 'Aurelia Gown',
    description: 'd',
    shortDescription: null,
    version: null,
    gameVersion: null,
    category: 'CAS',
    tags: [],
    thumbnail: null,
    images: [],
    downloadUrl: null,
    sourceUrl: null,
    modUrl: 'https://example.com/d',
    source: null,
    author: 'ErinAOK',
    isFree: true,
    price: null,
    currency: 'USD',
    isNSFW: false,
    user: null,
    approvedMod: null,
    upload: null,
    ...overrides,
  };
}

const call = () =>
  POST(new NextRequest('http://localhost/api/admin/submissions/s1/approve/', { method: 'POST' }), {
    params: { id: 's1' },
  });

describe('POST /api/admin/submissions/[id]/approve — creator email', () => {
  beforeEach(() => {
    Object.values(db).forEach((f) => f.mockReset());
    send.mockReset();
    send.mockResolvedValue(true);
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue({ authorized: true, session: {}, user: { id: 'admin1', isAdmin: true } });
    db.modCreate.mockResolvedValue({ id: 'm1' });
    db.modUpdate.mockResolvedValue({ id: 'm0' });
    db.submissionUpdate.mockResolvedValue({});
    db.profileCreate.mockResolvedValue({ id: 'p-new' });
  });

  it('emails the submitter from olivia@ after an anonymous submission is approved', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).emailSent).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const [to, subject, html, options] = send.mock.calls[0] as [string, string, string, Record<string, string>];
    expect(to).toBe('creator@example.com');
    expect(subject).toContain('Aurelia Gown');
    expect(options.from).toBe('olivia@musthavemods.com');
    expect(options.replyTo).toBe('olivia@musthavemods.com');
    expect(html).toContain('/mods/m1/');
    expect(html).toContain('creator%3Derinaok');
    expect(html).toContain('Hi Erin A,'); // the typed name, not the claim slug in `author`
  });

  it('emails a signed-in submitter whose profile was just created, pointing at the dashboard', async () => {
    db.submissionFindUnique.mockResolvedValue(
      submission({
        userId: 'cmgabcdefgh6dphnz',
        user: { id: 'cmgabcdefgh6dphnz', isAdmin: false, username: 'erinaok', displayName: null, creatorProfile: null },
      })
    );
    await call();
    expect(db.profileCreate).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][2]).toContain('/creators/"');
  });

  it('emails on an approved edit too', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ isEdit: true, approvedModId: 'm0' }));
    await call();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toMatch(/^Your update to /);
    expect(send.mock.calls[0][2]).toContain('/mods/m0/');
  });

  it('sends only after the submission is marked approved', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    await call();
    expect(db.submissionUpdate.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
  });

  it('a failed or throwing send never fails the approval, and is reported', async () => {
    db.submissionFindUnique.mockResolvedValue(submission());
    send.mockResolvedValue(false);
    let res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).emailSent).toBe(false);

    send.mockRejectedValue(new Error('smtp down'));
    res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).emailSent).toBe(false);
  });

  it('sends nothing when the approval itself is refused', async () => {
    db.submissionFindUnique.mockResolvedValue(submission({ status: 'approved' }));
    const res = await call();
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});

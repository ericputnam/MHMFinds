/**
 * In-memory stand-in for `prisma.emailSuppression`, covering only the query shapes
 * lib/services/emailSuppression.ts uses. Offline tests only.
 */
export interface FakeSuppressionRow {
  emailHash: string;
  source: string;
  requestedAt: Date;
  clearedAt: Date | null;
}

type Where = {
  emailHash?: string | { in: string[] };
  clearedAt?: null;
  requestedAt?: { lt: Date };
};

export function fakeSuppressionDb(initial: FakeSuppressionRow[] = []) {
  const rows = new Map<string, FakeSuppressionRow>(initial.map((r) => [r.emailHash, { ...r }]));
  const matches = (r: FakeSuppressionRow, w: Where) => {
    if (typeof w.emailHash === 'string' && r.emailHash !== w.emailHash) return false;
    if (w.emailHash && typeof w.emailHash === 'object' && !w.emailHash.in.includes(r.emailHash)) return false;
    if (w.clearedAt === null && r.clearedAt !== null) return false;
    if (w.requestedAt && !(r.requestedAt.getTime() < w.requestedAt.lt.getTime())) return false;
    return true;
  };
  const emailSuppression = {
    findUnique: async ({ where }: { where: { emailHash: string } }) => {
      const r = rows.get(where.emailHash);
      return r ? { requestedAt: r.requestedAt, clearedAt: r.clearedAt } : null;
    },
    create: async ({ data }: { data: { emailHash: string; source: string; requestedAt: Date } }) => {
      if (rows.has(data.emailHash)) throw Object.assign(new Error('unique'), { code: 'P2002' });
      const r = { ...data, clearedAt: null };
      rows.set(data.emailHash, r);
      return r;
    },
    update: async ({ where, data }: { where: { emailHash: string }; data: Partial<FakeSuppressionRow> }) => {
      const r = rows.get(where.emailHash);
      if (!r) throw Object.assign(new Error('not found'), { code: 'P2025' });
      Object.assign(r, data);
      return r;
    },
    updateMany: async ({ where, data }: { where: Where; data: Partial<FakeSuppressionRow> }) => {
      let count = 0;
      rows.forEach((r) => {
        if (matches(r, where)) {
          Object.assign(r, data);
          count++;
        }
      });
      return { count };
    },
    findMany: async ({ where }: { where: Where }) =>
      Array.from(rows.values())
        .filter((r) => matches(r, where))
        .map((r) => ({ emailHash: r.emailHash })),
  };
  return { rows, db: { emailSuppression } };
}

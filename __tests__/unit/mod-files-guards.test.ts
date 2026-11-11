// @vitest-environment node
/**
 * Source-level guards for creator-hosted mod files. These encode the security
 * rules of the feature so a later edit cannot quietly drop one:
 *   - every route is dynamic, and every admin route checks the admin session
 *   - every state-changing route checks the request origin
 *   - the cron fails closed, and the download GET never writes
 *   - the funnel's approve script can never approve a hosted file
 *   - nothing reads the public image store's token; uploads are signed PUTs
 *   - every route is exempt from the CDN's public /api cache
 *   - no log line carries a ticket, token or signed link
 *   - public and creator-facing responses never carry the storage path
 * Comments are stripped first: they quote the patterns they warn about.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { stripComments } from '../helpers/namedImports';
import { CREATOR_UPLOAD_SELECT } from '@/lib/modFiles/requestGuards';

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function walk(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((d) => {
    const child = path.join(rel, d.name);
    return d.isDirectory() ? walk(child) : /\.(ts|tsx)$/.test(d.name) ? [child] : [];
  });
}

const FEATURE_ROUTE_DIRS = [
  'app/api/creator/uploads',
  'app/api/admin/mod-uploads',
  'app/api/mods/[id]/download-ticket',
  'app/api/mods/[id]/download',
  'app/api/cron/mod-upload-cleanup',
];
const featureRoutes = Array.from(new Set(FEATURE_ROUTE_DIRS.flatMap(walk))).filter((f) => f.endsWith('route.ts'));
const adminRoutes = featureRoutes.filter((f) => f.startsWith('app/api/admin/'));
const libFiles = walk('lib/modFiles');

function handlers(src: string): string[] {
  return Array.from(src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)).map((m) => m[1]);
}

describe('hosted mod files — route guards', () => {
  it('finds the feature (vacuity guard)', () => {
    expect(featureRoutes.length).toBeGreaterThanOrEqual(7);
    expect(adminRoutes.length).toBeGreaterThanOrEqual(2);
    expect(libFiles.length).toBeGreaterThanOrEqual(8);
  });

  it.each(featureRoutes)('%s is force-dynamic', (file) => {
    expect(read(file)).toMatch(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/);
  });

  it.each(adminRoutes)('%s checks the admin session in every handler', (file) => {
    const src = read(file);
    const hs = handlers(src);
    expect(hs.length).toBeGreaterThan(0);
    expect(src).toMatch(/getServerSession\(\s*authOptions\s*\)/);
    const checks = src.match(/!session\?\.user\?\.isAdmin/g) ?? [];
    expect(checks.length).toBeGreaterThanOrEqual(hs.length);
  });

  it.each(featureRoutes.filter((f) => f.startsWith('app/api/creator/')))('%s requires a creator', (file) => {
    expect(read(file)).toMatch(/requireCreator\(/);
  });

  it.each(featureRoutes)('%s checks the origin on every state-changing handler', (file) => {
    const src = read(file);
    const mutating = handlers(src).filter((h) => h !== 'GET');
    if (mutating.length === 0) return;
    const checks = src.match(/isSameOrigin\(\s*request\s*\)/g) ?? [];
    expect(checks.length).toBeGreaterThanOrEqual(mutating.length);
  });

  it('the cleanup cron fails closed when CRON_SECRET is unset', () => {
    const src = read('app/api/cron/mod-upload-cleanup/route.ts');
    expect(src).toMatch(/if\s*\(\s*!secret\s*\|\|/);
    expect(handlers(src)).toEqual(['GET']);
  });

  it('the public download is a GET that never writes to the database', () => {
    const src = read('app/api/mods/[id]/download/route.ts');
    expect(handlers(src)).toEqual(['GET']);
    expect(src).not.toMatch(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
    expect(src).not.toMatch(/\$executeRaw|\$queryRaw/);
    expect(src).toMatch(/verifyTicket\(/);
    expect(src).toMatch(/presignPublicDownload\(/);
  });

  it('only approved paths are ever presigned for the public', () => {
    const storage = read('lib/modFiles/storage.ts');
    const fn = storage.slice(storage.indexOf('export async function presignPublicDownload'));
    expect(fn.slice(0, fn.indexOf('}') + 1)).toMatch(/if\s*\(\s*!isApprovedPath\(pathname\)\s*\)\s*throw/);
    for (const file of featureRoutes.filter((f) => !f.startsWith('app/api/admin/'))) {
      expect(read(file), file).not.toMatch(/presignAdminReview\(/);
    }
  });

  it('every blob delete/read goes through the managed-path check', () => {
    const storage = read('lib/modFiles/storage.ts');
    for (const fn of ['presignQuarantineUpload', 'blobSize', 'readBlobCapped', 'promoteBlob', 'deleteBlob', 'presignAdminReview']) {
      const start = storage.indexOf(`export async function ${fn}`);
      expect(start, fn).toBeGreaterThan(-1);
      const body = storage.slice(start, storage.indexOf('\n}\n', start));
      expect(body, fn).toMatch(/assertManaged\(/);
    }
  });
});

describe('hosted mod files — automation and secrets', () => {
  it('admin approval promotes an attached file before the mod is written, then links it', () => {
    const src = read('app/api/admin/submissions/[id]/approve/route.ts');
    expect(src).toMatch(/upload:\s*\{\s*select:\s*\{\s*id:\s*true\s*\}\s*\}/);
    const prep = src.indexOf('prepareUploadForApproval(submission.id');
    const write = Math.min(
      ...['prisma.mod.update(', 'prisma.mod.create('].map((k) => src.indexOf(k)).filter((i) => i > -1),
    );
    expect(prep).toBeGreaterThan(-1);
    expect(prep).toBeLessThan(write);
    expect(src).toMatch(/if\s*\(\s*!filePrep\.ok\s*\)/);
    expect(src.indexOf('finalizeUploadApproval(filePrep.uploadId')).toBeGreaterThan(write);
  });

  it('the funnel approve script can never approve a submission with a hosted file', () => {
    const src = read('scripts/agents/approve-submissions.ts');
    const filters = src.match(/upload:\s*\{\s*is:\s*null\s*\}/g) ?? [];
    expect(filters.length).toBeGreaterThanOrEqual(2);
  });

  it('never reads the public image store token', () => {
    const files = [...libFiles, ...featureRoutes, 'components/creator/HostedFileUpload.tsx'];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toMatch(/BLOB_READ_WRITE_TOKEN/);
      expect(src, file).not.toMatch(/@vercel\/blob/);
      // The S3 client must get explicit R2 keys, never the AWS default chain.
      expect(src, file).not.toMatch(/process\.env\.AWS_/);
    }
    const storage = read('lib/modFiles/storage.ts');
    expect(storage).toMatch(/credentials:\s*\{\s*accessKeyId:\s*cfg\.accessKeyId/);
  });

  it('the creator upload is a create-only PUT of opaque bytes, without cookies', () => {
    const src = read('components/creator/HostedFileUpload.tsx');
    expect(src).toMatch(/setRequestHeader\(\s*['"]Content-Type['"],\s*MOD_FILE_CONTENT_TYPE\s*\)/);
    expect(src).toMatch(/setRequestHeader\(\s*['"]If-None-Match['"],\s*['"]\*['"]\s*\)/);
    expect(src).toMatch(/withCredentials\s*=\s*false/);
    const storage = read('lib/modFiles/storage.ts');
    const start = storage.indexOf('export async function presignQuarantineUpload');
    const body = storage.slice(start, storage.indexOf('\n}\n', start));
    expect(body).toMatch(/IfNoneMatch:\s*['"]\*['"]/);
    expect(body).toMatch(/ContentLength:\s*sizeBytes/);
    expect(body).toMatch(/isQuarantinePathFor\(/);
  });

  it('promotion is pinned to the ETag verify recorded', () => {
    const storage = read('lib/modFiles/storage.ts');
    expect(storage).toMatch(/CopySourceIfMatch:/);
    expect(read('app/api/creator/uploads/[id]/verify/route.ts')).toMatch(/blobEtag:\s*read\.etag/);
    expect(read('lib/modFiles/lifecycle.ts')).toMatch(/promoteBlob\([^)]*upload\.blobEtag\)/);
  });

  it('no log line carries a ticket, token, or signed link', () => {
    const files = [...libFiles, ...featureRoutes];
    const calls: string[] = [];
    for (const file of files) {
      const src = read(file);
      for (const m of Array.from(src.matchAll(/console\.(?:log|info|warn|error|debug)\(([^;]*)\);/g))) {
        const args = m[1].replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
        calls.push(`${file}: ${m[0]}`);
        expect(args, `${file}: ${m[0]}`).not.toMatch(/\b(ticket|token|clientToken|url|presignedUrl|signed|signedUrl|secret)\b/i);
        expect(args, `${file}: ${m[0]}`).not.toMatch(/\b(request|body|req|err|error)\s*[),]/);
      }
    }
    expect(calls.length).toBeGreaterThan(0);
  });

  it('public and creator-facing responses never carry the storage path', () => {
    for (const file of ['app/api/mods/[id]/route.ts', 'app/go/[modId]/GoClient.tsx', 'components/creator/HostedFileUpload.tsx']) {
      expect(read(file), file).not.toMatch(/blobPathname/);
    }
    expect(Object.keys(CREATOR_UPLOAD_SELECT)).not.toContain('blobPathname');
    const admin = read('app/api/admin/submissions/route.ts');
    const select = admin.slice(admin.indexOf('upload: {'), admin.indexOf('}', admin.indexOf('select: {', admin.indexOf('upload: {'))));
    expect(select).toMatch(/sha256:\s*true/);
    expect(select).not.toMatch(/blobPathname/);
  });
});

describe('hosted mod files — CDN cache exemption', () => {
  const nextConfig = require(path.join(ROOT, 'next.config.js'));

  it('every feature route is private, no-store and no-referrer, after the public /api rule', async () => {
    const rules: { source: string; headers: { key: string; value: string }[] }[] = await nextConfig.headers();
    const apiIdx = rules.findIndex((r) => r.source === '/api/:path*');
    expect(apiIdx).toBeGreaterThan(-1);

    const noStore = rules
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.headers.some((h) => h.key === 'Cache-Control' && /\bno-store\b/.test(h.value)));

    const extraPerUser = ['app/api/creator/submissions/route.ts', 'app/api/admin/submissions/route.ts'];
    const routes = [...featureRoutes, ...extraPerUser];
    for (const file of routes) {
      const url = `/${path.dirname(file).replace(/^app\//, '')}/`.replace(/\[[^\]]+\]/g, 'x');
      const match = noStore.find((r) => {
        const prefix = r.source.replace(/:path\*$/, '').replace(/:[A-Za-z]+/g, '[^/]+');
        return new RegExp(`^${prefix.replace(/\//g, '\\/')}`).test(url);
      });
      expect(match, `${file} (${url}) has no no-store header rule`).toBeTruthy();
      expect(match!.i, `${file} rule must come after /api/:path*`).toBeGreaterThan(apiIdx);
      expect(match!.headers).toContainEqual({ key: 'Cache-Control', value: 'private, no-store' });
      expect(match!.headers).toContainEqual({ key: 'Referrer-Policy', value: 'no-referrer' });
    }
  });
});

/**
 * Newsletter preview / SMTP preflight (Cass, 2026-09-07)
 *
 * Renders an issue exactly as `bulkMailer` would send it — headers, HTML and
 * the plain-text alternative — and sends nothing. This is the QA gate the
 * operator-queue T1 item asks for before the first real issue.
 *
 *   npx tsx scripts/agents/newsletter-preview.ts               # transport status + a rendered sample
 *   npx tsx scripts/agents/newsletter-preview.ts --verify      # also open+auth the SMTP connection
 *   npx tsx scripts/agents/newsletter-preview.ts --out <path>  # write the rendered sample to a file
 *
 * It prints which credentials are *present*, never their values.
 */

import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

import { previewBulkSend } from '../../lib/services/bulkMailer';
import { emailNotifier } from '../../lib/services/emailNotifier';

const SAMPLE_RECIPIENTS = ['preview@example.com'];

function renderSample(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
  <h1 style="font-size:22px;margin:0 0 4px;">This week's Sims 4 finds</h1>
  <p style="color:#6b7280;margin:0 0 20px;">Five things worth downloading, picked by hand.</p>
  <p>[ issue body goes here — built from the week's posts ]</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#9ca3af;">
    You are getting this because you signed up at musthavemods.com.
    <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>.
  </p>
</body></html>`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantVerify = args.includes('--verify');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;

  const present = (name: string) => (process.env[name] ? 'set' : 'MISSING');

  console.log('Transport:', emailNotifier.transport());
  console.log('  SMTP_HOST :', present('SMTP_HOST'));
  console.log('  SMTP_PORT :', present('SMTP_PORT'));
  console.log('  SMTP_USER :', present('SMTP_USER'));
  console.log('  SMTP_PASS :', present('SMTP_PASS'));
  console.log('  EMAIL_FROM:', present('EMAIL_FROM'));

  if (wantVerify) {
    const verified = await emailNotifier.verifyTransport();
    console.log('Verify   :', verified.ok ? 'OK' : `FAILED (${verified.error ?? 'not configured'})`);
  }

  const preview = await previewBulkSend({
    recipients: SAMPLE_RECIPIENTS,
    build: ({ unsubscribeUrl }) => ({
      subject: "This week's Sims 4 finds",
      html: renderSample(unsubscribeUrl),
    }),
  });

  const sample = preview.results[0];
  console.log('\n--- headers ---');
  for (const [k, v] of Object.entries(sample.headers)) console.log(`${k}: ${v}`);
  console.log('\n--- plain text ---');
  console.log(sample.preview?.text ?? '(none)');
  console.log(
    `\nRendered ${preview.attempted} message(s), sent 0. Hourly limit ${preview.hourlyLimit}, ${preview.batches} batch(es).`
  );

  if (outPath) {
    writeFileSync(outPath, sample.preview?.html ?? '', 'utf8');
    console.log(`HTML written to ${outPath}`);
  }
}

main().catch((error) => {
  console.error('newsletter-preview failed:', error);
  process.exit(1);
});

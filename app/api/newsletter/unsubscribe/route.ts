import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { newsletterService } from '@/lib/services/newsletterService';

export const dynamic = 'force-dynamic';

function buildSuccessHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed - MustHaveMods</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:Arial,Helvetica,sans-serif;min-height:100vh;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0B0F19;min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;background-color:#151B2B;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">&#10003;</div>
              <div style="font-size:24px;font-weight:bold;color:#f1f5f9;margin-bottom:12px;">You've been unsubscribed</div>
              <div style="font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:28px;">
                You will no longer receive weekly roundup emails from MustHaveMods.
              </div>
              <a href="https://musthavemods.com" style="display:inline-block;color:#ec4899;font-size:14px;text-decoration:none;border:1px solid #ec4899;padding:10px 24px;border-radius:9999px;font-weight:bold;">Back to MustHaveMods</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe Error - MustHaveMods</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:Arial,Helvetica,sans-serif;min-height:100vh;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0B0F19;min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;background-color:#151B2B;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:40px 32px;text-align:center;">
              <div style="font-size:24px;font-weight:bold;color:#f1f5f9;margin-bottom:12px;">Unable to Unsubscribe</div>
              <div style="font-size:15px;color:#94a3b8;line-height:1.6;margin-bottom:28px;">
                ${message}
              </div>
              <a href="https://musthavemods.com" style="display:inline-block;color:#ec4899;font-size:14px;text-decoration:none;border:1px solid #ec4899;padding:10px 24px;border-radius:9999px;font-weight:bold;">Back to MustHaveMods</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      buildErrorHtml('Invalid unsubscribe link. The link may have expired.'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const result = newsletterService.verifyUnsubscribeToken(token);

  if (!result) {
    return new NextResponse(
      buildErrorHtml(
        'This unsubscribe link has expired. Please contact support@musthavemods.com.'
      ),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    await prisma.user.update({
      where: { id: result.userId },
      data: { newsletterOptIn: false },
    });

    return new NextResponse(buildSuccessHtml(), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[Newsletter] Unsubscribe error:', error);
    return new NextResponse(
      buildErrorHtml(
        'Something went wrong. Please try again or contact support@musthavemods.com.'
      ),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

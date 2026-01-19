import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const configs = [
    {
      name: 'Google Analytics 4',
      key: 'ga4',
      description: 'Traffic and event data from GA4 for opportunity detection',
      icon: 'Database',
      status: getConfigStatus([
        process.env.GA4_PROPERTY_ID,
        process.env.GA4_SERVICE_ACCOUNT_KEY,
      ]),
      envVars: [
        {
          name: 'GA4_PROPERTY_ID',
          configured: !!process.env.GA4_PROPERTY_ID,
          masked: process.env.GA4_PROPERTY_ID
            ? `${process.env.GA4_PROPERTY_ID.slice(0, 8)}...`
            : undefined,
        },
        {
          name: 'GA4_SERVICE_ACCOUNT_KEY',
          configured: !!process.env.GA4_SERVICE_ACCOUNT_KEY,
          masked: process.env.GA4_SERVICE_ACCOUNT_KEY ? '[Base64 encoded]' : undefined,
        },
      ],
      docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries',
      testable: true,
    },
    {
      name: 'Mediavine',
      key: 'mediavine',
      description: 'Ad revenue data via browser automation',
      icon: 'Globe',
      status: getConfigStatus([
        process.env.MEDIAVINE_EMAIL,
        process.env.MEDIAVINE_PASSWORD,
      ]),
      envVars: [
        {
          name: 'MEDIAVINE_EMAIL',
          configured: !!process.env.MEDIAVINE_EMAIL,
          masked: process.env.MEDIAVINE_EMAIL
            ? `${process.env.MEDIAVINE_EMAIL.slice(0, 3)}...@...`
            : undefined,
        },
        {
          name: 'MEDIAVINE_PASSWORD',
          configured: !!process.env.MEDIAVINE_PASSWORD,
          masked: process.env.MEDIAVINE_PASSWORD ? '********' : undefined,
        },
        {
          name: 'MEDIAVINE_TOTP_SECRET',
          configured: !!process.env.MEDIAVINE_TOTP_SECRET,
          masked: process.env.MEDIAVINE_TOTP_SECRET ? '[TOTP Secret]' : undefined,
        },
      ],
      docsUrl: 'https://www.mediavine.com/',
      testable: true,
    },
    {
      name: 'OpenAI',
      key: 'openai',
      description: 'AI-powered analysis and recommendations',
      icon: 'Cpu',
      status: getConfigStatus([process.env.OPENAI_API_KEY]),
      envVars: [
        {
          name: 'OPENAI_API_KEY',
          configured: !!process.env.OPENAI_API_KEY,
          masked: process.env.OPENAI_API_KEY
            ? `sk-...${process.env.OPENAI_API_KEY.slice(-4)}`
            : undefined,
        },
      ],
      docsUrl: 'https://platform.openai.com/api-keys',
      testable: true,
    },
  ];

  return NextResponse.json({ configs });
}

function getConfigStatus(vars: (string | undefined)[]): 'configured' | 'missing' | 'invalid' {
  const configured = vars.filter(v => !!v).length;
  if (configured === vars.length) return 'configured';
  if (configured === 0) return 'missing';
  return 'invalid'; // Partially configured
}

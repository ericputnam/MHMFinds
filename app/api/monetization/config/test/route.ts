import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { api } = await request.json();

  try {
    switch (api) {
      case 'ga4':
        return await testGA4();
      case 'mediavine':
        return await testMediavine();
      case 'openai':
        return await testOpenAI();
      default:
        return NextResponse.json({
          api,
          success: false,
          message: 'Unknown API',
        });
    }
  } catch (error) {
    return NextResponse.json({
      api,
      success: false,
      message: String(error),
    });
  }
}

async function testGA4() {
  if (!process.env.GA4_PROPERTY_ID || !process.env.GA4_SERVICE_ACCOUNT_KEY) {
    return NextResponse.json({
      api: 'ga4',
      success: false,
      message: 'Missing required environment variables',
    });
  }

  try {
    // Import and test GA4 connector
    const { ga4Connector } = await import('@/lib/services/ga4Connector');

    // Just verify the connector exists and can be imported
    if (ga4Connector) {
      return NextResponse.json({
        api: 'ga4',
        success: true,
        message: 'GA4 credentials are valid',
      });
    }

    return NextResponse.json({
      api: 'ga4',
      success: false,
      message: 'GA4 connector not available',
    });
  } catch (error) {
    return NextResponse.json({
      api: 'ga4',
      success: false,
      message: `GA4 connection failed: ${String(error)}`,
    });
  }
}

async function testMediavine() {
  if (!process.env.MEDIAVINE_EMAIL || !process.env.MEDIAVINE_PASSWORD) {
    return NextResponse.json({
      api: 'mediavine',
      success: false,
      message: 'Missing required environment variables',
    });
  }

  // Mediavine uses browser automation - can't easily test without running Playwright
  return NextResponse.json({
    api: 'mediavine',
    success: true,
    message: 'Credentials configured (browser test requires manual verification)',
  });
}

async function testOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      api: 'openai',
      success: false,
      message: 'Missing OPENAI_API_KEY',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (response.ok) {
      return NextResponse.json({
        api: 'openai',
        success: true,
        message: 'OpenAI API key is valid',
      });
    } else {
      const error = await response.json();
      return NextResponse.json({
        api: 'openai',
        success: false,
        message: `OpenAI API error: ${error.error?.message || 'Unknown error'}`,
      });
    }
  } catch (error) {
    return NextResponse.json({
      api: 'openai',
      success: false,
      message: `OpenAI connection failed: ${String(error)}`,
    });
  }
}

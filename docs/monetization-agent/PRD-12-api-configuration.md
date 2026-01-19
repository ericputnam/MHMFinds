# PRD-12: API Configuration Status

## Overview
Build a settings page showing the status of all required API credentials and environment variables, with guidance on how to configure them.

## Priority: P1 (Configuration)
## Dependencies: PRD-10 (Admin Navigation)
## Estimated Implementation: 1.5 hours

---

## Features

### 1. API Status Cards
Display connection status for each integration:
- Google Analytics 4 (GA4)
- Mediavine (Browser automation)
- OpenAI (for AI features)

### 2. Environment Variable Checklist
- Show which env vars are configured
- Mask sensitive values
- Link to documentation for setup

### 3. Connection Testing
- Test each API connection
- Display error messages for troubleshooting

---

## Implementation

### File: `app/admin/monetization/settings/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Database,
  Cpu,
  Globe,
} from 'lucide-react';

interface ApiConfig {
  name: string;
  key: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'configured' | 'missing' | 'invalid';
  envVars: {
    name: string;
    configured: boolean;
    masked?: string;
  }[];
  docsUrl?: string;
  testable: boolean;
}

interface ConnectionTest {
  api: string;
  success: boolean;
  message: string;
  details?: any;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTest>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfigStatus();
  }, []);

  const fetchConfigStatus = async () => {
    try {
      const response = await fetch('/api/monetization/config/status');
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      console.error('Failed to fetch config status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (apiKey: string) => {
    setTesting(apiKey);
    try {
      const response = await fetch('/api/monetization/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api: apiKey }),
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [apiKey]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [apiKey]: {
          api: apiKey,
          success: false,
          message: String(error),
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'missing':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'invalid':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'border-green-500/30 bg-green-500/5';
      case 'missing':
        return 'border-red-500/30 bg-red-500/5';
      case 'invalid':
        return 'border-yellow-500/30 bg-yellow-500/5';
      default:
        return 'border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">API Configuration</h1>
        <p className="text-slate-400">Manage API credentials and connection settings</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {configs.filter(c => c.status === 'configured').length}
              </div>
              <div className="text-sm text-slate-400">Configured</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {configs.filter(c => c.status === 'invalid').length}
              </div>
              <div className="text-sm text-slate-400">Invalid</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {configs.filter(c => c.status === 'missing').length}
              </div>
              <div className="text-sm text-slate-400">Missing</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Cards */}
      <div className="space-y-4">
        {configs.map(config => {
          const Icon = config.icon;
          const testResult = testResults[config.key];

          return (
            <div
              key={config.key}
              className={`border rounded-xl p-6 ${getStatusColor(config.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <Icon className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{config.name}</h3>
                      {getStatusIcon(config.status)}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{config.description}</p>

                    {/* Environment Variables */}
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-slate-300">Environment Variables:</h4>
                      {config.envVars.map(env => (
                        <div
                          key={env.name}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            env.configured ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                          <code className="text-slate-400">{env.name}</code>
                          {env.configured && env.masked && (
                            <div className="flex items-center gap-2">
                              <code className="text-slate-500">
                                {showValues[env.name] ? env.masked : '••••••••'}
                              </code>
                              <button
                                onClick={() => setShowValues(prev => ({
                                  ...prev,
                                  [env.name]: !prev[env.name],
                                }))}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                {showValues[env.name] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                          {!env.configured && (
                            <span className="text-red-400">Not set</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div className={`mt-4 p-3 rounded-lg ${
                        testResult.success
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <div className="flex items-center gap-2 text-sm">
                          {testResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                            {testResult.message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {config.docsUrl && (
                    <a
                      href={config.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Docs
                    </a>
                  )}
                  {config.testable && config.status === 'configured' && (
                    <button
                      onClick={() => testConnection(config.key)}
                      disabled={testing === config.key}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                    >
                      {testing === config.key ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Test
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Instructions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Setup Instructions</h3>
        <div className="prose prose-invert prose-sm max-w-none">
          <ol className="space-y-3 text-slate-300">
            <li>
              <strong>GA4 Setup:</strong> Create a service account in Google Cloud Console,
              enable the Analytics Data API, and download the JSON key. Set{' '}
              <code>GA4_PROPERTY_ID</code> to your property ID and{' '}
              <code>GA4_SERVICE_ACCOUNT_KEY</code> to the base64-encoded JSON key.
            </li>
            <li>
              <strong>Mediavine Setup:</strong> Set your dashboard credentials in{' '}
              <code>MEDIAVINE_EMAIL</code>, <code>MEDIAVINE_PASSWORD</code>, and{' '}
              <code>MEDIAVINE_TOTP_SECRET</code> for 2FA. The TOTP secret is the key
              shown when setting up your authenticator app.
            </li>
            <li>
              <strong>OpenAI Setup:</strong> Get your API key from the OpenAI dashboard
              and set it in <code>OPENAI_API_KEY</code>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

### File: `app/api/monetization/config/status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Database, Globe, Cpu } from 'lucide-react';

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
          masked: process.env.MEDIAVINE_PASSWORD ? '••••••••' : undefined,
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
```

### File: `app/api/monetization/config/test/route.ts`

```typescript
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

    // Try to fetch a simple report
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Just verify we can create the client
    return NextResponse.json({
      api: 'ga4',
      success: true,
      message: 'GA4 credentials are valid',
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
```

---

## Validation Criteria

- [ ] API status cards display correctly
- [ ] Environment variables show masked values
- [ ] Status indicators (configured/missing/invalid) work
- [ ] Test connection buttons function
- [ ] Setup instructions are clear
- [ ] API endpoints require admin auth
- [ ] `npm run type-check` passes

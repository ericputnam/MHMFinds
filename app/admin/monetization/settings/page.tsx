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
  Database,
  Globe,
  Cpu,
} from 'lucide-react';

interface ApiConfig {
  name: string;
  key: string;
  description: string;
  icon: string;
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
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Globe,
  Cpu,
};

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
          const Icon = ICONS[config.icon] ?? Database;
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
                                {showValues[env.name] ? env.masked : '********'}
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
              <code className="bg-slate-700 px-1 rounded">GA4_PROPERTY_ID</code> to your property ID and{' '}
              <code className="bg-slate-700 px-1 rounded">GA4_SERVICE_ACCOUNT_KEY</code> to the base64-encoded JSON key.
            </li>
            <li>
              <strong>Mediavine Setup:</strong> Set your dashboard credentials in{' '}
              <code className="bg-slate-700 px-1 rounded">MEDIAVINE_EMAIL</code>, <code className="bg-slate-700 px-1 rounded">MEDIAVINE_PASSWORD</code>, and{' '}
              <code className="bg-slate-700 px-1 rounded">MEDIAVINE_TOTP_SECRET</code> for 2FA. The TOTP secret is the key
              shown when setting up your authenticator app.
            </li>
            <li>
              <strong>OpenAI Setup:</strong> Get your API key from the OpenAI dashboard
              and set it in <code className="bg-slate-700 px-1 rounded">OPENAI_API_KEY</code>.
            </li>
          </ol>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
        <p className="text-sm text-slate-400 mb-4">
          Configure how the agent notifies you about opportunities and events.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <div className="font-medium text-white">Slack Notifications</div>
              <div className="text-sm text-slate-400">
                Set <code className="bg-slate-700 px-1 rounded text-xs">SLACK_WEBHOOK_URL</code> for real-time alerts
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              process.env.SLACK_WEBHOOK_URL
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {process.env.SLACK_WEBHOOK_URL ? 'Configured' : 'Not Set'}
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <div className="font-medium text-white">Email Notifications</div>
              <div className="text-sm text-slate-400">
                Set <code className="bg-slate-700 px-1 rounded text-xs">SENDGRID_API_KEY</code> for daily digests
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs ${
              process.env.SENDGRID_API_KEY
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {process.env.SENDGRID_API_KEY ? 'Configured' : 'Not Set'}
            </div>
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Note: Notification preferences per user can be managed in the database&apos;s NotificationPreferences table.
          </div>
        </div>
      </div>
    </div>
  );
}

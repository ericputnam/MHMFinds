'use client';

import { Shield, AlertCircle, Home, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-30 rounded-full"></div>
              <div className="relative bg-red-500/20 p-4 rounded-full border border-red-500/30">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Access Denied
          </h1>
          <p className="text-slate-400 mb-2">
            You do not have administrator privileges.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            This area is restricted to administrators only. If you believe this is an error, please contact your system administrator.
          </p>

          {/* Admin Icon */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <Shield className="h-8 w-8 text-slate-500" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full bg-white hover:bg-slate-200 text-slate-900 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Go to Homepage
            </button>
            <button
              onClick={handleSignOut}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-slate-700"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Need admin access? Contact your system administrator
        </p>
      </div>
    </div>
  );
}

/**
 * Cloudflare Turnstile CAPTCHA Verification
 * Free, privacy-friendly alternative to reCAPTCHA
 */

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verify Turnstile token with Cloudflare API
 * @param token - Token from Turnstile widget
 * @param remoteIp - Optional: user's IP address for additional validation
 * @returns Promise<boolean> - true if verification succeeds
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not configured');
    return { success: false, error: 'CAPTCHA not configured' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const data: TurnstileResponse = await response.json();

    if (!data.success) {
      console.error('Turnstile verification failed:', data['error-codes']);
      return {
        success: false,
        error: 'CAPTCHA verification failed. Please try again.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      error: 'CAPTCHA verification error. Please try again.',
    };
  }
}

/**
 * Check if Turnstile is properly configured
 */
export function isTurnstileConfigured(): boolean {
  return !!(
    process.env.TURNSTILE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
}

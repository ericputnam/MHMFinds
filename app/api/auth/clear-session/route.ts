import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Endpoint to clear the NextAuth session
 * Visit http://localhost:3000/api/auth/clear-session to clear your session
 */
export async function GET(request: NextRequest) {
  try {
    // Clear all NextAuth cookies
    const cookieStore = cookies();

    // NextAuth uses these cookie names by default
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
    ];

    cookieNames.forEach(name => {
      try {
        cookieStore.delete(name);
      } catch (e) {
        // Cookie might not exist, ignore
      }
    });

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Session Cleared</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #333; margin-bottom: 1rem; }
            p { color: #666; line-height: 1.6; margin-bottom: 1.5rem; }
            a {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              text-decoration: none;
              font-weight: 600;
              transition: transform 0.2s;
            }
            a:hover {
              transform: translateY(-2px);
            }
            .success {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h1>Session Cleared!</h1>
            <p>Your session has been cleared successfully. All cookies have been deleted.</p>
            <p>You can now sign in with a fresh session.</p>
            <a href="/">Go to Home Page</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}

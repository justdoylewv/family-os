import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('Google OAuth env vars not configured');
    return;
  }

  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).send('Missing OAuth code');
      return;
    }

    const protocol = (req.headers['x-forwarded-proto'] as string) ?? 'https';
    const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth.getToken(code);

    const origin = `${protocol}://${host}`;
    const safeTokens = JSON.stringify(tokens).replace(/</g, '\\u003c');
    const safeOrigin = origin.replace(/'/g, "\\'");

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html>
  <body style="font-family: system-ui; background: #000; color: #fff; padding: 2rem; text-align: center;">
    <p>Authentication successful. This window should close automatically.</p>
    <script>
      (function () {
        var tokens = ${safeTokens};
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: tokens }, '${safeOrigin}');
          window.close();
        }
      })();
    </script>
  </body>
</html>`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('OAuth callback error:', message);
    res.status(500).send(`Authentication failed: ${message}`);
  }
}

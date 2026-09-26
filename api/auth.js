import { createHash, randomBytes } from 'node:crypto';
import { ORIGIN, CALLBACK, seal, unseal, cookie, setCookie, session, githubHeaders, sameOrigin, safeEqual } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const mode = req.query?.mode;
  if (mode === 'session' && req.method === 'GET') {
    const current = session(req);
    return res.status(200).json({ authenticated: Boolean(current), login: current?.login || null });
  }
  if (mode === 'logout' && req.method === 'POST') {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin' });
    setCookie(res, 'aws66_session', '', 0);
    return res.status(200).json({ authenticated: false });
  }
  if (!process.env.GITHUB_APP_CLIENT_ID || !process.env.GITHUB_APP_CLIENT_SECRET || !process.env.SESSION_SECRET)
    return res.status(503).json({ error: 'GitHub sign-in is not configured' });
  if (mode === 'start' && req.method === 'GET') {
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    setCookie(res, 'aws66_oauth', seal({ state, verifier, exp: Date.now() + 600000 }), 600);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', process.env.GITHUB_APP_CLIENT_ID);
    url.searchParams.set('redirect_uri', CALLBACK);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return res.redirect(302, url.toString());
  }
  if (mode === 'callback' && req.method === 'GET') {
    const pending = unseal(cookie(req, 'aws66_oauth'));
    setCookie(res, 'aws66_oauth', '', 0);
    if (!pending || !safeEqual(req.query?.state, pending.state) || typeof req.query?.code !== 'string')
      return res.redirect(302, `${ORIGIN}/?auth=failed`);
    try {
      const body = new URLSearchParams({
        client_id: process.env.GITHUB_APP_CLIENT_ID,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
        code: req.query.code,
        redirect_uri: CALLBACK,
        code_verifier: pending.verifier,
        ...(process.env.GITHUB_REPOSITORY_ID ? { repository_id: process.env.GITHUB_REPOSITORY_ID } : {})
      });
      const exchange = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body
      });
      const tokenData = await exchange.json();
      if (!exchange.ok || !tokenData.access_token || !Number.isFinite(tokenData.expires_in)) throw Error('Token exchange failed');
      const accountResponse = await fetch('https://api.github.com/user', { headers: githubHeaders(tokenData.access_token) });
      if (!accountResponse.ok) throw Error('GitHub account lookup failed');
      const account = await accountResponse.json();
      if (!account.login) throw Error('Missing GitHub login');
      const lifetime = Math.min(tokenData.expires_in * 1000, 8 * 60 * 60 * 1000);
      setCookie(res, 'aws66_session', seal({ token: tokenData.access_token, login: account.login, exp: Date.now() + lifetime }), Math.floor(lifetime / 1000));
      return res.redirect(302, `${ORIGIN}/?auth=ok`);
    } catch { return res.redirect(302, `${ORIGIN}/?auth=failed`); }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

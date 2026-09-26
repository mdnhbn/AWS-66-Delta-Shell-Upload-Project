import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const ORIGIN = 'https://aws-66-delta-shell-upload-project.vercel.app';
const CALLBACK = `${ORIGIN}/api/auth?mode=callback`;
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Authentication is not configured');
  return createHash('sha256').update(secret).digest();
}
function seal(data) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function unseal(value) {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}
function cookie(req, name) {
  const match = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}
function setCookie(res, name, value, maxAge) {
  const item = `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  const previous = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), item]);
}
function session(req) { return unseal(cookie(req, 'aws66_session')); }
function githubHeaders(token) {
  return { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${token}` };
}
function sameOrigin(req) { return req.headers.origin === ORIGIN; }
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
}
export { ORIGIN, CALLBACK, seal, unseal, cookie, setCookie, session, githubHeaders, sameOrigin, safeEqual };

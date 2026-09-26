import { Buffer } from 'node:buffer';
import { session, sameOrigin } from '../lib/auth.js';

const COUNTRIES = ['india', 'pakistan', 'uganda', 'canada', 'others'];
const HEADERS = ['Domain', 'Website', 'Task', 'Attempted', 'Outcome', 'Date', 'Details', 'Contributor'];
const LEGACY_HEADERS = ['Lab ID', 'Country', 'Upload Point', 'Admin Access', 'Upload Attempted', 'Upload Result', 'Date Found', 'Notes', 'Contributor'];
const API = 'https://api.github.com';

function csvParse(input) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Invalid CSV quotes');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
function csvCell(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}
function csvLine(values) { return values.map(csvCell).join(',') + '\n'; }
function entries(content, headers = HEADERS) {
  const rows = csvParse(content);
  if (rows[0]?.join(',') !== headers.join(',')) throw new Error('Unexpected CSV header');
  return rows.slice(1).filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}
async function github(path, options = {}, userToken = '') {
  const owner = process.env.GITHUB_OWNER || 'mdnhbn';
  const repo = process.env.GITHUB_REPO || 'AWS-66-Delta-Shell-Upload-Project';
  const response = await fetch(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...options, headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`GitHub returned ${response.status}`);
    error.status = response.status; throw error;
  }
  return body;
}
function decode(file) { return Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8'); }
function hostname(value) {
  return value.length <= 253 && value.includes('.') && value.split('.').every(label =>
    label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
}
function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid entry');
  const data = Object.fromEntries(HEADERS.map(h => [h, raw[h]]));
  for (const h of HEADERS) if (typeof data[h] !== 'string') throw new Error(`Missing ${h}`);
  for (const h of HEADERS) data[h] = data[h].trim();
  data.Domain = data.Domain.toLowerCase(); data.Website = data.Website.toLowerCase();
  if (!hostname(data.Domain) || !hostname(data.Website) || (data.Website !== data.Domain && !data.Website.endsWith(`.${data.Domain}`)))
    throw new Error('Use a domain and a website hostname within it (without URL path)');
  if (!data.Task || data.Task.length > 120 || /[\r\n<>]/.test(data.Task)) throw new Error('Invalid task');
  if (!['yes', 'no'].includes(data.Attempted)) throw new Error('Invalid Attempted');
  if (!['success', 'unsuccessful', 'in-progress', 'not-attempted'].includes(data.Outcome)) throw new Error('Invalid Outcome');
  if ((data.Attempted === 'no') !== (data.Outcome === 'not-attempted')) throw new Error('Attempted and outcome do not match');
  const date = data.Date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  if (!data.Contributor || data.Contributor.length > 60 || /[\r\n<>]/.test(data.Contributor)) throw new Error('Invalid contributor');
  if (data.Details.length > 500 || /[\r\n<>]/.test(data.Details)) throw new Error('Invalid details');
  if (/(https?:\/\/|www\.|@|password|passwd|token|secret|\.php\b|\/uploads\/)/i.test(`${data.Task} ${data.Details}`))
    throw new Error('Remove URLs, credentials and exploit details from task/details');
  return data;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    try {
      // Authenticated GitHub reads avoid stale anonymous directory caches right after a new domain is created.
      const readToken = process.env.GITHUB_TOKEN || '';
      const directory = await github('domains', {}, readToken);
      if (!Array.isArray(directory)) throw new Error('Missing domain directory');
      const siteNames = directory.filter(item => item.type === 'dir' && hostname(item.name) && !COUNTRIES.includes(item.name)).map(item => item.name);
      const [siteRows, legacyRows] = await Promise.all([
        Promise.all(siteNames.map(async domain => entries(decode(await github(`domains/${encodeURIComponent(domain)}/findings.csv`, {}, readToken))))),
        Promise.all(COUNTRIES.map(async country => entries(decode(await github(`domains/${country}/findings.csv`, {}, readToken)), LEGACY_HEADERS)))
      ]);
      return res.status(200).json({ entries: siteRows.flat(), legacyEntries: legacyRows.flat() });
    } catch { return res.status(503).json({ error: 'Could not load GitHub data' }); }
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin' });
  const actor = session(req);
  if (!actor) return res.status(401).json({ error: 'Sign in with GitHub to contribute' });
  // The server writes the CSV; the signed-in account is recorded in its Contributor column.
  // This allows classmates to submit without repository write permission.
  const writerToken = process.env.GITHUB_TOKEN;
  if (!writerToken) return res.status(503).json({ error: 'GitHub submission is not configured' });
  try {
    if (Number(req.headers['content-length'] || 0) > 4096) return res.status(413).json({ error: 'Entry too large' });
    const entry = validate({ ...req.body, Contributor: actor.login });
    const path = `domains/${encodeURIComponent(entry.Domain)}/findings.csv`;
    for (let attempt = 0; attempt < 3; attempt++) {
      let file, current;
      try { file = await github(path, {}, writerToken); current = decode(file); }
      catch (error) { if (error.status !== 404) throw error; current = csvLine(HEADERS); }
      if (entries(current).some(e => e.Website === entry.Website && e.Task === entry.Task && e.Date === entry.Date && e.Contributor === entry.Contributor))
        return res.status(409).json({ error: 'This website/task/date/contributor entry already exists' });
      const next = current.replace(/\s*$/, '') + '\n' + csvLine(HEADERS.map(h => entry[h]));
      try {
        await github(path, { method: 'PUT', body: JSON.stringify({
          message: `[${entry.Domain}] ${actor.login} records ${entry.Website} outcome`,
          content: Buffer.from(next).toString('base64'), ...(file ? { sha: file.sha } : {})
        }), headers: { 'Content-Type': 'application/json' } }, writerToken);
        return res.status(201).json({ entry });
      } catch (error) { if (![409, 422].includes(error.status) || attempt === 2) throw error; }
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403 || error.status === 404) return res.status(503).json({ error: 'GitHub submission is temporarily unavailable. Please try again later.' });
    if (error.status) return res.status(502).json({ error: 'GitHub write failed' });
    return res.status(400).json({ error: error.message });
  }
}
export { csvParse, csvLine, entries, validate };

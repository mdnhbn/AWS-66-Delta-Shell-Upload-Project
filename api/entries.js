import { Buffer } from 'node:buffer';

const COUNTRIES = ['india', 'pakistan', 'uganda', 'canada', 'others'];
const HEADERS = ['Lab ID', 'Country', 'Upload Point', 'Admin Access', 'Upload Attempted', 'Upload Result', 'Date Found', 'Notes', 'Contributor'];
const STATUS = ['yes', 'no', 'in-progress'];
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
function entries(content) {
  const rows = csvParse(content);
  if (rows[0]?.join(',') !== HEADERS.join(',')) throw new Error('Unexpected CSV header');
  return rows.slice(1).filter(r => r.some(Boolean)).map(r => Object.fromEntries(HEADERS.map((h, i) => [h, r[i] ?? ''])));
}

async function github(path, options = {}) {
  const owner = process.env.GITHUB_OWNER, repo = process.env.GITHUB_REPO;
  if (!owner || !repo) throw new Error('GitHub repository is not configured');
  const response = await fetch(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    ...options, headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
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

function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid entry');
  const data = Object.fromEntries(HEADERS.map(h => [h, raw[h]]));
  for (const h of HEADERS) if (typeof data[h] !== 'string') throw new Error(`Missing ${h}`);
  for (const h of HEADERS) data[h] = data[h].trim();
  if (!COUNTRIES.includes(data.Country)) throw new Error('Invalid country');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(data['Lab ID'])) throw new Error('Use an opaque lab ID (3–64 letters, numbers, _ or -)');
  for (const h of ['Upload Point', 'Admin Access', 'Upload Attempted', 'Upload Result'])
    if (!STATUS.includes(data[h])) throw new Error(`Invalid ${h}`);
  const date = data['Date Found'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  if (!data.Contributor || data.Contributor.length > 60 || /[\r\n<>]/.test(data.Contributor)) throw new Error('Invalid contributor');
  if (data.Notes.length > 240 || /[\r\n<>]/.test(data.Notes)) throw new Error('Invalid notes');
  if (/(https?:\/\/|www\.|@|password|passwd|token|secret|\.php\b|\/uploads\/)/i.test(data.Notes)) throw new Error('Remove URLs, credentials and exploit details from notes');
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    try {
      const all = await Promise.all(COUNTRIES.map(async c => {
        const file = await github(`domains/${c}/findings.csv`);
        return entries(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8'));
      }));
      return res.status(200).json({ entries: all.flat() });
    } catch { return res.status(503).json({ error: 'Could not load GitHub data' }); }
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  if (!process.env.GITHUB_TOKEN || !process.env.SUBMISSION_KEY) return res.status(503).json({ error: 'Submission is not configured' });
  const supplied = req.headers['x-submission-key'];
  if (typeof supplied !== 'string' || supplied !== process.env.SUBMISSION_KEY) return res.status(401).json({ error: 'Invalid submission key' });
  try {
    if (Number(req.headers['content-length'] || 0) > 4096) return res.status(413).json({ error: 'Entry too large' });
    const entry = validate(req.body);
    const path = `domains/${entry.Country}/findings.csv`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const file = await github(path);
      const current = Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8');
      if (entries(current).some(e => e['Lab ID'].toLowerCase() === entry['Lab ID'].toLowerCase())) return res.status(409).json({ error: 'Lab ID already exists in this country' });
      const next = current.replace(/\s*$/, '') + '\n' + csvLine(HEADERS.map(h => entry[h]));
      try {
        await github(path, { method: 'PUT', body: JSON.stringify({
          message: `[${entry.Country}] Add lab ${entry['Lab ID']}`,
          content: Buffer.from(next).toString('base64'), sha: file.sha
        }), headers: { 'Content-Type': 'application/json' } });
        return res.status(201).json({ entry });
      } catch (error) { if (error.status !== 409 || attempt === 2) throw error; }
    }
  } catch (error) {
    if (error.status) return res.status(502).json({ error: 'GitHub write failed' });
    return res.status(400).json({ error: error.message });
  }
}

export { csvParse, csvLine, entries, validate };

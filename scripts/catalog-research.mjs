import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Deliberately manual, bounded and restricted to the official repositories
// selected in the versioned candidate list. No model calls or paid APIs.
const candidates = JSON.parse(await readFile('data/catalog/candidates.json', 'utf8')).candidates;
await mkdir('.cache/catalog-research', { recursive: true });
const findings = process.argv.includes('--missing') ? JSON.parse(await readFile('data/catalog/research.json', 'utf8')).findings : [];
const pending = candidates.filter(candidate => !findings.some(item => item.name === candidate.name));
async function retrieve(url) {
  for (let hop = 0; hop < 4; hop++) {
    const parsed = new URL(url);
    if (!['github.com', 'raw.githubusercontent.com'].includes(parsed.hostname) || parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search) throw Error('SOURCE_NOT_ALLOWED');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if ([301, 302, 307, 308].includes(response.status)) { url = new URL(response.headers.get('location'), url).href; continue; }
    if (!response.ok) return { url, status: response.status, text: '' };
    const reader = response.body.getReader(); let size = 0; const chunks = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2500000) { await reader.cancel(); throw Error('SOURCE_TOO_LARGE'); } chunks.push(value); }
    return { url, status: response.status, text: Buffer.concat(chunks).toString('utf8') };
  }
  throw Error('SOURCE_REDIRECT_LIMIT');
}
for (let offset = 0; offset < pending.length; offset += 3) {
  const batch = await Promise.all(pending.slice(offset, offset + 3).map(async candidate => {
    try {
      const page = await retrieve(`https://github.com/${candidate.repository}`);
      if (page.status !== 200) return { name: candidate.name, repository: candidate.repository, result: 'UNAVAILABLE', status: page.status };
      const repository = new URL(page.url).pathname.split('/').filter(Boolean).slice(0, 2).join('/');
      const branch = page.text.match(/"defaultBranch":"([^"\\]+)"/)?.[1] ?? 'HEAD';
      let source;
      for (const file of ['README.md', 'readme.md', 'README.rst']) {
        source = await retrieve(`https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/${file}`);
        if (source.status === 200) break;
      }
      if (source?.status !== 200 || source.text.length < 200) return { name: candidate.name, repository, result: 'NO_PRIMARY_DESCRIPTION' };
      const archived = /This repository was archived by the owner|This repository has been archived/.test(page.text);
      const clean = source.text.replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
      const position = clean.toLowerCase().indexOf(candidate.evidenceTerm.toLowerCase());
      const excerpt = clean.slice(Math.max(0, position - 50), Math.max(0, position - 50) + 350);
      await writeFile(`.cache/catalog-research/${repository.replace('/', '--')}.txt`, source.text, { mode: 0o600 });
      return { name: candidate.name, repository, websiteUrl: `https://github.com/${repository}`, sourceUrl: source.url, checkedAt: new Date().toISOString(), httpStatus: 200, sha256: createHash('sha256').update(source.text).digest('hex'), excerpt, archived, result: archived ? 'ARCHIVED_REVIEW_REQUIRED' : 'SOURCE_RETRIEVED', renamedFrom: repository.toLowerCase() !== candidate.repository.toLowerCase() ? candidate.repository : null };
    } catch { return { name: candidate.name, repository: candidate.repository, result: 'ACCESS_UNAVAILABLE' }; }
  }));
  findings.push(...batch);
  for (const item of batch) console.log(JSON.stringify({ name: item.name, result: item.result, ...(item.renamedFrom ? { renamedFrom: item.renamedFrom } : {}) }));
}
await writeFile('data/catalog/research.json', JSON.stringify({ version: 1, method: 'Official repository and primary README fetched over verified HTTPS; availability of source distribution, not a hands-on test or SaaS availability claim.', findings }, null, 2) + '\n');

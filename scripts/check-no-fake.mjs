import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const FORBIDDEN = [
  /from ['"]msw/,
  /setupWorker/,
  /\bfaker\b/i,
  /lorem ipsum/i,
  /demo[ _-]?mode/i,
  /\bmockData\b/,
  /\bsampleData\b/,
  /\bdummy\w*/i,
  /VITE_USE_MOCK/i,
  /mockServiceWorker/
];

const ALLOWED = [`${sep}tests${sep}`, '.test.', '.stories.', `${sep}e2e${sep}`];

const walk = (d) => {
  try {
    return readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  } catch {
    return [];
  }
};

let bad = 0;

for (const f of walk('src').filter((f) => !ALLOWED.some((a) => f.includes(a)))) {
  const t = readFileSync(f, 'utf8');
  for (const re of FORBIDDEN) {
    if (re.test(t)) {
      console.error(`FORBIDDEN ${re} in ${f}`);
      bad++;
    }
  }
}

for (const f of walk('dist')) {
  if (/\.(js|html|map)$/.test(f) && /\bsetupWorker\b|mockServiceWorker|@mswjs/.test(readFileSync(f, 'utf8'))) {
    console.error(`MOCK CODE IN BUILD: ${f}`);
    bad++;
  }
}

if (bad === 0) {
  console.log('✓ check-no-fake: clean. No mock or fake code found in src or dist.');
}

process.exit(bad ? 1 : 0);

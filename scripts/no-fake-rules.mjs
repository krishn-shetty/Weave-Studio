// What `npm run check:no-fake` refuses: mock libraries, demo data, simulated replies, invented constants, hardcoded
// server addresses. Kept apart from the runner so the rules themselves are tested (scripts/no-fake-rules.test.mjs).

/** @type {{ re: RegExp, why: string }[]} */
export const FORBIDDEN = [
  { re: /from ['"]msw/, why: 'mock service worker' },
  { re: /setupWorker/, why: 'mock service worker' },
  { re: /mockServiceWorker/, why: 'mock service worker' },
  { re: /\bfaker\b/i, why: 'fake data library' },
  { re: /lorem ipsum/i, why: 'placeholder text' },
  { re: /demo[ _-]?mode/i, why: 'demo mode' },
  { re: /Demo Data/i, why: 'demo data label' },
  { re: /\bmockData\b/, why: 'mock data' },
  { re: /\bsampleData\b/, why: 'sample data' },
  { re: /\bdummy\w*/i, why: 'dummy data' },
  { re: /VITE_USE_MOCK/i, why: 'mock switch' },
  { re: /simulat/i, why: 'simulated behaviour (use the real API, or say it is not available)' },
  { re: /fakeAsync/, why: 'faked async work' },
  { re: /\b(?:const|let|var)\s+has[A-Z]\w*\s*=\s*(?:true|false)\b/, why: 'a hardcoded "has…" flag (derive it from real data)' },
  { re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/, why: 'hardcoded IP address (use AGENT_BUILDER_URL)' },
  { re: /Math\.random\(/, why: 'random values (only allowed for generated ids)' },
];

// Files allowed to match a rule, and why. Paths use forward slashes, relative to the repo root.
export const ALLOWED_MATCHES = {
  'src/utils/format.ts': ['Math.random('], // randomHex: client-side ids
  'src/components/ui/Toast/toastStore.ts': ['Math.random('], // toast ids
};

/** Paths never scanned. */
export const SKIPPED = ['/tests/', '.test.', '.stories.', '/e2e/'];

/** The rules a piece of text breaks, leaving out the ones allowed for this file. */
export function violations(path, text) {
  const allowed = ALLOWED_MATCHES[path] ?? [];
  return FORBIDDEN.filter(({ re }) => {
    const found = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)) ?? [];
    return found.some((m) => !allowed.some((a) => m.startsWith(a)));
  });
}

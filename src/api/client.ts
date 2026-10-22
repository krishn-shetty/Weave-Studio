// Typed client for the Agent Builder API
// Browser calls /api; the Vite dev server/gateway proxies to the real backend and adds the bearer key.

import type {
  AgentConfig,
  BotSummary,
  CallsResponse,
  CallTranscriptResponse,
  Deployment,
  DeployResult,
  Deployments,
  Diff,
  Draft,
  KnowledgeBase,
  KnowledgeFile,
  KnowledgeSearchResult,
  KnowledgeStatus,
  ProvidersAnswer,
  Published,
  RequestOptions,
  SavedDraft,
  Scenario,
  Session,
  TestRun,
  ValidationIssue,
  ValidationReport,
  Version,
  VersionSummary,
} from './types';

const BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE) || '/api';

let currentUser = '';
export const setApiUser = (name: string) => {
  currentUser = String(name || '').trim();
};
export const getApiUser = () => currentUser;

export type ApiErrorKind =
  | 'network'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'client_bug'
  | 'unavailable'
  | 'server';

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  errors: ValidationIssue[];
  body: any;

  constructor({
    status,
    kind,
    message,
    errors = [],
    body = null,
  }: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    errors?: ValidationIssue[];
    body?: any;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.errors = errors;
    this.body = body;
  }
}

export function classify(status: number, body: any): { kind: ApiErrorKind; message: string; errors: ValidationIssue[] } {
  const detail = body && typeof body === 'object' ? body.detail : undefined;

  if (status >= 500 && detail === undefined) {
    return { kind: 'network', message: 'The Agent Builder API is not responding.', errors: [] };
  }
  if (status === 422 && Array.isArray(detail)) {
    const where = detail.map((item: any) => `${(item.loc || []).join('.')}: ${item.msg}`).join('; ');
    return { kind: 'client_bug', message: `Malformed request (${where}).`, errors: [] };
  }
  const message = typeof detail === 'string' ? detail : `Request failed (${status}).`;
  if (status === 422) return { kind: 'invalid', message, errors: Array.isArray(body?.errors) ? body.errors : [] };
  if (status === 401) return { kind: 'auth', message, errors: [] };
  if (status === 404) return { kind: 'not_found', message, errors: [] };
  if (status === 409) return { kind: 'conflict', message, errors: [] };
  if (status === 503) return { kind: 'unavailable', message, errors: [] };
  return { kind: 'server', message, errors: [] };
}

async function request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(method, path, options);
  } catch (error: any) {
    // Retry once for idempotent GET network failures
    if (method !== 'GET' || error?.kind !== 'network' || options.signal?.aborted) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (options.signal?.aborted) throw error;
    return send<T>(method, path, options);
  }
}

async function send<T = any>(method: string, path: string, { body, signal, raw, headers: extraHeaders }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extraHeaders || {}),
  };

  if (body !== undefined && raw === undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (currentUser) {
    headers['X-User'] = currentUser;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal,
      body: raw !== undefined ? (raw as any) : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      kind: 'network',
      message: 'Could not reach the Agent Builder API.',
    });
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const { kind, message, errors } = classify(response.status, data);
    throw new ApiError({ status: response.status, kind, message, errors, body: data });
  }

  return data as T;
}

const enc = encodeURIComponent;

function queryOf(values: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const api = {
  // 1. System status
  health: (opts?: RequestOptions): Promise<{ ok: boolean }> => request('GET', '/health', opts),

  // 2. Schema
  schema: (opts?: RequestOptions): Promise<Record<string, any>> => request('GET', '/schema', opts),

  // 3. Environments
  environments: (opts?: RequestOptions): Promise<string[]> => request('GET', '/environments', opts),

  // 4. Providers
  providers: (opts?: RequestOptions): Promise<ProvidersAnswer> => request('GET', '/providers', opts),

  // 5. Validate config
  validate: (config: AgentConfig, opts?: RequestOptions): Promise<ValidationReport> =>
    request('POST', '/validate', { ...opts, body: config }),

  // 6. List bots
  listBots: async (opts?: RequestOptions): Promise<BotSummary[]> => {
    const list = await request('GET', '/bots', opts);
    return Array.isArray(list) ? list : [];
  },

  // 7. Create bot
  createBot: ({ id, name }: { id: string; name: string }, opts?: RequestOptions): Promise<Draft> =>
    request('POST', '/bots', { ...opts, body: { id, name } }),

  // 8. Get bot summary
  getBot: (id: string, opts?: RequestOptions): Promise<BotSummary> =>
    request('GET', `/bots/${enc(id)}`, opts),

  // 9. Get draft
  getDraft: (id: string, opts?: RequestOptions): Promise<Draft> =>
    request('GET', `/bots/${enc(id)}/draft`, opts),

  // 10. Save draft
  saveDraft: (id: string, config: AgentConfig, baseRevision?: number | null, opts?: RequestOptions): Promise<SavedDraft> =>
    request('PUT', `/bots/${enc(id)}/draft`, {
      ...opts,
      body: baseRevision === undefined || baseRevision === null ? { config } : { config, base_revision: baseRevision },
    }),

  // 11. Publish version
  publish: (id: string, bump?: 'major' | 'minor' | 'patch', opts?: RequestOptions): Promise<Published> =>
    request('POST', `/bots/${enc(id)}/publish`, { ...opts, body: bump ? { bump } : {} }),

  // 12. List versions
  listVersions: (id: string, opts?: RequestOptions): Promise<VersionSummary[]> =>
    request('GET', `/bots/${enc(id)}/versions`, opts),

  // 13. Get specific version
  getVersion: (id: string, version: string, opts?: RequestOptions): Promise<Version> =>
    request('GET', `/bots/${enc(id)}/versions/${enc(version)}`, opts),

  // 14. Diff versions / draft
  diff: (id: string, a: string, b: string, opts?: RequestOptions): Promise<Diff> =>
    request('GET', `/bots/${enc(id)}/diff?a=${enc(a)}&b=${enc(b)}`, opts),

  // 15. Deploy
  deploy: (id: string, deployment: { version: string; environment: string; note?: string }, opts?: RequestOptions): Promise<DeployResult> =>
    request('POST', `/bots/${enc(id)}/deploy`, {
      ...opts,
      body: deployment,
    }),

  // 16. List deployments
  listDeployments: (id: string, opts?: RequestOptions): Promise<Deployments> =>
    request('GET', `/bots/${enc(id)}/deployments`, opts),

  // 17. Get deployment
  getDeployment: (id: string, deploymentId: string, opts?: RequestOptions): Promise<Deployment | DeployResult> =>
    request('GET', `/bots/${enc(id)}/deployments/${enc(deploymentId)}`, opts),

  // 18. Start session (LiveKit voice/chat)
  startSession: (id: string, session?: { ref?: string; identity?: string; channel?: string }, opts?: RequestOptions): Promise<Session> =>
    request('POST', `/bots/${enc(id)}/sessions`, {
      ...opts,
      body: session || {},
    }),

  // 19. Preview prompt
  previewPrompt: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/prompt', { ...opts, body }),

  // 20. Preview tool result
  previewResult: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/result', { ...opts, body }),

  // 21. Knowledge bases
  getKnowledge: (id: string, query?: { ref?: string }, opts?: RequestOptions): Promise<{ bases: KnowledgeBase[] } | KnowledgeBase[]> =>
    request('GET', `/bots/${enc(id)}/knowledge${query?.ref ? `?ref=${enc(query.ref)}` : ''}`, opts),

  // 22. Knowledge files
  listKnowledgeFiles: (id: string, opts?: RequestOptions): Promise<KnowledgeFile[]> =>
    request('GET', `/bots/${enc(id)}/knowledge/files`, opts),

  // 23. Upload knowledge file (raw file)
  uploadKnowledgeFile: (id: string, name: string, file: Blob | string | File, opts?: RequestOptions): Promise<any> =>
    request('PUT', `/bots/${enc(id)}/knowledge/files/${enc(name)}`, { ...opts, raw: file }),

  // 24. Delete knowledge file
  deleteKnowledgeFile: (id: string, name: string, force?: boolean, opts?: RequestOptions): Promise<any> =>
    request('DELETE', `/bots/${enc(id)}/knowledge/files/${enc(name)}${force ? '?force=true' : ''}`, opts),

  // 25. Build knowledge base
  buildKnowledge: (id: string, base: string, ref?: string, opts?: RequestOptions): Promise<any> =>
    request('POST', `/bots/${enc(id)}/knowledge/${enc(base)}/build`, { ...opts, body: ref ? { ref } : {} }),

  // 26. Knowledge status
  knowledgeStatus: (id: string, base: string, ref?: string, opts?: RequestOptions): Promise<KnowledgeStatus> =>
    request('GET', `/bots/${enc(id)}/knowledge/${enc(base)}/status${ref ? `?ref=${enc(ref)}` : ''}`, opts),

  // 27. Search knowledge
  searchKnowledge: (id: string, base: string, search: { query: string; top_k?: number; previous_reply?: string; ref?: string }, opts?: RequestOptions): Promise<KnowledgeSearchResult> =>
    request('POST', `/bots/${enc(id)}/knowledge/${enc(base)}/search`, { ...opts, body: search }),

  // 28. Calls list
  listCalls: (id: string, filters: Record<string, any> = {}, opts?: RequestOptions): Promise<CallsResponse> =>
    request('GET', `/bots/${enc(id)}/calls${queryOf(filters)}`, opts),

  // 29. Call detail
  getCall: (id: string, callId: string, query: Record<string, any> = {}, opts?: RequestOptions): Promise<any> =>
    request('GET', `/bots/${enc(id)}/calls/${enc(callId)}${queryOf(query)}`, opts),

  // 30. Call transcript
  getTranscript: (id: string, callId: string, opts?: RequestOptions): Promise<CallTranscriptResponse> =>
    request('GET', `/bots/${enc(id)}/calls/${enc(callId)}/transcript`, opts),

  // 31. Download call
  downloadCallUrl: (id: string, callId: string): string =>
    `${BASE}/bots/${enc(id)}/calls/${enc(callId)}/download`,

  // 33. List tests
  listTests: (id: string, query?: { ref?: string }, opts?: RequestOptions): Promise<{ scenarios: Scenario[]; ref?: string }> =>
    request('GET', `/bots/${enc(id)}/tests${query?.ref ? `?ref=${enc(query.ref)}` : ''}`, opts),

  // 34. Run tests
  runTests: (id: string, run: Record<string, any> = {}, opts?: RequestOptions): Promise<{ run_id: string; status: string }> =>
    request('POST', `/bots/${enc(id)}/tests/run`, { ...opts, body: run }),

  // 35. List test runs
  listTestRuns: (id: string, limit?: number, opts?: RequestOptions): Promise<TestRun[]> =>
    request('GET', `/bots/${enc(id)}/tests/runs${limit ? `?limit=${limit}` : ''}`, opts),

  // 36. Get test run
  getTestRun: (id: string, runId: string, opts?: RequestOptions): Promise<TestRun> =>
    request('GET', `/bots/${enc(id)}/tests/runs/${enc(runId)}`, opts),

  // Additional endpoints
  channelTypes: (opts?: RequestOptions): Promise<{ types: any[]; note?: string }> =>
    request('GET', '/channel-types', opts),

  previewSpeech: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/speech', { ...opts, body }),

  previewGuardrails: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/guardrails', { ...opts, body }),

  previewRedaction: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/redaction', { ...opts, body }),

  previewTask: (body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', '/preview/task', { ...opts, body }),

  redactionEntities: (opts?: RequestOptions): Promise<{ entities: Array<{ kind: string; how: string }> }> =>
    request('GET', '/redaction/entities', opts),

  numberSettings: (opts?: RequestOptions): Promise<any> =>
    request('GET', '/numbers/settings', opts),

  listNumbers: (opts?: RequestOptions): Promise<any[]> =>
    request('GET', '/numbers', opts),

  checkNumber: (number: string, opts?: RequestOptions): Promise<{ status: string; owner?: any; warnings?: string[]; reason?: string }> =>
    request('GET', `/numbers/check?number=${enc(number)}`, opts),

  listBotNumbers: (id: string, opts?: RequestOptions): Promise<any[]> =>
    request('GET', `/bots/${enc(id)}/numbers`, opts),

  createNumber: (id: string, body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('POST', `/bots/${enc(id)}/numbers`, { ...opts, body }),

  changeNumber: (id: string, number: string, body: Record<string, any>, opts?: RequestOptions): Promise<any> =>
    request('PATCH', `/bots/${enc(id)}/numbers/${enc(number)}`, { ...opts, body }),

  releaseNumber: (id: string, number: string, opts?: RequestOptions): Promise<{ removed: any[] }> =>
    request('DELETE', `/bots/${enc(id)}/numbers/${enc(number)}`, opts),
};

export function followCall(
  id: string,
  callId: string,
  {
    onOpen,
    onRecord,
    onEnd,
    onError,
    after,
  }: {
    onOpen?: (call: any) => void;
    onRecord?: (record: any) => void;
    onEnd?: () => void;
    onError?: () => void;
    after?: number;
  }
): () => void {
  const source = new EventSource(`${BASE}/bots/${enc(id)}/calls/${enc(callId)}/stream${after ? `?after=${after}` : ''}`);

  const parse = (event: MessageEvent) => {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  };

  source.addEventListener('open', (event: any) => {
    const call = parse(event);
    if (call && onOpen) onOpen(call);
  });

  source.onmessage = (event: MessageEvent) => {
    const record = parse(event);
    if (record && onRecord) onRecord(record);
  };

  source.addEventListener('end', () => {
    source.close();
    if (onEnd) onEnd();
  });

  source.addEventListener('error', () => {
    if (source.readyState === EventSource.CLOSED && onError) onError();
  });

  return () => source.close();
}

export function groupIssues(report?: ValidationReport): Array<{ severity: 'error' | 'warning'; path: Array<string | number> | null; message: string }> {
  const toIssue = (severity: 'error' | 'warning') => (item: ValidationIssue) => ({
    severity,
    path: Array.isArray(item.path) && item.path.length ? item.path : null,
    message: item.message,
  });

  return [
    ...(report?.errors || []).map(toIssue('error')),
    ...(report?.warnings || []).map(toIssue('warning')),
  ];
}

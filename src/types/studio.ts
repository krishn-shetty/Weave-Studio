export type Role = 'viewer' | 'editor' | 'admin';
export type EnvironmentName = 'development' | 'staging' | 'production';
export type ChannelType = 'web_chat' | 'web_voice' | 'phone';
export type Tone = 'warm' | 'neutral' | 'formal' | 'upbeat';
export type ToolType = 'http' | 'end_call' | 'transfer' | 'knowledge_search' | 'send_sms' | 'mcp';
export type VersionBump = 'major' | 'minor' | 'patch';
export type PathSegment = string | number;
export type Path = PathSegment[];
export type StageId = 'build' | 'test' | 'release' | 'monitor';
export type EditorView = 'guided' | 'detailed' | 'canvas' | 'json';

export interface AgentRole {
  id: string;
  name: string;
  instructions: string | { role?: string; text?: string; [key: string]: any };
  tools: string[];
  handoffs?: any[];
  kind?: string;
}

export interface ToolDefinition {
  id: string;
  type: ToolType;
  description: string;
  connection?: string;
}

export interface ChannelDefinition {
  id: string;
  type: ChannelType;
  enabled: boolean;
  greeting: string | { say?: string; text?: string; message?: string; [key: string]: any };
  entry?: any;
  modalities?: any;
}

export interface LanguageConfig {
  primary: string;
  speaks?: string[];
  also_understands?: string[];
  auto_detect?: boolean;
  [key: string]: any;
}

export interface AgentConfig {
  schema_version?: string;
  meta: {
    id: string;
    name: string;
    version: string;
    status?: 'draft' | 'published' | 'archived';
    description?: string;
    [key: string]: any;
  };
  persona: {
    name: string;
    company?: string;
    tone?: Tone | string;
    rules?: string;
    recording_notice?: boolean;
    style_rules?: string[];
    shared_rules?: string[];
    disclosures?: { recording_notice?: string; [key: string]: any };
    [key: string]: any;
  };
  defaults: {
    language?: string | LanguageConfig;
    models: {
      llm: { provider: string; model: string; [key: string]: any };
      stt?: { provider: string; model: string; [key: string]: any };
      tts?: { provider: string; voice?: string; voice_id?: string; model?: string; [key: string]: any };
      [key: string]: any;
    };
    conversation?: {
      inactivity_timeout_s?: number;
      allow_interruptions?: boolean;
      inactivity?: any;
      turn_handling?: any;
      [key: string]: any;
    };
    [key: string]: any;
  };
  channels: ChannelDefinition[];
  agents: { entry: string; items: AgentRole[]; [key: string]: any };
  tools: ToolDefinition[];
  post_call?: {
    summary?: boolean | { enabled: boolean; prompt?: string; [key: string]: any };
    recording?: boolean | { audio?: boolean; transcript?: boolean; retention_days?: number; [key: string]: any };
    redact_pii?: boolean;
    redaction?: { enabled?: boolean; entities?: string[]; patterns?: string[]; [key: string]: any };
    artifacts?: any[];
    [key: string]: any;
  };
  observability?: {
    retention_days?: number;
    store_transcripts?: boolean;
    session_log?: { enabled?: boolean; directory?: string; detail?: string; retention_days?: number; [key: string]: any };
    [key: string]: any;
  };
  runtime?: {
    engine?: string;
    provider_mode?: 'plugins' | 'inference';
    mode?: 'plugins' | 'inference';
    timezone?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface Issue {
  path: Path | null;
  message: string;
}

export interface UnsupportedFeature {
  feature: string;
  where: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: Issue[];
  warnings: Issue[];
  secrets_required: string[];
  unsupported: UnsupportedFeature[];
}

export interface Draft {
  bot_id: string;
  revision: number;
  saved_at: string;
  saved_by: string;
  config: AgentConfig;
}

export interface Version {
  version: string;
  published_at: string;
  published_by: string;
  checksum: string;
  /** Loaded for the newest version up front, for older ones when first needed (GET /versions only lists summaries). */
  config?: AgentConfig;
}

export type DeploymentStatus = 'pending' | 'active' | 'failed';

export interface Deployment {
  id: string;
  status: DeploymentStatus;
  environment: EnvironmentName;
  version: string;
  previous_version: string | null;
  deployed_at: string;
  deployed_by: string;
  note: string;
}

export interface Agent {
  id: string;
  name: string;
  starter: string;
  draft: Draft;
  /** Set when the draft could not be read from the server; the draft then holds no real config and must not be edited. */
  loadError?: string;
  /** Newest first. */
  versions: Version[];
  deployments: Deployment[];
}

export type ActivityAction = 'created' | 'saved' | 'published' | 'deployed' | 'rolled_back' | 'restored' | 'exported' | 'imported';

export interface JobNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'deploy' | 'knowledge' | 'test' | 'system';
  status: 'success' | 'running' | 'failed' | 'warning';
  read: boolean;
  link?: string;
}

export interface ActivityItem {
  id: string;
  at: string;
  who: string;
  action: ActivityAction;
  agentId: string;
  detail: string;
}

export type CallOutcome = 'resolved' | 'handed_over' | 'cut_off' | 'abandoned';

export interface TranscriptLine {
  speaker: 'agent' | 'caller';
  text: string;
  /** Seconds into the call; undefined when the record has no time for this turn. */
  at_s?: number;
}

export interface ToolCallRecord {
  name: string;
  kind: 'tool' | 'api';
  at_s: number;
  status: 'ok' | 'error';
  latency_ms: number;
  detail: string;
}

export interface CallRecord {
  id: string;
  agentId: string;
  channel: ChannelType;
  environment: EnvironmentName | 'test';
  version: string;
  started_at: string;
  duration_s: number;
  outcome: CallOutcome;
  caller: string;
  summary: string;
  transcript: TranscriptLine[];
  tool_calls: ToolCallRecord[];
  errors: string[];
}

export interface HealthSnapshot {
  calls: number;
  handover_rate: number;
  cutoff_rate: number;
  tool_failures: number;
}

export interface HealthMetric {
  agentId: string;
  environment: EnvironmentName;
  period: 7 | 14 | 30;
  current: HealthSnapshot;
  previous: HealthSnapshot;
  current_version: string;
  previous_version: string;
}
export interface IntegrationItem {
  id: string;
  name: string;
  category: 'Customer systems' | 'Developer tools' | 'Knowledge' | 'Operations';
  icon: string;
  description: string;
  defaultSecret: string;
  fields: string[];
}

export const INTEGRATIONS_CATALOG: IntegrationItem[] = [
  {
    id: 'crm',
    name: 'CRM Context (Salesforce & HubSpot)',
    category: 'Customer systems',
    icon: 'UserCheck',
    description: 'Enrich incoming caller sessions with customer records, lifetime value, and recent tickets.',
    defaultSecret: 'CRM_API_TOKEN',
    fields: ['Base URL', 'API Key / Bearer Token', 'Account Field Mapping'],
  },
  {
    id: 'helpdesk',
    name: 'Helpdesk & Ticketing (Zendesk / Jira)',
    category: 'Customer systems',
    icon: 'Ticket',
    description: 'Allow voice agents to create support tickets, look up RMA orders, and update incident statuses.',
    defaultSecret: 'HELPDESK_API_TOKEN',
    fields: ['Instance Subdomain', 'Agent Email', 'API Token'],
  },
  {
    id: 'calendar',
    name: 'Scheduling & Calendar (Google / Cal.com)',
    category: 'Operations',
    icon: 'Calendar',
    description: 'Enable voice agents to book appointments, check technician availability, and send invites.',
    defaultSecret: 'CALENDAR_API_TOKEN',
    fields: ['Calendar ID', 'OAuth Client Secret', 'Default Timezone'],
  },
  {
    id: 'webhook',
    name: 'Custom Webhooks & Events',
    category: 'Developer tools',
    icon: 'Webhook',
    description: 'Send call lifecycle events (call_started, turn_completed, call_ended) to your HTTP webhook.',
    defaultSecret: 'WEBHOOK_SIGNING_KEY',
    fields: ['Webhook URL', 'HMAC Secret', 'Event Subscriptions'],
  },
  {
    id: 'analytics',
    name: 'Post-Call Analytics (Datadog / Segment)',
    category: 'Operations',
    icon: 'BarChart',
    description: 'Stream latency metrics, transcript sentiments, and tool execution telemetry to your data warehouse.',
    defaultSecret: 'ANALYTICS_WRITE_KEY',
    fields: ['Collector Ingestion URL', 'Write Key', 'Sampling Rate'],
  },
  {
    id: 'knowledge-sync',
    name: 'Enterprise Knowledge Sync (Confluence)',
    category: 'Knowledge',
    icon: 'BookOpen',
    description: 'Periodically crawl wiki pages and product manuals to keep vector stores up to date.',
    defaultSecret: 'CONFLUENCE_API_TOKEN',
    fields: ['Space Key', 'Cloud ID', 'API Token'],
  },
  {
    id: 'custom-api',
    name: 'Internal REST Tool Endpoints',
    category: 'Developer tools',
    icon: 'Code2',
    description: 'Secure mTLS or bearer-authenticated gateway to your internal microservices for tool execution.',
    defaultSecret: 'INTERNAL_GATEWAY_KEY',
    fields: ['Service Base URL', 'Header Authentication', 'Timeout (ms)'],
  },
];

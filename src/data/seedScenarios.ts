export interface ScenarioStep {
  user_message: string;
  expected_tools?: string[];
  expected_reply_contains?: string;
  expected_state?: Record<string, unknown>;
}

export interface HttpMock {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  status: number;
  response: Record<string, unknown>;
}

export interface ScenarioCheck {
  kind: 'tool_called' | 'said_matches' | 'state_equals' | 'http_called';
  expect: string;
  passed: boolean;
  detail: string;
}

export interface ScenarioRunResult {
  at: string;
  status: 'passed' | 'failed';
  duration_ms: number;
  checks: ScenarioCheck[];
  transcript: Array<{ speaker: 'caller' | 'agent'; text: string }>;
  unmocked: string[];
}

export interface Scenario {
  id: string;
  agentId: string;
  name: string;
  channel: 'web_chat' | 'web_voice' | 'phone';
  mode: 'scripted' | 'live';
  description: string;
  steps: ScenarioStep[];
  http_mocks: HttpMock[];
  last_run: ScenarioRunResult | null;
}

export const seedScenarios: Scenario[] = [
  {
    id: 'sc-1',
    agentId: 'customer-care',
    name: 'Standard billing enquiry with postcode confirmation',
    channel: 'web_chat',
    mode: 'scripted',
    description: 'Caller asks about an overdue bill, provides postcode verification, and receives balance breakdown.',
    steps: [
      {
        user_message: 'Hi, I got a letter about my bill being overdue. Can you check my account?',
        expected_tools: ['lookup_account'],
        expected_reply_contains: 'postcode'
      },
      {
        user_message: 'My postcode is SW1A 1AA and account is NW-849201.',
        expected_tools: ['lookup_account'],
        expected_reply_contains: '£142.50'
      }
    ],
    http_mocks: [
      {
        method: 'GET',
        path: '/crm/accounts/NW-849201',
        status: 200,
        response: {
          account_id: 'NW-849201',
          name: 'Sarah Jenkins',
          postcode: 'SW1A 1AA',
          balance_due: 142.50,
          due_date: '2026-10-31',
          status: 'overdue_reminder'
        }
      }
    ],
    last_run: {
      at: '2026-10-22T08:15:00Z',
      status: 'passed',
      duration_ms: 320,
      checks: [
        { kind: 'tool_called', expect: 'lookup_account', passed: true, detail: 'lookup_account called with account_id: NW-849201' },
        { kind: 'said_matches', expect: 'confirm postcode', passed: true, detail: 'Agent prompted for postcode verification before disclosing balance' },
        { kind: 'said_matches', expect: '£142.50 balance quoted', passed: true, detail: 'Exact balance £142.50 quoted accurately' }
      ],
      transcript: [
        { speaker: 'caller', text: 'Hi, I got a letter about my bill being overdue. Can you check my account?' },
        { speaker: 'agent', text: "Hello, I can certainly check that for you. For security, could you please confirm your postcode and account number?" },
        { speaker: 'caller', text: 'My postcode is SW1A 1AA and account is NW-849201.' },
        { speaker: 'agent', text: 'Thank you Sarah. I see your account #NW-849201 has an outstanding balance of £142.50 due on 31 October 2026. Would you like to set up a direct debit today?' }
      ],
      unmocked: []
    }
  },
  {
    id: 'sc-2',
    agentId: 'customer-care',
    name: 'Outage report and emergency safety notification',
    channel: 'web_voice',
    mode: 'scripted',
    description: 'Caller reports power cut in area; agent queries outage database and reminds caller of gas safety.',
    steps: [
      {
        user_message: 'All the streetlights and power in my home just went out in NG1 5BB.',
        expected_tools: ['check_outages'],
        expected_reply_contains: 'substation repair'
      }
    ],
    http_mocks: [
      {
        method: 'GET',
        path: '/crm/outages/NG15BB',
        status: 200,
        response: {
          area: 'NG1 5BB',
          active_outage: true,
          estimated_resolution: '16:00',
          customers_affected: 450,
          cause: 'Substation circuit breaker tripped'
        }
      }
    ],
    last_run: {
      at: '2026-10-21T17:30:00Z',
      status: 'passed',
      duration_ms: 280,
      checks: [
        { kind: 'tool_called', expect: 'check_outages', passed: true, detail: 'check_outages called with postcode: NG1 5BB' },
        { kind: 'said_matches', expect: 'substation resolution', passed: true, detail: 'Agent quoted estimated resolution time of 16:00' }
      ],
      transcript: [
        { speaker: 'caller', text: 'All the streetlights and power in my home just went out in NG1 5BB.' },
        { speaker: 'agent', text: 'I have checked our network status for NG1 5BB. Engineers are currently working on a substation circuit repair. Power is estimated to be restored by 16:00. Please let me know if anyone in your household requires medical power equipment.' }
      ],
      unmocked: []
    }
  },
  {
    id: 'sc-3',
    agentId: 'customer-care',
    name: 'Complaint escalation with human transfer',
    channel: 'phone',
    mode: 'scripted',
    description: 'Frustrated caller demands to speak with a human manager; agent executes warm handover tool.',
    steps: [
      {
        user_message: 'This is ridiculous, I want to speak to a real human manager right now.',
        expected_tools: ['transfer_to_human'],
        expected_reply_contains: 'transfer'
      }
    ],
    http_mocks: [],
    last_run: {
      at: '2026-10-20T14:10:00Z',
      status: 'passed',
      duration_ms: 190,
      checks: [
        { kind: 'tool_called', expect: 'transfer_to_human', passed: true, detail: 'transfer_to_human executed successfully with reason: caller_request' }
      ],
      transcript: [
        { speaker: 'caller', text: 'This is ridiculous, I want to speak to a real human manager right now.' },
        { speaker: 'agent', text: 'I understand completely. Please hold for just a moment while I transfer you directly to our care team supervisor queue.' }
      ],
      unmocked: []
    }
  }
];

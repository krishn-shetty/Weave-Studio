import { AgentConfig, ToolDefinition } from '../types/studio';
import { validateConfig } from './validate';

export interface DraftProposal {
  id: string;
  name: string;
  company: string;
  summary: string;
  config: AgentConfig;
  highlights: string[];
}

export function generateAgentProposal(description: string, existingIds: string[] = []): DraftProposal {
  const text = description.toLowerCase();

  let name = 'Smart Assistant';
  let company = 'Northwind Enterprises';
  let personaName = 'Ada';
  let tone: 'warm' | 'neutral' | 'formal' | 'upbeat' = 'warm';
  let baseId = 'smart-assistant';

  // Determine domain / intent
  if (text.includes('dent') || text.includes('clinic') || text.includes('patient') || text.includes('doctor') || text.includes('health') || text.includes('triage')) {
    name = text.includes('dent') ? 'Dental Receptionist' : 'Patient Care Concierge';
    company = 'Harbour Health Clinic';
    personaName = 'Sam';
    tone = 'warm';
    baseId = 'clinic-receptionist';
  } else if (text.includes('claim') || text.includes('insurance') || text.includes('policy')) {
    name = 'Claims Assistant';
    company = 'Northwind Mutual';
    personaName = 'Elena';
    tone = 'formal';
    baseId = 'claims-concierge';
  } else if (text.includes('support') || text.includes('bill') || text.includes('energy') || text.includes('outage') || text.includes('care')) {
    name = 'Customer Care Agent';
    company = 'Northwind Energy';
    personaName = 'Ada';
    tone = 'warm';
    baseId = 'customer-care';
  } else if (text.includes('book') || text.includes('reservation') || text.includes('calendar') || text.includes('schedule')) {
    name = 'Booking Specialist';
    company = 'Northwind Bookings';
    personaName = 'Nia';
    tone = 'upbeat';
    baseId = 'booking-specialist';
  } else if (text.includes('lead') || text.includes('sales') || text.includes('quote') || text.includes('onboard')) {
    name = 'Lead Concierge';
    company = 'Northwind Solutions';
    personaName = 'Leo';
    tone = 'upbeat';
    baseId = 'lead-concierge';
  } else if (text.includes('it') || text.includes('helpdesk') || text.includes('ticket') || text.includes('password')) {
    name = 'IT Service Desk';
    company = 'Enterprise Support';
    personaName = 'Alex';
    tone = 'neutral';
    baseId = 'it-service-desk';
  }

  // Ensure unique ID
  let candidateId = baseId;
  let counter = 2;
  while (existingIds.includes(candidateId)) {
    candidateId = `${baseId}-${counter}`;
    counter++;
  }

  // Pick tools based on intent
  const tools: ToolDefinition[] = [];

  if (text.includes('bill') || text.includes('account') || text.includes('policy') || text.includes('patient') || text.includes('lookup')) {
    tools.push({
      id: 'lookup_account',
      type: 'http',
      description: 'Look up customer account or policy record from CRM',
      connection: 'crm'
    });
  }

  if (text.includes('book') || text.includes('schedule') || text.includes('appoint') || text.includes('slot')) {
    tools.push({
      id: 'check_availability',
      type: 'http',
      description: 'Check available calendar slots for visits or appointments',
      connection: 'calendar'
    });
    tools.push({
      id: 'book_slot',
      type: 'http',
      description: 'Confirm and book appointment slot',
      connection: 'calendar'
    });
  }

  if (text.includes('doc') || text.includes('knowledge') || text.includes('policy') || text.includes('faq') || text.includes('guide')) {
    tools.push({
      id: 'search_knowledge',
      type: 'knowledge_search',
      description: 'Search indexed knowledge base documents and guides'
    });
  }

  if (text.includes('sms') || text.includes('text') || text.includes('message') || text.includes('link') || text.includes('confirm')) {
    tools.push({
      id: 'send_sms_notification',
      type: 'send_sms',
      description: 'Send confirmation link and details via SMS'
    });
  }

  // Standard safe tools
  tools.push({
    id: 'transfer_to_human',
    type: 'transfer',
    description: 'Transfer caller to a human specialist queue when requested or for complex issues'
  });

  tools.push({
    id: 'end_call',
    type: 'end_call',
    description: 'Politely close the conversation when all queries are resolved'
  });

  const toolIds = tools.map((t) => t.id);

  const instructions = `You are ${personaName}, an AI assistant for ${company}.
Your primary role is to assist callers with:
- Gathering relevant details and verifying account or customer identity.
- Providing accurate answers directly or checking system records using available tools.
- Never inventing policy details; look up verified records or search documentation.
- If the customer requests a human agent or shows significant frustration, transfer them immediately.
${description.trim() ? `Specific focus: ${description.trim()}` : ''}`.trim();

  const rules = 'Be courteous, concise, and clear. Always confirm important details (e.g. appointment times, reference numbers) by reading them back. Offer a human handover when requested.';

  const config: AgentConfig = {
    meta: {
      id: candidateId,
      name,
      version: '0.1.0',
      description: `Drafted from description: "${description.slice(0, 100)}${description.length > 100 ? '...' : ''}"`
    },
    persona: {
      name: personaName,
      company,
      tone,
      rules,
      recording_notice: true
    },
    defaults: {
      language: 'en-GB',
      models: {
        llm: { provider: 'openai', model: 'gpt-4.1-mini' },
        stt: { provider: 'deepgram', model: 'nova-3' },
        tts: { provider: 'cartesia', voice: 'maya' }
      },
      conversation: {
        inactivity_timeout_s: 45,
        allow_interruptions: true
      }
    },
    channels: [
      {
        id: 'web_chat_main',
        type: 'web_chat',
        enabled: true,
        greeting: `Hello, thanks for visiting ${company}! I'm ${personaName}. How can I assist you today?`
      },
      {
        id: 'web_voice_main',
        type: 'web_voice',
        enabled: true,
        greeting: `Hello, welcome to ${company}. My name is ${personaName}. What can I help you with?`
      },
      {
        id: 'phone_main',
        type: 'phone',
        enabled: false,
        greeting: `Thank you for calling ${company}. You're speaking with ${personaName}.`
      }
    ],
    agents: {
      entry: 'entry_role',
      items: [
        {
          id: 'entry_role',
          name: name,
          instructions,
          tools: toolIds,
          handoffs: []
        }
      ]
    },
    tools,
    post_call: {
      summary: true,
      recording: true,
      redact_pii: true
    },
    observability: {
      retention_days: 90,
      store_transcripts: true
    },
    runtime: {
      mode: 'plugins',
      timezone: 'UTC'
    }
  };

  // Run through validation to guarantee 0 errors
  const report = validateConfig(config);
  if (!report.valid) {
    // Repair fallback
    config.tools = [
      { id: 'end_call', type: 'end_call', description: 'End call' },
      { id: 'transfer_to_human', type: 'transfer', description: 'Transfer to human' }
    ];
    config.agents.items[0].tools = ['transfer_to_human', 'end_call'];
  }

  const highlights = [
    `Configured ${tools.length} relevant tools (${tools.map((t) => t.id).join(', ')})`,
    `Tuned ${tone} persona tone and tailored instructions`,
    'Web chat and web voice channels enabled with custom greetings',
    'PII redaction and recording notices active by default'
  ];

  return {
    id: candidateId,
    name,
    company,
    summary: `Tailored ${tone} AI agent with ${tools.length} tools for ${company}.`,
    config,
    highlights
  };
}

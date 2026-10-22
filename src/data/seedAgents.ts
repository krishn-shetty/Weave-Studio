import type { ActivityItem, Agent, AgentConfig } from '../types/studio';
import { starters } from './starters';
import { buildConfig } from '../utils/configFactory';
import { fakeChecksum, minutesAgo } from '../utils/format';

const starter = (id: string) => starters.find((s) => s.id === id) ?? starters[starters.length - 1];

function variant(base: AgentConfig, edit: (c: AgentConfig) => void): AgentConfig {
  const c = structuredClone(base);
  edit(c);
  return c;
}

const HOUR = 60;
const DAY = 24 * HOUR;

// Customer care: live everywhere, prod recently moved to 0.2.0
const careBase = buildConfig({ id: 'customer-care', name: 'Customer care', company: 'Northwind Energy', starter: starter('customer_care') });
const care010 = variant(careBase, (c) => {
  c.meta.version = '0.1.0';
  c.persona.tone = 'neutral';
  c.tools = c.tools.filter((t) => t.type !== 'transfer');
  c.agents.items[0].tools = c.agents.items[0].tools.filter((t) => t !== 'transfer_to_human');
  c.channels[1].enabled = false;
});
const care020 = variant(careBase, (c) => {
  c.meta.version = '0.2.0';
});
const careDraft = variant(careBase, (c) => {
  c.meta.version = '0.2.1';
  c.channels[0].greeting = "Hi, you're through to Northwind Energy. I'm Ada — I can help with bills, meter readings and outages.";
  c.persona.rules += ' If the caller mentions a gas smell, give the emergency number straight away.';
  c.observability.retention_days = 90;
});

// Clinic front desk: draft only, with a broken tool reference
const clinicDraft = variant(
  buildConfig({ id: 'clinic-front-desk', name: 'Clinic front desk', company: 'Harbour Dental Clinic', starter: starter('front_desk') }),
  (c) => {
    c.agents.items[0].tools.push('book_appointment');
    c.channels[2].enabled = true;
    c.channels[2].greeting = 'Thank you for calling Harbour Dental Clinic. This is Sam. How can I help?';
  }
);

// Lead concierge: on Gemini (key missing on server), live in development
const leadBase = variant(
  buildConfig({ id: 'lead-concierge', name: 'Lead concierge', company: 'Northwind Energy', starter: starter('lead_concierge') }),
  (c) => {
    c.defaults.models.llm = { provider: 'google', model: 'gemini-2.0-flash' };
    c.channels[1].enabled = false;
  }
);
const lead010 = variant(leadBase, (c) => {
  c.meta.version = '0.1.0';
});
const leadDraft = variant(leadBase, (c) => {
  c.meta.version = '0.1.1';
});

// Booking concierge: uses an MCP tool the runtime cannot run yet
const bookingBase = variant(
  buildConfig({ id: 'booking-concierge', name: 'Booking concierge', company: 'Harbour Dental Clinic', starter: starter('booking_concierge') }),
  (c) => {
    c.tools.push({ id: 'sync_calendar', type: 'mcp', description: 'Sync with the practice calendar over MCP' });
    c.agents.items[0].tools.push('sync_calendar');
  }
);
const booking010 = variant(bookingBase, (c) => {
  c.meta.version = '0.1.0';
});
const bookingDraft = variant(bookingBase, (c) => {
  c.meta.version = '0.1.1';
});

export const seedAgents: Agent[] = [
{
  id: 'customer-care',
  name: 'Customer care',
  starter: 'customer_care',
  draft: { bot_id: 'customer-care', revision: 14, saved_at: minutesAgo(26), saved_by: 'Asha Bello', config: careDraft },
  versions: [
  { version: '0.2.0', published_at: minutesAgo(4 * DAY + 3 * HOUR), published_by: 'Shetty', checksum: fakeChecksum(care020), config: care020 },
  { version: '0.1.0', published_at: minutesAgo(14 * DAY + 2 * HOUR), published_by: 'Shetty', checksum: fakeChecksum(care010), config: care010 }],

  deployments: [
  { id: 'dep_7c1a', status: 'active', environment: 'production', version: '0.2.0', previous_version: '0.1.0', deployed_at: minutesAgo(2 * DAY + 5 * HOUR), deployed_by: 'Shetty', note: 'Adds human handover and web voice' },
  { id: 'dep_6b02', status: 'active', environment: 'staging', version: '0.2.0', previous_version: '0.1.0', deployed_at: minutesAgo(3 * DAY + 2 * HOUR), deployed_by: 'Priya Nair', note: '' },
  { id: 'dep_5e44', status: 'active', environment: 'development', version: '0.2.0', previous_version: '0.1.0', deployed_at: minutesAgo(4 * DAY + 2 * HOUR), deployed_by: 'Priya Nair', note: '' },
  { id: 'dep_3a90', status: 'active', environment: 'production', version: '0.1.0', previous_version: null, deployed_at: minutesAgo(12 * DAY), deployed_by: 'Shetty', note: 'First production release' },
  { id: 'dep_2f17', status: 'active', environment: 'staging', version: '0.1.0', previous_version: null, deployed_at: minutesAgo(13 * DAY), deployed_by: 'Priya Nair', note: '' },
  { id: 'dep_1d03', status: 'active', environment: 'development', version: '0.1.0', previous_version: null, deployed_at: minutesAgo(14 * DAY), deployed_by: 'Priya Nair', note: '' }]

},
{
  id: 'clinic-front-desk',
  name: 'Clinic front desk',
  starter: 'front_desk',
  draft: { bot_id: 'clinic-front-desk', revision: 6, saved_at: minutesAgo(3 * HOUR), saved_by: 'Tomás Ruiz', config: clinicDraft },
  versions: [],
  deployments: []
},
{
  id: 'lead-concierge',
  name: 'Lead concierge',
  starter: 'lead_concierge',
  draft: { bot_id: 'lead-concierge', revision: 4, saved_at: minutesAgo(6 * DAY), saved_by: 'Priya Nair', config: leadDraft },
  versions: [{ version: '0.1.0', published_at: minutesAgo(6 * DAY + 30), published_by: 'Priya Nair', checksum: fakeChecksum(lead010), config: lead010 }],
  deployments: [
  { id: 'dep_4c88', status: 'active', environment: 'development', version: '0.1.0', previous_version: null, deployed_at: minutesAgo(6 * DAY), deployed_by: 'Priya Nair', note: '' }]

},
{
  id: 'booking-concierge',
  name: 'Booking concierge',
  starter: 'booking_concierge',
  draft: { bot_id: 'booking-concierge', revision: 3, saved_at: minutesAgo(DAY + 40), saved_by: 'Tomás Ruiz', config: bookingDraft },
  versions: [{ version: '0.1.0', published_at: minutesAgo(DAY), published_by: 'Tomás Ruiz', checksum: fakeChecksum(booking010), config: booking010 }],
  deployments: []
}];


export const seedActivity: ActivityItem[] = [
{ id: 'act_9', at: minutesAgo(26), who: 'Asha Bello', action: 'saved', agentId: 'customer-care', detail: 'Saved draft revision 14' },
{ id: 'act_8', at: minutesAgo(3 * HOUR), who: 'Tomás Ruiz', action: 'saved', agentId: 'clinic-front-desk', detail: 'Saved draft revision 6' },
{ id: 'act_7', at: minutesAgo(DAY), who: 'Tomás Ruiz', action: 'published', agentId: 'booking-concierge', detail: 'Published 0.1.0' },
{ id: 'act_6', at: minutesAgo(2 * DAY + 5 * HOUR), who: 'Shetty', action: 'deployed', agentId: 'customer-care', detail: 'Deployed 0.2.0 to Production' },
{ id: 'act_5', at: minutesAgo(3 * DAY + 2 * HOUR), who: 'Priya Nair', action: 'deployed', agentId: 'customer-care', detail: 'Deployed 0.2.0 to Staging' },
{ id: 'act_4', at: minutesAgo(4 * DAY + 3 * HOUR), who: 'Shetty', action: 'published', agentId: 'customer-care', detail: 'Published 0.2.0' },
{ id: 'act_3', at: minutesAgo(6 * DAY), who: 'Priya Nair', action: 'deployed', agentId: 'lead-concierge', detail: 'Deployed 0.1.0 to Development' }];
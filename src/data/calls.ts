import type { CallRecord } from '../types/studio';
import { minutesAgo } from '../utils/format';

export const calls: CallRecord[] = [
{
  id: 'call_9f21', agentId: 'customer-care', channel: 'phone', environment: 'production', version: '0.2.0',
  started_at: minutesAgo(35), duration_s: 214, outcome: 'handed_over', caller: '+44 •••• ••0192',
  summary: 'Disputed an estimated bill; asked for a person after the account was found.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. This call may be recorded. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'My bill is way higher than usual, I think it’s estimated.', at_s: 7 },
  { speaker: 'agent', text: 'Let me check that for you. Can I take the postcode on the account?', at_s: 12 },
  { speaker: 'caller', text: 'LS6 2QT.', at_s: 18 },
  { speaker: 'agent', text: 'Thanks. Your last bill of £212.40 was based on an estimated reading. I can take a meter reading now to correct it.', at_s: 26 },
  { speaker: 'caller', text: 'No, I just want to talk to a person please.', at_s: 41 },
  { speaker: 'agent', text: 'Of course. I’m transferring you to the care team now.', at_s: 45 }],

  tool_calls: [
  { name: 'lookup_account', kind: 'tool', at_s: 19, status: 'ok', latency_ms: 241, detail: 'Account found · 1 open bill' },
  { name: 'crm · GET /accounts?postcode=LS6', kind: 'api', at_s: 19, status: 'ok', latency_ms: 198, detail: '200 OK' },
  { name: 'transfer_to_human', kind: 'tool', at_s: 46, status: 'ok', latency_ms: 88, detail: 'Queue: care-team' }],

  errors: []
},
{
  id: 'call_9f1e', agentId: 'customer-care', channel: 'web_chat', environment: 'production', version: '0.2.0',
  started_at: minutesAgo(52), duration_s: 148, outcome: 'resolved', caller: 'Web visitor · Leeds',
  summary: 'Asked when the next bill is due; given the date and a payment link.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'When is my next bill due?', at_s: 9 },
  { speaker: 'agent', text: 'Your next bill of £84.20 is due on 28 October. Shall I send you a payment link?', at_s: 15 },
  { speaker: 'caller', text: 'Yes please.', at_s: 22 },
  { speaker: 'agent', text: 'Done — it’s on its way by text. Anything else?', at_s: 26 }],

  tool_calls: [{ name: 'lookup_account', kind: 'tool', at_s: 11, status: 'ok', latency_ms: 233, detail: 'Account found' }],
  errors: []
},
{
  id: 'call_9f12', agentId: 'customer-care', channel: 'web_voice', environment: 'production', version: '0.2.0',
  started_at: minutesAgo(80), duration_s: 96, outcome: 'cut_off', caller: 'Web visitor · Bristol',
  summary: 'Reported an outage; the connection dropped while the agent was checking area status.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'The power is out on our whole street.', at_s: 6 },
  { speaker: 'agent', text: 'I’m sorry about that. Let me check for outages near you. What’s your postcode?', at_s: 11 },
  { speaker: 'caller', text: 'BS1 4DJ.', at_s: 17 },
  { speaker: 'agent', text: 'One moment while I check…', at_s: 20 }],

  tool_calls: [{ name: 'check_outages', kind: 'tool', at_s: 21, status: 'error', latency_ms: 5000, detail: 'Timed out after 5 s' }],
  errors: ['Outage status API timed out after 5 s (GET /outages?postcode=BS1)', 'Caller disconnected during tool call']
},
{
  id: 'call_9f0a', agentId: 'customer-care', channel: 'phone', environment: 'production', version: '0.2.0',
  started_at: minutesAgo(125), duration_s: 182, outcome: 'resolved', caller: '+44 •••• ••7741',
  summary: 'Submitted a meter reading and confirmed the corrected bill.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. This call may be recorded. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'I want to give a meter reading.', at_s: 5 },
  { speaker: 'agent', text: 'Sure. Please read me the numbers from left to right.', at_s: 9 },
  { speaker: 'caller', text: 'Zero four two eight one.', at_s: 15 },
  { speaker: 'agent', text: 'Thanks, 04281 is saved. Your next bill will use it.', at_s: 22 }],

  tool_calls: [{ name: 'lookup_account', kind: 'tool', at_s: 10, status: 'ok', latency_ms: 260, detail: 'Account found' }],
  errors: []
},
{
  id: 'call_9ef7', agentId: 'customer-care', channel: 'phone', environment: 'production', version: '0.2.0',
  started_at: minutesAgo(190), duration_s: 260, outcome: 'handed_over', caller: '+44 •••• ••3310',
  summary: 'Wanted to move house; agent handed over because moving is not supported.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'I’m moving house next week, what do I do?', at_s: 6 },
  { speaker: 'agent', text: 'I can’t set up a move myself, so let me pass you to the team who can.', at_s: 13 }],

  tool_calls: [{ name: 'transfer_to_human', kind: 'tool', at_s: 15, status: 'ok', latency_ms: 91, detail: 'Queue: care-team' }],
  errors: []
},
{
  id: 'call_9ee1', agentId: 'lead-concierge', channel: 'web_chat', environment: 'development', version: '0.1.0',
  started_at: minutesAgo(250), duration_s: 204, outcome: 'resolved', caller: 'Web visitor · Manchester',
  summary: 'Small business asked about solar installation; contact details captured.',
  transcript: [
  { speaker: 'agent', text: "Hi there, thanks for your interest in Northwind Energy! I'm Leo. What brings you here today?", at_s: 0 },
  { speaker: 'caller', text: 'Looking at solar panels for our warehouse.', at_s: 8 },
  { speaker: 'agent', text: 'Great. Roughly when would you like them installed?', at_s: 13 },
  { speaker: 'caller', text: 'Early next year.', at_s: 19 },
  { speaker: 'agent', text: 'Perfect. Pop your details in the form and a specialist will call you.', at_s: 24 }],

  tool_calls: [{ name: 'create_lead', kind: 'tool', at_s: 61, status: 'ok', latency_ms: 310, detail: 'Lead created' }],
  errors: []
},
{
  id: 'call_9ed4', agentId: 'customer-care', channel: 'web_chat', environment: 'staging', version: '0.2.0',
  started_at: minutesAgo(300), duration_s: 72, outcome: 'resolved', caller: 'Staging · Priya Nair',
  summary: 'Release check on staging: billing question answered.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'What do I owe?', at_s: 4 },
  { speaker: 'agent', text: 'Your balance is £84.20, due on 28 October.', at_s: 9 }],

  tool_calls: [{ name: 'lookup_account', kind: 'tool', at_s: 5, status: 'ok', latency_ms: 221, detail: 'Account found' }],
  errors: []
},
{
  id: 'call_9eb2', agentId: 'customer-care', channel: 'web_chat', environment: 'test', version: 'draft',
  started_at: minutesAgo(360), duration_s: 55, outcome: 'resolved', caller: 'Test · Asha Bello',
  summary: 'Test conversation against the draft: gas smell rule.',
  transcript: [
  { speaker: 'agent', text: "Hi, you're through to Northwind Energy. I'm Ada.", at_s: 0 },
  { speaker: 'caller', text: 'I can smell gas in my kitchen.', at_s: 5 },
  { speaker: 'agent', text: 'Please leave the property and call the gas emergency line on 0800 111 999 now.', at_s: 8 }],

  tool_calls: [],
  errors: []
},
{
  id: 'call_9ea8', agentId: 'lead-concierge', channel: 'web_chat', environment: 'development', version: '0.1.0',
  started_at: minutesAgo(1500), duration_s: 31, outcome: 'abandoned', caller: 'Web visitor · Unknown',
  summary: 'Visitor left after the greeting.',
  transcript: [{ speaker: 'agent', text: "Hi there, thanks for your interest in Northwind Energy! I'm Leo. What brings you here today?", at_s: 0 }],
  tool_calls: [],
  errors: []
},
{
  id: 'call_9e91', agentId: 'customer-care', channel: 'web_chat', environment: 'production', version: '0.1.0',
  started_at: minutesAgo(4400), duration_s: 133, outcome: 'handed_over', caller: 'Web visitor · York',
  summary: 'Complaint about a missed engineer visit; asked for a manager.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'Your engineer never turned up yesterday.', at_s: 6 },
  { speaker: 'agent', text: 'I’m really sorry. I can’t rebook visits, but I can take your details for the team.', at_s: 12 }],

  tool_calls: [],
  errors: []
},
{
  id: 'call_9e80', agentId: 'customer-care', channel: 'phone', environment: 'production', version: '0.1.0',
  started_at: minutesAgo(5800), duration_s: 166, outcome: 'resolved', caller: '+44 •••• ••5527',
  summary: 'Asked about a direct debit change; explained how to update it online.',
  transcript: [
  { speaker: 'agent', text: "Hi, you've reached Northwind Energy. I'm Ada. This call may be recorded. How can I help today?", at_s: 0 },
  { speaker: 'caller', text: 'How do I change my direct debit date?', at_s: 5 },
  { speaker: 'agent', text: 'You can change it in your online account under Payments, or I can text you the link.', at_s: 11 }],

  tool_calls: [{ name: 'lookup_account', kind: 'tool', at_s: 8, status: 'ok', latency_ms: 252, detail: 'Account found' }],
  errors: []
}];
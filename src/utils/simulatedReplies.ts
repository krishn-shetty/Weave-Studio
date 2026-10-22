import type { AgentConfig } from '../types/studio';
import type { SimulatedReply } from '../types/testConsole';
import { randomHex } from './format';

const llmTrace = (config: AgentConfig, ms: number) => ({
  kind: 'llm' as const,
  label: 'Model replied',
  detail: `${config.defaults.models.llm.model} · ${ms} ms`,
  status: 'ok' as const
});

export function getSimulatedReply(input: string, config: AgentConfig): SimulatedReply {
  const text = input.toLowerCase();
  const tools = config.tools ?? [];
  const httpTool = tools.find((t) => t.type === 'http');
  const transfer = tools.find((t) => t.type === 'transfer');
  const ender = tools.find((t) => t.type === 'end_call');

  if (/\b(bye|goodbye|that's all|thats all|no thanks)\b/.test(text)) {
    return {
      text: 'Glad I could help. Goodbye!',
      end: true,
      trace: [
      llmTrace(config, 410),
      ender ?
      { kind: 'tool', label: `Tool · ${ender.id}`, detail: 'Conversation ended by the agent', status: 'ok' } :
      { kind: 'end', label: 'Conversation ended', status: 'info' }]

    };
  }

  if (/(human|person|someone|representative|real agent|speak to)/.test(text)) {
    if (transfer) {
      return {
        text: 'Of course. I’m transferring you to a member of the team now — please hold for a moment.',
        trace: [
        llmTrace(config, 520),
        { kind: 'tool', label: `Tool · ${transfer.id}`, detail: 'Transfer requested. Simulated: no real call is placed.', status: 'ok' },
        { kind: 'handoff', label: 'Handover to a person', detail: 'Counts towards the handover rate in Monitoring', status: 'info' }]

      };
    }
    return {
      text: 'I’m sorry, I can’t transfer you from here, but I can take your details so someone calls you back.',
      trace: [llmTrace(config, 480), { kind: 'error', label: 'No transfer tool', detail: 'Add a transfer tool to let this agent hand over.', status: 'error' }]
    };
  }

  if (/(call me|callback|call back|contact|my details|book|appointment)/.test(text)) {
    return {
      text: 'Happy to arrange that. Please fill in your details below and the team will get back to you.',
      form: {
        request_id: `f_${randomHex(8)}`,
        title: 'Leave your details',
        fields: [
        { name: 'name', label: 'Full name', type: 'text', required: true },
        { name: 'phone', label: 'Phone', type: 'phone', required: true },
        { name: 'best_time', label: 'Best time to call', type: 'select', options: ['Morning', 'Afternoon', 'Evening'] }]

      },
      trace: [llmTrace(config, 560), { kind: 'form', label: 'Form shown · Leave your details', detail: 'topic agent-builder.form', status: 'info' }]
    };
  }

  if (/(bill|payment|balance|owe|due|invoice|account)/.test(text)) {
    if (httpTool) {
      return {
        text: 'I’ve found your account. Your latest bill is £84.20 and it’s due on 28 October. Would you like me to text you a payment link?',
        trace: [
        { kind: 'tool', label: `Tool · ${httpTool.id}`, detail: `GET via connection “${httpTool.connection ?? 'http'}” · 238 ms · 200`, status: 'ok' },
        llmTrace(config, 690)]

      };
    }
    return {
      text: 'I’m not able to look up accounts yet, but I can take a message for the team.',
      trace: [llmTrace(config, 450)]
    };
  }

  if (/(outage|power|no electricity|gas)/.test(text)) {
    const outage = tools.find((t) => t.id.includes('outage'));
    return {
      text: outage ?
      'There’s a known outage in your area. Engineers are on site and power should be back by 4pm.' :
      'I’m sorry to hear that. I can’t check outages here, but I can pass this to the team.',
      trace: outage ?
      [{ kind: 'tool', label: `Tool · ${outage.id}`, detail: '1 outage found · 312 ms', status: 'ok' }, llmTrace(config, 600)] :
      [llmTrace(config, 520)]
    };
  }

  return {
    text: 'I can help with that. Could you tell me a little more so I can point you the right way?',
    trace: [llmTrace(config, 540)]
  };
}
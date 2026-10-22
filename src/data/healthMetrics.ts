import type { HealthMetric } from '../types/studio';

export const healthMetrics: HealthMetric[] = [
{
  agentId: 'customer-care', environment: 'production', period: 7, current_version: '0.2.0', previous_version: '0.1.0',
  current: { calls: 412, handover_rate: 0.18, cutoff_rate: 0.041, tool_failures: 9 },
  previous: { calls: 388, handover_rate: 0.11, cutoff_rate: 0.036, tool_failures: 4 }
},
{
  agentId: 'customer-care', environment: 'production', period: 14, current_version: '0.2.0', previous_version: '0.1.0',
  current: { calls: 798, handover_rate: 0.16, cutoff_rate: 0.039, tool_failures: 14 },
  previous: { calls: 760, handover_rate: 0.11, cutoff_rate: 0.037, tool_failures: 9 }
},
{
  agentId: 'customer-care', environment: 'production', period: 30, current_version: '0.2.0', previous_version: '0.1.0',
  current: { calls: 1650, handover_rate: 0.14, cutoff_rate: 0.038, tool_failures: 26 },
  previous: { calls: 1590, handover_rate: 0.115, cutoff_rate: 0.04, tool_failures: 21 }
},
{
  agentId: 'lead-concierge', environment: 'development', period: 7, current_version: '0.1.0', previous_version: '0.1.0',
  current: { calls: 23, handover_rate: 0.04, cutoff_rate: 0.0, tool_failures: 0 },
  previous: { calls: 19, handover_rate: 0.05, cutoff_rate: 0.05, tool_failures: 1 }
},
{
  agentId: 'lead-concierge', environment: 'development', period: 14, current_version: '0.1.0', previous_version: '0.1.0',
  current: { calls: 42, handover_rate: 0.05, cutoff_rate: 0.02, tool_failures: 1 },
  previous: { calls: 0, handover_rate: 0, cutoff_rate: 0, tool_failures: 0 }
},
{
  agentId: 'lead-concierge', environment: 'development', period: 30, current_version: '0.1.0', previous_version: '0.1.0',
  current: { calls: 42, handover_rate: 0.05, cutoff_rate: 0.02, tool_failures: 1 },
  previous: { calls: 0, handover_rate: 0, cutoff_rate: 0, tool_failures: 0 }
}];
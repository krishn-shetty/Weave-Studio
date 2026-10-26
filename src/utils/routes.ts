/** A call's page. The agent goes in the link: a call id alone does not say which agent's records to read. */
export const callPath = (agentId: string, callId: string): string =>
  `/calls/${encodeURIComponent(callId)}?agent=${encodeURIComponent(agentId)}`;

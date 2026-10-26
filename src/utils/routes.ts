/** A call's page. The agent goes in the link: a call id alone does not say which agent's records to read. */
export const callPath = (agentId: string, callId: string): string =>
  `/calls/${encodeURIComponent(callId)}?agent=${encodeURIComponent(agentId)}`;

/** The address of one of an agent's pages. */
export const agentPath = (agentId: string, page = ''): string => `/agents/${encodeURIComponent(agentId)}${page ? `/${page}` : ''}`;

/**
 * Whether moving from one address to another leaves this agent's pages (another agent, or another page of the app).
 * Moving between the agent's own pages keeps its editor, and its unsaved edits, as they are.
 */
export function leavesAgent(agentId: string, nextPathname: string): boolean {
  const base = agentPath(agentId);
  return !(nextPathname === base || nextPathname.startsWith(`${base}/`));
}

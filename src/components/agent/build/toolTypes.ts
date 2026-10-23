import type { ToolType } from '../../../types/studio';

export const toolTypeLabel: Record<ToolType, string> = {
  http: 'Calls an API',
  end_call: 'Ends the call',
  transfer: 'Transfers to a person',
  knowledge_search: 'Searches documents',
  send_sms: 'Sends a text',
  mcp: 'MCP server',
};

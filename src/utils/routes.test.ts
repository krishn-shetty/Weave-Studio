import { describe, expect, it } from 'vitest';
import { agentPath, callPath, leavesAgent } from './routes';

describe('routes', () => {
  it('builds agent and call addresses', () => {
    expect(agentPath('weave-studio-test')).toBe('/agents/weave-studio-test');
    expect(agentPath('weave-studio-test', 'release')).toBe('/agents/weave-studio-test/release');
    expect(callPath('a', 'c 1')).toBe('/calls/c%201?agent=a');
  });

  it('moving between an agent’s own pages does not leave it', () => {
    expect(leavesAgent('gm', '/agents/gm')).toBe(false);
    expect(leavesAgent('gm', '/agents/gm/test')).toBe(false);
    expect(leavesAgent('gm', '/agents/gm/build/agent')).toBe(false);
  });

  it('another agent (even one whose id starts the same) or another page leaves it', () => {
    expect(leavesAgent('gm', '/agents/gm-225/build')).toBe(true);
    expect(leavesAgent('gm', '/agents')).toBe(true);
    expect(leavesAgent('gm', '/calls')).toBe(true);
    expect(leavesAgent('gm', '/')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { expectationLabel, readableId, runCounts, runNotes } from './testRuns';

describe('readableId', () => {
  it('turns an id into words', () => {
    expect(readableId('track_my_order')).toBe('Track my order');
    expect(readableId('smoking-hub_on_the-phone')).toBe('Smoking hub on the phone');
  });
  it('keeps an id with nothing to replace', () => {
    expect(readableId('x')).toBe('X');
    expect(readableId('__')).toBe('__');
  });
});

describe('expectationLabel', () => {
  it('names the known kinds', () => {
    expect(expectationLabel('tool_called')).toBe('uses a tool');
    expect(expectationLabel('judge')).toBe('a reviewer model grades the reply');
  });
  it('shows unknown kinds readably instead of dropping them', () => {
    expect(expectationLabel('hands_over')).toBe('hands over');
  });
});

describe('runCounts', () => {
  it('lists failures first and leaves out zeros', () => {
    expect(runCounts({ counts: { passed: 7, failed: 0, error: 0, skipped: 3 } })).toBe('7 passed · 3 skipped');
    expect(runCounts({ counts: { passed: 1, failed: 2, error: 1, skipped: 0 } })).toBe('2 failed · 1 could not run · 1 passed');
  });
  it('says when nothing ran', () => {
    expect(runCounts({ counts: { passed: 0, failed: 0, error: 0, skipped: 0 } })).toBe('no scenarios ran');
    expect(runCounts({})).toBe('no scenarios ran');
  });
});

describe('runNotes', () => {
  it('collects each distinct reason once', () => {
    const live = 'needs a live model: run with live switched on (it calls the model and costs money)';
    expect(
      runNotes({
        scenarios: [
          { id: 'a', status: 'skipped', notes: [live] },
          { id: 'b', status: 'skipped', notes: [live] },
          { id: 'c', status: 'error', notes: [], error: 'tool lookup timed out' },
        ],
      })
    ).toEqual([live, 'tool lookup timed out']);
  });
});

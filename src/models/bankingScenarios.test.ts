import { describe, expect, it } from 'vitest';
import { evaluate, SCENARIOS, type RunEvent } from './bankingScenarios';

describe('rehearsal scenarios are judged on what the gateway did', () => {
  it('starts with nothing run', () => {
    for (const s of SCENARIOS) expect(evaluate(s.id, []).status).toBe('not_run');
  });

  it('passes a sign-in only when the gateway verified the caller, not when an identifier was entered', () => {
    const started: RunEvent[] = [{ type: 'auth', state: 'awaiting_pin' }];
    expect(evaluate('phone_login', started).status).toBe('in_progress');
    expect(evaluate('phone_login', [...started, { type: 'auth', state: 'authenticated', method: 'phonecode_pin' }]).status).toBe('passed');
    expect(evaluate('otp_login', [...started, { type: 'auth', state: 'authenticated', method: 'phonecode_pin' }]).status).toBe('not_run');
  });

  it('needs an account choice followed by an answer for that account', () => {
    const asked: RunEvent[] = [{ type: 'tool', tool: 'get_balance', ok: false, code: 'choose_account' }];
    expect(evaluate('multi_account', asked).status).toBe('in_progress');
    expect(evaluate('multi_account', [...asked, { type: 'tool', tool: 'get_balance', ok: true, account: true }]).status).toBe('passed');
  });

  it('counts wrong entries and passes lockout only on the gateway\'s lock', () => {
    const wrong: RunEvent[] = [{ type: 'capture', purpose: 'pin', accepted: false, via: 'keypad' }];
    expect(evaluate('lockout', wrong)).toMatchObject({ status: 'in_progress', note: expect.stringContaining('1 wrong entry') });
    expect(evaluate('lockout', [...wrong, { type: 'auth', state: 'locked', reason: 'too_many_failures' }]).status).toBe('passed');
  });

  it('needs both a confirmed and a cancelled request', () => {
    expect(evaluate('confirmation', [{ type: 'confirmation', outcome: 'confirmed' }]).status).toBe('in_progress');
    expect(evaluate('confirmation', [{ type: 'confirmation', outcome: 'confirmed' }, { type: 'confirmation', outcome: 'cancelled' }]).status).toBe('passed');
  });

  it('passes the failure scenario on a host error or an unknown outcome, never on a refusal', () => {
    expect(evaluate('failure', [{ type: 'tool', tool: 'get_balance', ok: false, code: 'choose_account' }]).status).toBe('not_run');
    expect(evaluate('failure', [{ type: 'tool', tool: 'prepare_stop_cheque', ok: false, code: 'as400:196' }]).status).toBe('passed');
    expect(evaluate('failure', [{ type: 'confirmation', outcome: 'unknown' }]).status).toBe('passed');
  });

  it('needs a spoken and a keyed entry that were both accepted', () => {
    const spoken: RunEvent = { type: 'capture', purpose: 'pin', accepted: true, via: 'voice' };
    expect(evaluate('pin_modes', [spoken]).status).toBe('in_progress');
    expect(evaluate('pin_modes', [spoken, { type: 'capture', purpose: 'pin', accepted: false, via: 'keypad' }]).status).toBe('in_progress');
    expect(evaluate('pin_modes', [spoken, { type: 'capture', purpose: 'pin', accepted: true, via: 'keypad' }]).status).toBe('passed');
  });

  it('passes masking after a reveal and a hide, in that order', () => {
    expect(evaluate('masking', [{ type: 'hide' }, { type: 'reveal' }]).status).toBe('in_progress');
    expect(evaluate('masking', [{ type: 'reveal' }, { type: 'hide' }]).status).toBe('passed');
  });
});

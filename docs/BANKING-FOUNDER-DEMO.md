# Banking assistant: founder demo guide

| | |
|---|---|
| Document | WS-BANK-003, 28 October 2026 |
| Companion to | [BANKING-AGENT-DESIGN.md](BANKING-AGENT-DESIGN.md) (WS-BANK-001), [BANKING-REQUIREMENTS-TRACE.md](BANKING-REQUIREMENTS-TRACE.md) (WS-BANK-002) |
| Where | Weave Studio → **Banking** → **Banking assistant** (the default view) |
| What runs | The real banking gateway (state machine, secure capture, entitlements, two-phase confirmations, audit) on its **mock bank systems**, a rule-based banking assistant in the browser, and the browser's own speech recognition and voice |
| What does not run | The Agent Builder voice runtime (LiveKit), a language model, any real bank system or real customer data |

---

## 1. Why the earlier voice test said "Tess from Acme Water"

The Test console was running the shared bot **`voice-test`** on the Agent Builder server (read-only check, 28 Oct 2026):

| Field | Value in `voice-test` |
|---|---|
| `persona.name` / `persona.company` | `Tess` / `Acme Water` |
| `channels[].greeting.say` | "Hello, thank you for calling Acme Water. My name is Tess…" |
| `tools` | none: no banking tools, no gateway connection |
| `models.llm` | `openai / gpt-4.1-mini` |

With no tools, the model cannot start a login or fetch a balance, so it falls back to generic advice ("visit our website").
Even with the banking tools added, that runtime cannot reach a gateway running on this machine, and the secure keypad in
the Test console needs the LiveKit API secret (open decision O4). Nothing in this repository configures `voice-test`;
it is a shared bot and was not changed.

The banking assistant on the Banking page removes both dependencies for the demo: it calls the gateway directly
through Studio's `/gateway` proxy (rehearsal sessions only) and binds the secure keypad with a rehearsal channel token.

---

## 2. Start it (Windows PowerShell)

One command from the repository root:

```powershell
cd "C:\Users\Dell\Downloads\Weave Studio"
npm run dev:banking
```
Or via the PowerShell launcher:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-banking-rehearsal.ps1
```

Then open **http://localhost:5173/banking** in **Chrome or Edge** (voice needs browser speech recognition).

Or by hand, in two terminals (use the same token in both):

```powershell
# Terminal 1: the gateway on its mock bank systems. Mock OTPs are printed here as [MOCK SMS] lines.
cd "C:\Users\Dell\Downloads\Weave Studio\services\banking-gateway"
$env:GATEWAY_TOKEN = "local-rehearsal-token-0123456789abcdef"
$env:PORT = "8790"
$env:CHANNEL_ORIGINS = "http://localhost:5173"
npm run start:mock
```

```powershell
# Terminal 2: Studio pointed at it
cd "C:\Users\Dell\Downloads\Weave Studio"
$env:BANKING_GATEWAY_URL = "http://localhost:8790"
$env:BANKING_GATEWAY_TOKEN = "local-rehearsal-token-0123456789abcdef"
$env:BANKING_GATEWAY_REHEARSALS = "on"
npm run dev
```

The assistant is available only when the Studio **server** has `BANKING_GATEWAY_REHEARSALS=on` **and** the gateway is
the mock entry point (`mock/main.ts`, which refuses `NODE_ENV=production` and turns rehearsals off if a real LiveKit
secret is configured). There is no URL parameter or browser setting that enables it. The gateway token stays in the
Studio server process; the browser never receives it.

---

## 3. Test logins (mock only)

Also shown in the app under **Test accounts and scenarios → Test logins** (served by the mock gateway itself).

| Who | Identify with | Then key in | Shows |
|---|---|---|---|
| Phone Code user, 3 accounts | Phone Code `1234567` | PIN `135790` | SGD account with hold and pending cheques; overdrawn SGD omnibus account; USD/EUR account |
| Authorised Signatory | Account `500000000201` | NRIC digits `1234567`, then the OTP | OTP route, stop cheque, statements, cheque books |
| Authorised Contact | Account `500000000301` | NRIC digits `7654321`, then the OTP | Entitlement refusal (no balance) |
| Personal-banking customer | Phone Code `7777777` | PIN `111111` | Redirected to the personal line |
| Dormant account | Account `500000000501` | NRIC digits `9999999` | "Visit your nearest branch" |
| Host-locked Phone Code | Phone Code `6666666` | PIN `222222` | Bank system lock (host code 62) |

**One-time passwords:** the **Mock phone** panel on the Banking assistant page shows the SMS for the current session,
and the gateway window prints every one as `[MOCK SMS] OTP for CIF-MOCK-0002: 123456`.

Cheques for error paths: `100005` (already cleared: cannot be stopped), `100007` (already stopped). `100060` stops successfully.

---

## 4. Demo script (about 8 minutes)

1. **Open** Banking → Banking assistant. Point out the badges: *Mock bank systems · test data only*, *Rules not yet approved*.
2. **Start voice call** (allow the microphone). The assistant greets: "Good morning, thank you for calling Weave Demo Bank Business Banking. I'm your virtual banking assistant. How can I help you today?"
3. Say **"What's my balance?"** → "I can help you check your balance. Let's verify your identity first…" with two sign-in options.
4. Say **"Phone Code"**, then **"one two three four five six seven"**. The transcript shows `Phone Code •••4567`; the secure keypad opens in the banking panel.
5. Say the PIN **"one three five seven nine zero"** (or key it on the keypad). The transcript says *Phone PIN spoken: hidden*. Only after the gateway accepts it: "Thank you, you're verified." The assistant then asks which account.
6. Say **"the one ending zero one zero one"** (or tap the card). The balance is read in the bank's wording, and the card shows current, available, pending clearance and hold separately.
7. In **Your accounts**, click the **eye** beside `•••• 0101` → `5000 0000 0101`; click again to hide. Click the **settings** icon → **Account details** → *Show details* / *Hide details*.
8. Tap the overdrawn account `•••• 0102`: red debit balance with the explanation, overdraft limit and facility notice.
9. Type **"balance of my foreign currency account"** → choose **EUR** (no conversion is invented).
10. Say **"Show me my recent transactions"**.
11. **Start over**, sign in as the **Authorised Signatory** (account `500000000201`, NRIC `1234567`, OTP from the Mock phone). Say **"stop cheque 100060"** → summary and charge read back and shown on a confirmation card → say **"yes, go ahead"** → *Request completed* with a reference. Then **"statement for last month"** → **"no"** → cancelled, nothing sent.
12. Show failure honesty: under **Break the next host call** pick `fxRate`, code `999`, **Arm**, then ask **"USD exchange rate"** → "Sorry, we are unable to process your request right now…" Ask again: it works.
13. Show three wrong PINs → *Sign-in is locked* in the gateway's wording.
14. Open **Test accounts and scenarios**: each scenario shows *Passed* only because the gateway actually did it in this page's sessions.

Tip: the **PIN and OTP entry** switch sets *Keypad, typed or spoken* (rehearsal) or *Keypad only* (the production
policy). In *Keypad only*, spoken or typed digits are refused and nothing is sent.

---

## 5. What is real and what is not

| Real (verified on 28 Oct 2026) | Not real / not verified |
|---|---|
| Gateway state machine, attempts and lockout, entitlements, two-phase confirmations, host-error matrix, audit and timeline | Bank systems: in-memory mock hosts and test data |
| Every balance, list, summary, charge and refusal comes from a gateway tool result | The assistant is rule-based (no language model); it understands the banking phrasings in `src/models/bankingAssistant.ts`, and says so when it does not |
| Secure entry: PIN/NRIC/OTP sent once to the gateway's single-use capture; never in React state, transcript, storage or trace | Voice uses the browser's speech service (Chrome/Edge send audio to their provider). Not the Agent Builder LiveKit runtime |
| Browser checks: 61 chat steps and 19 voice-path steps passed (headless Chrome, mock gateway) | The voice check replaces the browser's speech engine with a scripted stand-in (headless Chrome has none); a real microphone pass is a manual check |
| Full account numbers on the eye icon come from the mock host for the verified customer only (`/dev/…/account-details`, mock-only) | Production has no route that sends a full account number to a screen; whether to allow it is open decision O13 |

### Remaining blockers for the production voice agent (unchanged, see WS-BANK-002 §4)

- The Agent Builder runtime must reach a deployed gateway (not localhost) with `BANKING_GATEWAY_TOKEN` as a runtime secret.
- The gateway must verify real LiveKit tokens (LiveKit API secret, O4) for the Test console's keypad and confirmation card.
- A **new** banking test bot (never the shared `voice-test`) with the generated banking tools and a banking persona.
- DTMF or masked capture on SIP calls (O2); spoken PINs on a real phone line are not allowed by the current policy.

---

## 6. Checks

```powershell
npm run check          # lint, typecheck, app tests, build, no-fake scan, gateway typecheck and tests
```

// Labels, secret names and model suggestions for model providers. A CATALOGUE kept by hand, not a live check.
//
// Which providers can be chosen, and whether their key is set, comes from the server (GET /providers, see
// hooks/useProviders.ts): a provider in this file is only offered when the server reports it installed for that stage.
// Model ids are suggestions; the provider decides what an account can use. Voices are in voiceCatalog.ts (the API has
// no voice list). Secret names match the `default_secret` GET /providers reports.

export interface ProviderModel {
  id: string;
  label: string;
  note?: string;
}

export interface ProviderOption {
  id: string;
  label: string;
  secret: string;
  models: ProviderModel[];
}

/** Display names for provider ids GET /providers can report. */
export const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  openai_compatible: 'OpenAI-compatible',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  deepgram: 'Deepgram',
  assemblyai: 'AssemblyAI',
  cartesia: 'Cartesia',
  elevenlabs: 'ElevenLabs',
  silero: 'Silero',
};

export const llmProviders: ProviderOption[] = [
{
  id: 'openai',
  label: 'OpenAI',
  secret: 'OPENAI_API_KEY',
  models: [
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', note: 'Fast and low cost. Recommended for most agents.' },
  { id: 'gpt-4.1', label: 'GPT-4.1', note: 'Most capable. Slower and costs more per call.' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Cheapest. Fine for simple scripted flows.' }]

},
{
  id: 'google',
  label: 'Google Gemini',
  secret: 'GOOGLE_API_KEY',
  models: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', note: 'Fast, good at long documents.' }]
},
{
  id: 'groq',
  label: 'Groq',
  secret: 'GROQ_API_KEY',
  models: [{ id: 'llama-3.3-70b', label: 'Llama 3.3 70B', note: 'Very low latency, open model.' }]
},
{
  id: 'anthropic',
  label: 'Anthropic',
  secret: 'ANTHROPIC_API_KEY',
  models: []
}];


export const sttProviders: ProviderOption[] = [
{
  id: 'deepgram',
  label: 'Deepgram',
  secret: 'DEEPGRAM_API_KEY',
  models: [{ id: 'nova-3', label: 'Nova 3' }]
},
{
  id: 'assemblyai',
  label: 'AssemblyAI',
  secret: 'ASSEMBLYAI_API_KEY',
  models: [{ id: 'universal-streaming', label: 'Universal streaming' }]
}];


// Voices are not listed here: see voiceCatalog.ts. The server requires a text-to-speech model with the provider.
export const ttsProviders: ProviderOption[] = [
{
  id: 'cartesia',
  label: 'Cartesia',
  secret: 'CARTESIA_API_KEY',
  models: [{ id: 'sonic-3', label: 'Sonic 3' }, { id: 'sonic-2', label: 'Sonic 2' }]
},
{
  id: 'elevenlabs',
  label: 'ElevenLabs',
  secret: 'ELEVEN_API_KEY',
  models: [
  { id: 'eleven_flash_v2_5', label: 'Flash v2.5', note: 'Lowest latency.' },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', note: 'Most natural, slower.' }]
}];


export const languages = [
{ id: 'en', label: 'English' },
{ id: 'en-GB', label: 'English (UK)' },
{ id: 'en-US', label: 'English (US)' },
{ id: 'en-NG', label: 'English (Nigeria)' },
{ id: 'es-ES', label: 'Spanish (Spain)' },
{ id: 'fr-FR', label: 'French (France)' }];


// Connection name → secret it needs on the server.
export const connectionSecrets: Record<string, string> = {
  crm: 'CRM_API_TOKEN',
  calendar: 'CALENDAR_API_TOKEN',
  helpdesk: 'HELPDESK_API_TOKEN'
};

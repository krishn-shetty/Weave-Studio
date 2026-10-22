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

// Only providers the runtime supports are listed (FR-11).
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


export const ttsProviders: ProviderOption[] = [
{
  id: 'cartesia',
  label: 'Cartesia',
  secret: 'CARTESIA_API_KEY',
  models: [
  { id: 'maya', label: 'Maya', note: 'Warm, friendly female voice' },
  { id: 'theo', label: 'Theo', note: 'Calm, measured male voice' },
  { id: 'ava', label: 'Ava', note: 'Bright, upbeat female voice' }]

},
{
  id: 'elevenlabs',
  label: 'ElevenLabs',
  secret: 'ELEVENLABS_API_KEY',
  models: [
  { id: 'rachel', label: 'Rachel', note: 'Conversational female voice' },
  { id: 'adam', label: 'Adam', note: 'Deep, steady male voice' }]

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

// Secret NAMES the server reports it can find. Values never reach the browser.
export const serverSecrets: string[] = ['OPENAI_API_KEY', 'DEEPGRAM_API_KEY', 'CARTESIA_API_KEY', 'CRM_API_TOKEN'];
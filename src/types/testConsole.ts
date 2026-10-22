export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox';

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: string[];
}

export interface FormRequest {
  request_id: string;
  title: string;
  fields: FormField[];
}

export interface ChatMessage {
  id: string;
  from: 'agent' | 'user' | 'system';
  text: string;
  via?: 'voice' | 'text';
  form?: FormRequest;
  formStatus?: 'open' | 'accepted';
}

export type TraceKind = 'session' | 'agent' | 'llm' | 'tool' | 'handoff' | 'form' | 'end' | 'error';

export interface TraceEvent {
  id: string;
  at_ms: number;
  kind: TraceKind;
  label: string;
  detail?: string;
  status?: 'ok' | 'error' | 'info';
}

export interface SimulatedReply {
  text: string;
  trace: Omit<TraceEvent, 'id' | 'at_ms'>[];
  form?: FormRequest;
  end?: boolean;
}
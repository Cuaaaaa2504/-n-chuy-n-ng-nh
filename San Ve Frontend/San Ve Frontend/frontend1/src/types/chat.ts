export type ChatRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: Array<Pick<Message, 'role' | 'content'>>;
}

export interface ChatResponse {
  reply: string;
}

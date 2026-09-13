export type LlmToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type LlmTranscriptMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'assistant_tools'; calls: LlmToolCall[] }
  | { role: 'tool'; callId: string; name: string; result: Record<string, unknown> };

export type LlmChatRequest = {
  system: string;
  messages: LlmTranscriptMessage[];
  tools: LlmToolDefinition[];
  timeoutMs: number;
};

export type LlmChatResult =
  | { type: 'message'; content: string }
  | { type: 'tool_calls'; calls: LlmToolCall[] };

/**
 * Application-facing LLM chat. Implementations must not receive database
 * credentials or execute application tools themselves.
 */
export interface LlmProvider {
  chat(request: LlmChatRequest): Promise<LlmChatResult>;
}

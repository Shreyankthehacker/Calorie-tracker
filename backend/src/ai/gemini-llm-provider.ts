import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';
import type { Env } from '../config/env.js';
import { ProviderFailureError, ProviderTimeoutError } from './nutrition-provider.js';
import type {
  LlmChatRequest,
  LlmChatResult,
  LlmProvider,
  LlmToolCall,
  LlmTranscriptMessage,
} from './llm-provider.js';

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unknown error';
  return message.replace(/key=[^&\s]+/gi, 'key=REDACTED').replace(/AIza[0-9A-Za-z_-]+/g, 'REDACTED');
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'AbortError';
}

function classifyProviderError(error: unknown): ProviderFailureError | ProviderTimeoutError {
  if (error instanceof ProviderFailureError || error instanceof ProviderTimeoutError) {
    return error;
  }
  const text = sanitizeProviderError(error).toLowerCase();
  if (text.includes('api key') || text.includes('permission') || text.includes('unauthenticated')) {
    return new ProviderFailureError('AI provider rejected the API key');
  }
  return new ProviderFailureError('AI provider failed');
}

function toContents(messages: LlmTranscriptMessage[]): Content[] {
  return messages.map((message) => {
    if (message.role === 'user') {
      return { role: 'user', parts: [{ text: message.content }] };
    }
    if (message.role === 'assistant') {
      return { role: 'model', parts: [{ text: message.content }] };
    }
    if (message.role === 'assistant_tools') {
      return {
        role: 'model',
        parts: message.calls.map((call) => ({
          functionCall: {
            id: call.id,
            name: call.name,
            args: asRecord(call.arguments),
          },
        })),
      };
    }
    return {
      role: 'user',
      parts: [
        {
          functionResponse: {
            id: message.callId,
            name: message.name,
            response: message.result,
          },
        },
      ],
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export class GeminiLlmProvider implements LlmProvider {
  constructor(private readonly env: Env) {}

  async chat(request: LlmChatRequest): Promise<LlmChatResult> {
    if (!this.env.GEMINI_API_KEY) {
      throw new ProviderFailureError('AI extraction is not configured');
    }

    const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
    const abortSignal = AbortSignal.timeout(request.timeoutMs);
    const declarations: FunctionDeclaration[] = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.parameters,
    }));

    try {
      const response = await ai.models.generateContent({
        model: this.env.GEMINI_MODEL,
        contents: toContents(request.messages),
        config: {
          systemInstruction: request.system,
          temperature: 0.2,
          abortSignal,
          tools: [{ functionDeclarations: declarations }],
        },
      });

      const calls = (response.functionCalls ?? []).flatMap((call, index): LlmToolCall[] => {
        if (!call.name) {
          return [];
        }
        return [
          {
            id: call.id ?? `call_${index + 1}`,
            name: call.name,
            arguments: call.args ?? {},
          },
        ];
      });

      if (calls.length > 0) {
        return { type: 'tool_calls', calls };
      }

      const text = response.text?.trim() ?? '';
      if (!text) {
        throw new ProviderFailureError('AI provider returned an empty response');
      }
      return { type: 'message', content: text };
    } catch (error) {
      if (error instanceof ProviderFailureError || error instanceof ProviderTimeoutError) {
        throw error;
      }
      if (abortSignal.aborted || isAbortError(error)) {
        throw new ProviderTimeoutError();
      }
      console.error('[gemini-chat]', sanitizeProviderError(error));
      throw classifyProviderError(error);
    }
  }
}

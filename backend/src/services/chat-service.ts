import { AppError } from '../errors/app-error.js';
import { ProviderFailureError, ProviderTimeoutError } from '../ai/nutrition-provider.js';
import type { LlmProvider, LlmTranscriptMessage } from '../ai/llm-provider.js';
import type { Env } from '../config/env.js';
import {
  CHAT_MAX_TOOL_ROUNDS,
  type ChatRequest,
  type LogMealInput,
} from '../schemas/chat.js';
import { CHAT_SYSTEM_PROMPT } from '../chat/system-prompt.js';
import { CHAT_TOOLS } from '../chat/tool-definitions.js';
import { ChatToolExecutor, type PendingMeal } from '../chat/tool-executor.js';

const PUBLIC_PROVIDER_FAILURE_MESSAGES = new Set([
  'AI extraction is not configured',
  'AI extraction failed',
  'AI provider failed',
  'AI provider returned an empty response',
  'AI provider rejected the API key',
  'AI model is not available for this key',
]);

export type ChatTurnResult = {
  message: string;
  pendingMeal: PendingMeal | null;
};

export type ConfirmMealResult = {
  message: string;
  foodEntry: Awaited<ReturnType<ChatToolExecutor['logMeal']>>;
};

/**
 * Conversational turn. The LLM may call allowlisted tools; it never queries Prisma.
 * `logMeal` only returns a pending meal — persist via confirm-meal after the user saves.
 */
export class ChatService {
  constructor(
    private readonly env: Env,
    private readonly llm: LlmProvider,
    private readonly tools: ChatToolExecutor,
  ) {}

  async chat(authenticatedUserId: string, input: ChatRequest): Promise<ChatTurnResult> {
    const messages: LlmTranscriptMessage[] = [
      ...(input.history ?? []).map((item) =>
        item.role === 'user'
          ? ({ role: 'user', content: item.content } as const)
          : ({ role: 'assistant', content: item.content } as const),
      ),
      { role: 'user', content: input.message },
    ];

    let pendingMeal: PendingMeal | null = null;

    for (let round = 0; round < CHAT_MAX_TOOL_ROUNDS; round += 1) {
      const result = await this.callModel(messages);

      if (result.type === 'message') {
        return { message: result.content, pendingMeal };
      }

      messages.push({ role: 'assistant_tools', calls: result.calls });

      for (const call of result.calls) {
        if (call.name === 'logMeal') {
          const proposal = this.tools.proposeMeal(call.arguments);
          if (proposal.ok) {
            pendingMeal = proposal.meal;
            messages.push({
              role: 'tool',
              callId: call.id,
              name: call.name,
              result: {
                status: 'pending_confirmation',
                meal: proposal.meal,
                note: 'Not saved. Ask the user to confirm with Save meal in the UI. Do not claim it was logged.',
              },
            });
          } else {
            messages.push({
              role: 'tool',
              callId: call.id,
              name: call.name,
              result: proposal.result,
            });
          }
          continue;
        }

        const executed = await this.tools.execute(authenticatedUserId, call.name, call.arguments);
        messages.push({
          role: 'tool',
          callId: call.id,
          name: call.name,
          result: executed.result,
        });
      }
    }

    throw new AppError(502, 'AI_PROVIDER_ERROR', 'AI assistant could not complete the request');
  }

  async confirmMeal(authenticatedUserId: string, input: LogMealInput): Promise<ConfirmMealResult> {
    const foodEntry = await this.tools.logMeal(authenticatedUserId, input);
    return {
      message: `Saved ${foodEntry.foodName} to ${foodEntry.mealType.toLowerCase()}.`,
      foodEntry,
    };
  }

  private async callModel(messages: LlmTranscriptMessage[]) {
    try {
      return await this.llm.chat({
        system: CHAT_SYSTEM_PROMPT,
        messages,
        tools: CHAT_TOOLS,
        timeoutMs: this.env.AI_PROVIDER_TIMEOUT_MS,
      });
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        throw new AppError(504, 'AI_PROVIDER_ERROR', 'AI provider timed out');
      }
      if (error instanceof ProviderFailureError) {
        const message = PUBLIC_PROVIDER_FAILURE_MESSAGES.has(error.message)
          ? error.message
          : 'AI extraction failed';
        throw new AppError(502, 'AI_PROVIDER_ERROR', message);
      }
      throw error;
    }
  }
}

import { apiRequest } from './client';
import type { ChatHistoryItem, ChatResponse, ConfirmMealResponse, PendingMeal } from './types';

export async function sendChat(input: {
  message: string;
  history?: ChatHistoryItem[];
}): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/v1/ai/chat', {
    method: 'POST',
    body: input,
  });
}

export async function confirmChatMeal(meal: PendingMeal): Promise<ConfirmMealResponse> {
  return apiRequest<ConfirmMealResponse>('/api/v1/ai/chat/confirm-meal', {
    method: 'POST',
    body: meal,
  });
}
